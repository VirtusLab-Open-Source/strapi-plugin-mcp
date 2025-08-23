import { UID } from '@strapi/strapi';
import { z } from 'zod';

import { Strapi } from '@local-types/strapi';

import { McpToolDefinitionBuilder } from '../../../common';

export const getContentTypesTool: McpToolDefinitionBuilder<{}> = (strapi: Strapi) => {
  const contentTypes = Object.keys(strapi.contentTypes) as UID.ContentType[];

  return {
    name: 'get-content-types',
    description: 'Get all content types',
    argsSchema: z.object({}),
    callback: async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            contentTypes,
          }),
        },
      ],
    }),
  };
};
