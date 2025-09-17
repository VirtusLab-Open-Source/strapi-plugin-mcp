import { UID } from '@strapi/strapi';
import { z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';

export const getComponentsTool: McpToolDefinitionBuilder<{}> = (strapi: Strapi) => {
  const components = Object.keys(strapi.components) as UID.Component[];

  return {
    name: 'get-components',
    description: 'Get all components',
    argsSchema: z.object({}),
    callback: async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            components,
          }),
        },
      ],
    }),
  };
};
