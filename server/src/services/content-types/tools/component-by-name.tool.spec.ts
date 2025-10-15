import { faker } from '@faker-js/faker';
import { createStrapiMock } from '@test/strapi.mock';
import fs from 'fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Logger } from '../../../utils';
import { getComponentByNameTool, getComponentSchemaFilePath } from './component-by-name.tool';

describe('getComponentByNameTool', () => {
  it('builds a tool with expected metadata and args schema', async () => {
    // Given
    const strapi = createStrapiMock({});

    // When
    const tool = getComponentByNameTool(strapi);

    // Then
    expect(tool.name).toBe('get-component-by-name');

    // Args schema is provided as a Zod raw shape; build an object to validate
    const shape = z.object(tool.argsSchema!);
    const name = faker.word.noun();
    const category = faker.word.noun();
    expect(() => shape.parse({ name })).not.toThrow();
    expect(() => shape.parse({ name, category })).not.toThrow();
    expect(() => shape.parse({})).toThrow();
  });

  it('returns component when exact UID is provided', async () => {
    // Given
    const category = faker.word.noun();
    const componentName = faker.word.noun();
    const uid = `${category}.${componentName}`;
    const strapi = createStrapiMock({ components: [uid] });
    const tool = getComponentByNameTool(strapi);

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

  it('returns component when category and name are provided and match a component UID', async () => {
    // Given
    const category = faker.word.noun();
    const componentName = faker.word.noun();
    const uid = `${category}.${componentName}`;
    const strapi = createStrapiMock({ components: [uid] });
    const tool = getComponentByNameTool(strapi);

    // When
    const result = await tool.callback({ name: componentName, category } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.isSure).toBe(true);
    expect(payload.contentType?.contentType).toBe(uid);
  });

  it('returns suggestions when no exact match is found but similar UIDs exist', async () => {
    // Given
    const topic = faker.word.sample();
    const keys = [
      `${faker.word.noun()}.${topic}-${faker.word.noun()}`,
      `${faker.word.noun()}.${topic}-${faker.word.noun()}`,
      `${faker.word.noun()}.${faker.word.noun()}`,
    ];
    const strapi = createStrapiMock({ components: keys });
    const tool = getComponentByNameTool(strapi);

    // When
    const result = await tool.callback({ name: topic } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Component not found');
    expect(payload.suggestions).toEqual([keys[0], keys[1]]);
  });

  it('returns not found error when no match or suggestions exist', async () => {
    // Given
    const keys = [
      `${faker.word.noun()}.${faker.word.noun()}`,
      `${faker.word.noun()}.${faker.word.noun()}`,
    ];
    // Pick a search term that doesn't appear in any key
    let unknown = faker.string.alphanumeric(12);
    const keysJoined = keys.join(' ');
    while (keysJoined.includes(unknown)) {
      unknown = faker.string.alphanumeric(12);
    }
    const strapi = createStrapiMock({ components: keys });
    const tool = getComponentByNameTool(strapi);

    // When
    const result = await tool.callback({ name: unknown } as any, {} as any);

    // Then
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload.success).toBe(false);
    expect(payload.error).toBe('Component not found');
    expect(Array.isArray(payload.suggestions)).toBe(true);
    expect(payload.suggestions.length).toBe(0);
  });
});

describe('getComponentSchemaFilePath', () => {
  const logger: Logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns the first matching schema path when file exists', () => {
    // Given
    const name = 'units.file-data';
    const target = 'src/components/units/file-data/schema.ts';
    const spy = vi
      .spyOn(fs, 'existsSync')
      .mockImplementation((p: any) => typeof p === 'string' && p.includes(target));

    try {
      // When
      const result = getComponentSchemaFilePath({ name, logger });

      // Then
      expect(result).toBe(target);
    } finally {
      spy.mockRestore();
    }
  });

  it('returns null for invalid component name format', () => {
    // Given
    const invalid = 'invalidNameWithoutDot';

    // When
    const result = getComponentSchemaFilePath({ name: invalid, logger });

    // Then
    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });
});
