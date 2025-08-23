import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

import { StrapiContext } from '@local-types/strapi';

import { registerTool } from '../../common';
import { getInstanceInfoTool } from './tools';

export default ({ strapi }: StrapiContext) => {
  return {
    addTools: (server: McpServer) => {
      registerTool({
        server,
        tool: getInstanceInfoTool(strapi),
      });
    },
  };
};
