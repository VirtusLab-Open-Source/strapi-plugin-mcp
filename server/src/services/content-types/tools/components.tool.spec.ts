import { faker } from '@faker-js/faker';
import { createStrapiMock } from '@test/strapi.mock';
import { describe, expect, it } from 'vitest';

import { getComponentsTool } from './components.tool';

describe('getComponentsTool', () => {
  it('builds a tool with expected metadata and empty args schema', async () => {
    // Given
    const strapi = createStrapiMock({});

    // When
    const tool = getComponentsTool(strapi);

    // Then
    expect(tool.name).toBe('get-components');
    expect(tool.description).toBe('Get all components');
    // Ensure the args schema accepts an empty object
    // Zod object should parse empty object without throwing
    expect(() => (tool.argsSchema as any)?.parse?.({})).not.toThrow();
  });

  it('returns all component UIDs from Strapi in response content', async () => {
    // Given
    const keys = [
      faker.word.noun() + '.' + faker.word.noun(),
      faker.word.noun() + '.' + faker.word.noun(),
      faker.word.noun() + '.' + faker.word.noun(),
    ];
    const strapi = createStrapiMock({ components: keys });
    const tool = getComponentsTool(strapi);

    // When
    const result = await (tool as any).callback({}, {} as any);

    // Then
    expect(Array.isArray(result.content)).toBe(true);
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    expect(textItem?.type).toBe('text');

    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(true);
    expect(payload.components).toEqual(keys);
  });
});
