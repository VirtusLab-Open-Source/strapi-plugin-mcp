import { CallToolResult } from '@modelcontextprotocol/sdk/types';
import { UID } from '@strapi/strapi';
import { ZodOptional, ZodString, z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';

export const getServiceMethodsTool: McpToolDefinitionBuilder<{
  name: ZodString;
  plugin: ZodOptional<ZodString>;
}> = (strapi: Strapi) => {
  const services = new Set(Object.keys(strapi.services) as UID.Service[]);

  return {
    name: 'get-service-methods',
    description: 'Get all methods of a service',
    argsSchema: {
      name: z.string(),
      plugin: z.string().optional(),
    },
    callback: async ({ name, plugin }) => {
      if (services.has(name as UID.Service)) {
        const service = strapi.service(name as UID.Service);

        return mapToResult({
          service,
          name,
        });
      }

      if (!plugin) {
        const serviceName = `api::${name}.${name}`;

        if (services.has(serviceName as UID.Service)) {
          const service = strapi.service(serviceName as UID.Service);

          return mapToResult({
            service,
            name: serviceName,
          });
        }
      }

      if (plugin && services.has(`plugin::${plugin}.${name}` as UID.Service)) {
        const serviceName = `plugin::${plugin}.${name}`;
        const service = strapi.service(serviceName as UID.Service);

        return mapToResult({
          service,
          name: serviceName,
        });
      }

      const possibleServiceNames = Array.from(services).filter((service) => service.includes(name));

      if (possibleServiceNames.length > 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: `Service ${name} not found. Did you mean one of the following?`,
                suggestions: possibleServiceNames,
              }),
            },
          ],
        } satisfies CallToolResult;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: 'Service not found',
            }),
          },
        ],
      } satisfies CallToolResult;
    },
  };
};

const mapToResult = ({ service, name }: { service: Record<string, unknown>; name: string }) => {
  const methods = Object.entries(service)
    .filter(([_, value]) => typeof value === 'function')
    .map(([key]) => key);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({
          success: true,
          fullyQualifiedServiceName: name,
          methods,
        }),
      },
    ],
  } satisfies CallToolResult;
};
