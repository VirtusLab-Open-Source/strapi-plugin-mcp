import { faker } from '@faker-js/faker';
import { createStrapiMock } from '@test/strapi.mock';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { getContentTypeByNameTool } from './content-type-by-name.tool';

describe('getContentTypeByNameTool', () => {
  it('builds a tool with expected metadata and args schema', async () => {
    // Given
    const strapi = createStrapiMock({});

    // When
    const tool = getContentTypeByNameTool(strapi);

    // Then
    expect(tool.name).toBe('get-content-type-by-name');

    // Args schema is provided as a Zod raw shape; build an object to validate
    const shape = z.object(tool.argsSchema!);
    const apiName = faker.word.noun();
    const contentTypeName = faker.word.noun();
    expect(() => shape.parse({ name: `api::${apiName}.${contentTypeName}` })).not.toThrow();
    expect(() => shape.parse({ name: faker.word.noun(), plugin: faker.word.noun() })).not.toThrow();
    expect(() => shape.parse({})).toThrow();
  });

  it('returns content type when exact UID is provided', async () => {
    // Given
    const apiName = faker.word.noun();
    const contentTypeName = faker.word.noun();
    const uid = `api::${apiName}.${contentTypeName}`;
    const strapi = createStrapiMock({ contentTypes: [uid] });
    const tool = getContentTypeByNameTool(strapi);

    // When
    const result = await tool.callback({ name: uid } as any, {} as any);

    // Then
    expect(Array.isArray(result.content)).toBe(true);
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    expect(textItem?.type).toBe('text');

    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.isSure).toBe(true);
    expect(payload.contentType?.contentType).toBe(uid);
    expect(Array.isArray(payload.contentType?.fields)).toBe(true);
  });

  it('returns content type when name and plugin are provided and match a plugin UID', async () => {
    // Given
    const pluginName = faker.word.noun();
    const contentTypeName = faker.word.noun();
    const pluginUid = `plugin::${pluginName}.${contentTypeName}`;
    const strapi = createStrapiMock({ contentTypes: [pluginUid] });
    const tool = getContentTypeByNameTool(strapi);

    // When
    const result = await tool.callback(
      { name: contentTypeName, plugin: pluginName } as any,
      {} as any
    );

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.isSure).toBe(true);
    expect(payload.contentType?.contentType).toBe(pluginUid);
  });

  it('returns suggestions when no exact match is found but similar UIDs exist', async () => {
    // Given
    const topic = faker.word.noun();
    const keys = [
      `api::${topic}.${faker.word.noun()}`,
      `api::${topic}.${faker.word.noun()}`,
      `plugin::${faker.word.noun()}.${faker.word.noun()}`,
    ];
    const strapi = createStrapiMock({ contentTypes: keys });
    const tool = getContentTypeByNameTool(strapi);

    // When
    const result = await tool.callback({ name: topic } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Content type not found');
    expect(payload.suggestions).toEqual([keys[0], keys[1]]);
  });

  it('returns not found error when no match or suggestions exist', async () => {
    // Given
    const keys = [
      `api::${faker.word.noun()}.${faker.word.noun()}`,
      `plugin::${faker.word.noun()}.${faker.word.noun()}`,
    ];
    // Pick a search term that doesn't appear in any key
    let unknown = faker.string.alphanumeric(12);
    const keysJoined = keys.join(' ');
    while (keysJoined.includes(unknown)) {
      unknown = faker.string.alphanumeric(12);
    }
    const strapi = createStrapiMock({ contentTypes: keys });
    const tool = getContentTypeByNameTool(strapi);

    // When
    const result = await tool.callback({ name: unknown } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Content type not found');
    expect(payload.suggestions).toBeUndefined();
  });
});
