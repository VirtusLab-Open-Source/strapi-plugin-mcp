import { z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';

export const getInstanceInfoTool: McpToolDefinitionBuilder<{}> = (strapi: Strapi) => {
  return {
    name: 'get-strapi-info',
    description: 'Get information about the current Strapi instance',
    argsSchema: z.object({}),
    callback: async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              isSuccess: true,
              info: {
                version: strapi.config.get('info.strapi'),
                environment: strapi.config.get('environment'),
                plugins: Object.keys(strapi.plugins),
              },
            },
            null,
            2
          ),
        },
      ],
    }),
  };
};
