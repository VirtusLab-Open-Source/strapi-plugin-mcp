import { faker } from '@faker-js/faker';
import { Strapi } from '@local-types/strapi';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { getInstanceInfoTool } from './instance-info.tool';

describe('getInstanceInfoTool', () => {
  it('builds a tool with expected metadata and empty args schema', () => {
    // Given
    const strapi = createStrapiInfoMock({});

    // When
    const tool = getInstanceInfoTool(strapi as unknown as Strapi);

    // Then
    expect(tool.name).toBe('get-strapi-info');
    expect(tool.description).toBe('Get information about the current Strapi instance');
    // Ensure the args schema accepts an empty object
    const shape = tool.argsSchema as z.ZodObject<{}>;
    expect(() => shape.parse({})).not.toThrow();
  });

  it('returns version, environment and plugins from Strapi in response content', async () => {
    // Given
    const version = '4.25.0';
    const environment = 'production';
    const plugins = { [faker.word.noun()]: {}, [faker.word.noun()]: {}, [faker.word.noun()]: {} };
    const strapi = createStrapiInfoMock({ version, environment, plugins });
    const tool = getInstanceInfoTool(strapi as unknown as Strapi);

    // When
    const result = await tool.callback({}, {} as any);

    // Then
    expect(Array.isArray(result.content)).toBe(true);
    const textItem = result.content?.[0] as { type: 'text'; text: string };
    expect(textItem?.type).toBe('text');

    const payload = JSON.parse(textItem.text ?? '{}');
    expect(payload).toEqual({
      isSuccess: true,
      info: {
        version,
        environment,
        plugins: Object.keys(plugins),
      },
    });

    // Also ensure config.get was requested with expected keys
    const getSpy = strapi.config.get as ReturnType<typeof vi.fn>;
    expect(getSpy).toHaveBeenCalledWith('info.strapi');
    expect(getSpy).toHaveBeenCalledWith('environment');
  });
});

function createStrapiInfoMock({
  version = '0.0.0-test',
  environment = 'test',
  plugins = {} as Record<string, object>,
} = {}) {
  const get = vi.fn((key: string) => {
    if (key === 'info.strapi') return version;
    if (key === 'environment') return environment;
    return undefined;
  });

  return {
    config: { get },
    plugins,
  };
}
