import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StrapiContext } from '../@types/strapi';
import z from 'zod';
import { UID } from '@strapi/strapi';
import { omit } from 'lodash';

export default ({ strapi }: StrapiContext) => {
  const contentTypes = Object.keys(strapi.contentTypes) as UID.ContentType[];
  return {
    addTools: (server: McpServer) => {
      server.tool('get-content-types', {}, async () => ({
        content: [
          {
            type: 'text',
            text: `Content types:
            ${contentTypes.map((name) => `- ${name}`).join('\n')}\n\n`,
          },
        ],
      }));

      if (contentTypes.length > 0) {
        server.tool(
          'get-content-type-by-name',
          {
            name: z.enum(contentTypes as [string, ...string[]]),
          },
          async ({ name }) => ({
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  omit(strapi.contentType(name as UID.ContentType), ['__schema__']),
                  null,
                  2
                ),
              },
            ],
          })
        );
      }
    },
  };
};
