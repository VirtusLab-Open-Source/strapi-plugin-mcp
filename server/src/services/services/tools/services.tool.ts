import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';

type ServiceSummary =
  | { fullQualifiedName: string; type: 'internal'; name: string; plugin: null }
  | {
      fullQualifiedName: string;
      type: 'plugin';
      name: string;
      plugin: string;
    };

const INTERNAL_PREFIXES = new Set(['api', 'admin']);

export const getServicesTool: McpToolDefinitionBuilder<{}> = (strapi: Strapi) => {
  return {
    name: 'get-services',
    description: 'Get all services',
    argsSchema: z.object({}),
    callback: async () => {
      try {
        const servicesRegistry = strapi.services;

        if (!servicesRegistry || typeof servicesRegistry !== 'object') {
          throw new Error('Invalid services registry');
        }

        const services = Object.keys(servicesRegistry)
          .map((serviceKey) => parseServiceKey(serviceKey))
          .filter((service): service is ServiceSummary => service !== null)
          .sort((a, b) => a.fullQualifiedName.localeCompare(b.fullQualifiedName));

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                services,
                serviceTypes: {
                  internal: 'created and handled internally by Strapi',
                  plugin: 'created and handled by a plugin',
                },
              }),
            },
          ],
        } as CallToolResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: message,
              }),
            },
          ],
        } as CallToolResult;
      }
    },
  };
};

const parseServiceKey = (serviceKey: string): ServiceSummary | null => {
  if (typeof serviceKey !== 'string' || serviceKey.length === 0) return null;

  const split = serviceKey.split('::');

  if (split.length < 2) {
    return null;
  }

  const [prefix, restRaw] = split as [string, string];
  const rest = restRaw ?? '';
  const type: ServiceSummary['type'] = INTERNAL_PREFIXES.has(prefix) ? 'internal' : 'plugin';

  const parts = rest.split('.').filter(Boolean);

  if (type === 'internal') {
    // Admin/api services may not have a dot; take the last available segment as the name
    const name = parts.length > 0 ? parts[parts.length - 1] : rest;

    if (!name) return null;

    return {
      fullQualifiedName: serviceKey,
      type,
      name,
      plugin: null,
    } satisfies ServiceSummary;
  }

  // Plugin services should be in the form plugin::<plugin>.<name>
  if (parts.length < 2) {
    return null;
  }

  const plugin = parts[0];
  const name = parts.slice(1).join('.');

  if (!plugin || !name) {
    return null;
  }

  return {
    fullQualifiedName: serviceKey,
    type,
    name,
    plugin,
  } satisfies ServiceSummary;
};
