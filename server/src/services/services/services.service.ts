import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

import { registerTool } from '../../common';

import { StrapiContext } from '@local-types/strapi';

import { getServiceMethodsTool, getServicesTool } from './tools';

export default ({ strapi }: StrapiContext) => ({
  addTools: (server: McpServer) => {
    registerTool({
      server,
      tool: getServicesTool(strapi),
    });

    registerTool({
      server,
      tool: getServiceMethodsTool(strapi),
    });
  },
});
