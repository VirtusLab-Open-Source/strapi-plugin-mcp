import { createStrapiMock } from '@test/strapi.mock';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { faker } from '@faker-js/faker';

import { getServicesTool } from './services.tool';

describe('getServicesTool', () => {
  it('builds a tool with expected metadata and empty args schema', () => {
    // Given
    const strapi = createStrapiMock({});

    // When
    const tool = getServicesTool(strapi);

    // Then
    expect(tool.name).toBe('get-services');
    expect(tool.description).toBe('Get all services');

    const shape = tool.argsSchema as z.ZodObject<{}>;
    expect(() => shape.parse({})).not.toThrow();
  });

  it('maps internal and plugin services correctly', async () => {
    // Given
    const apiNamespace = faker.word.noun();
    const apiService = faker.word.noun();
    const pluginName1 = faker.word.noun();
    const pluginService1 = faker.word.noun();
    const pluginName2 = faker.word.noun();
    const pluginService2 = faker.word.noun();
    const apiKey = `api::${apiNamespace}.${apiService}`;
    const pluginKey1 = `plugin::${pluginName1}.${pluginService1}`;
    const pluginKey2 = `plugin::${pluginName2}.${pluginService2}`;
    const strapi = createStrapiMock({
      services: [apiKey, pluginKey1, pluginKey2],
    });
    const tool = getServicesTool(strapi as any);

    // When
    const result = await tool.callback({}, {} as any);

    // Then
    expect(Array.isArray(result.content)).toBe(true);
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    expect(textItem?.type).toBe('text');

    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(true);
    expect(Array.isArray(payload.services)).toBe(true);

    // Ensure at least these expected entries are present
    expect(payload.services).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fullQualifiedName: apiKey,
          type: 'internal',
          name: apiService,
          plugin: null,
        }),
        expect.objectContaining({
          fullQualifiedName: pluginKey1,
          type: 'plugin',
          name: pluginService1,
          plugin: pluginName1,
        }),
        expect.objectContaining({
          fullQualifiedName: pluginKey2,
          type: 'plugin',
          name: pluginService2,
          plugin: pluginName2,
        }),
      ])
    );

    // Service types helper text is present
    expect(payload.serviceTypes).toEqual(
      expect.objectContaining({
        internal: expect.any(String),
        plugin: expect.any(String),
      })
    );
  });

  it('returns error payload on unexpected failure', async () => {
    // Given: Object.keys(null) will throw
    const strapi = { services: null } as any;
    const tool = getServicesTool(strapi);

    // When
    const result = await tool.callback({}, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(typeof payload.error).toBe('string');
    expect(payload.error.length).toBeGreaterThan(0);
  });
});
