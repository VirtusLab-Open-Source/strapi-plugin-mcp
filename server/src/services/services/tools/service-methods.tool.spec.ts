import { faker } from '@faker-js/faker';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getServiceMethodsTool } from './service-methods.tool';

describe('getServiceMethodsTool', () => {
  it('builds a tool with expected metadata and args schema', () => {
    // Given
    const strapi = createStrapiServiceMock({ services: {} });

    // When
    const tool = getServiceMethodsTool(strapi as any);

    // Then
    expect(tool.name).toBe('get-service-methods');
    expect(tool.description).toBe('Get all methods of a service');

    const shape = z.object(tool.argsSchema!);
    expect(() => shape.parse({ name: faker.word.noun() })).not.toThrow();
    expect(() => shape.parse({ name: faker.word.noun(), plugin: faker.word.noun() })).not.toThrow();
    expect(() => shape.parse({})).toThrow();
  });

  it('returns only function keys for an exact fully qualified UID', async () => {
    // Given
    const apiNs = faker.word.noun();
    const serviceName = faker.word.noun();
    const uid = `api::${apiNs}.${serviceName}`;
    const svc = {
      find: () => ({}),
      create: function () {
        return {};
      },
      version: '1.0.0',
      count: 3,
    } as const;
    const strapi = createStrapiServiceMock({
      services: { [uid]: { ...svc } },
    });
    const tool = getServiceMethodsTool(strapi as any);

    // When
    const result = await tool.callback({ name: uid } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(true);
    expect(payload.fullyQualifiedServiceName).toBe(uid);
    expect(payload.methods).toEqual(expect.arrayContaining(['find', 'create']));
    expect(payload.methods.length).toBe(2);
  });

  it('resolves internal api service when only name is provided', async () => {
    // Given
    const entity = faker.word.noun();
    const uid = `api::${entity}.${entity}`;
    const strapi = createStrapiServiceMock({
      services: {
        [uid]: {
          findMany: () => [],
          update() {
            return {};
          },
        },
      },
    });
    const tool = getServiceMethodsTool(strapi as any);

    // When
    const result = await tool.callback({ name: entity } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(true);
    expect(payload.fullyQualifiedServiceName).toBe(uid);
    expect(payload.methods).toEqual(expect.arrayContaining(['findMany', 'update']));
  });

  it('resolves plugin service when name and plugin are provided', async () => {
    // Given
    const plugin = faker.word.noun();
    const name = faker.word.noun();
    const uid = `plugin::${plugin}.${name}`;
    const strapi = createStrapiServiceMock({
      services: {
        [uid]: {
          doWork: () => true,
          health: () => 'ok',
        },
      },
    });
    const tool = getServiceMethodsTool(strapi as any);

    // When
    const result = await tool.callback({ name, plugin } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(true);
    expect(payload.fullyQualifiedServiceName).toBe(uid);
    expect(payload.methods).toEqual(expect.arrayContaining(['doWork', 'health']));
  });

  it('returns suggestions when similar service names exist', async () => {
    // Given
    const topic = faker.word.noun();
    const k1 = `api::${topic}.${faker.word.noun()}`;
    const k2 = `api::${topic}.${faker.word.noun()}`;
    const kOther = `plugin::${faker.word.noun()}.${faker.word.noun()}`; // does not include topic
    const strapi = createStrapiServiceMock({
      services: {
        [k1]: { a: 1 },
        [k2]: { b: 2 },
        [kOther]: { c: 3 },
      },
    });
    const tool = getServiceMethodsTool(strapi as any);

    // When
    const result = await tool.callback({ name: topic } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(typeof payload.message).toBe('string');
    expect(payload.suggestions).toEqual(expect.arrayContaining([k1, k2]));
    expect(payload.suggestions.length).toBe(2);
  });

  it('returns not found error when no exact match or suggestions exist', async () => {
    // Given
    const known = [`api::${faker.word.noun()}.${faker.word.noun()}`, `plugin::${faker.word.noun()}.${faker.word.noun()}`];
    let unknown = faker.string.alphanumeric(12);
    const joined = known.join(' ');
    while (joined.includes(unknown)) {
      unknown = faker.string.alphanumeric(12);
    }
    const services: Record<string, any> = {};
    services[known[0]] = {};
    services[known[1]] = {};
    const strapi = createStrapiServiceMock({ services });
    const tool = getServiceMethodsTool(strapi as any);

    // When
    const result = await tool.callback({ name: unknown } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Service not found');
    expect(payload.suggestions).toBeUndefined();
  });
});

function createStrapiServiceMock({
  services,
}: {
  services: Record<string, any>;
}) {
  const registry: Record<string, any> = { ...services };
  return {
    services: registry,
    service(uid: string) {
      return registry[uid];
    },
  };
}


