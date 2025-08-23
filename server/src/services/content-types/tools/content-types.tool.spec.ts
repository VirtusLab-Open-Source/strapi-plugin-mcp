import { faker } from '@faker-js/faker';
import { createStrapiMock } from '@test/strapi.mock';
import { describe, expect, it } from 'vitest';

import { getContentTypesTool } from './content-types.tool';

describe('getContentTypesTool', () => {
  it('builds a tool with expected metadata and empty args schema', async () => {
    // Given
    const strapi = createStrapiMock({});

    // When
    const tool = getContentTypesTool(strapi);

    // Then
    expect(tool.name).toBe('get-content-types');
    expect(tool.description).toBe('Get all content types');
    // Ensure the args schema accepts an empty object
    // Zod object should parse empty object without throwing
    expect(() => (tool.argsSchema as any)?.parse?.({})).not.toThrow();
  });

  it('returns all content type UIDs from Strapi in response content', async () => {
    // Given
    const keys = [
      'api::' + faker.word.noun() + '.' + faker.word.noun(),
      'plugin::' + faker.word.noun() + '.' + faker.word.noun(),
      'admin::' + faker.word.noun(),
    ];
    const strapi = createStrapiMock({ contentTypes: keys });
    const tool = getContentTypesTool(strapi);

    // When
    const result = await tool.callback({}, {} as any);

    // Then
    expect(Array.isArray(result.content)).toBe(true);
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    expect(textItem?.type).toBe('text');

    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload).toEqual({
      success: true,
      contentTypes: keys,
    });
  });
});
