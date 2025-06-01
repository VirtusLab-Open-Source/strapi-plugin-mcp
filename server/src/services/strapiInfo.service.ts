import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StrapiContext } from '../@types/strapi';

export default (context: StrapiContext) => {
  return {
    addTools: (server: McpServer) => {
      server.tool('get-strapi-info', {}, async () => ({
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                version: strapi.config.get('info.strapi'),
                environment: strapi.config.get('environment'),
                plugins: Object.keys(strapi.plugins),
              },
              null,
              2
            ),
          },
        ],
      }));
    },
  };
};
