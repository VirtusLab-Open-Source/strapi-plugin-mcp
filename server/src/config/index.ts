import { z } from 'zod';

import { StrapiContext } from '@local-types/strapi';

// TODO: add tests
// TODO: add JSDoc (use faker for fake data)

export const redisClientConfigSchema = z.object({
  port: z.number(),
  host: z.string(),
  username: z.string().optional(),
  password: z.string().optional(),
  db: z.number().optional(),
});

export const RedisSessionConfigSchema = z.object({
  type: z.literal('redis'),
  connection: z.string().or(redisClientConfigSchema).optional(),
  ttlMs: z.number().optional(),
  keyPrefix: z.string().optional(),
});

export const LruSessionConfigSchema = z.object({
  type: z.literal('memory'),
});

export const PluginConfigSchema = z.object({
  session: z.discriminatedUnion('type', [RedisSessionConfigSchema, LruSessionConfigSchema]),
  allowedIPs: z.array(z.string()).optional(),
});

export type PluginConfig = z.infer<typeof PluginConfigSchema>;

export const getPluginConfig = (strapi: StrapiContext['strapi']): PluginConfig => {
  const rawConfig = strapi.config.get('plugin::mcp');
  const parsedConfig = PluginConfigSchema.safeParse(rawConfig);

  if (!parsedConfig.success) {
    return {
      session: {
        type: 'memory',
      },
    };
  }

  return parsedConfig.data;
};
