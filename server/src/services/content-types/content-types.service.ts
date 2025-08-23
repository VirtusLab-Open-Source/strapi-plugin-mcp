import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';

import { StrapiContext } from '@local-types/strapi';

import { registerTool } from '../../common';

import {
  getComponentByNameTool,
  getComponentsTool,
  getContentTypeByNameTool,
  getContentTypesTool,
} from './tools';

export default ({ strapi }: StrapiContext) => ({
  addTools: (server: McpServer) => {
    registerTool({
      server,
      tool: getContentTypesTool(strapi),
    });

    registerTool({
      server,
      tool: getComponentsTool(strapi),
    });

    registerTool({
      server,
      tool: getContentTypeByNameTool(strapi),
    });

    registerTool({
      server,
      tool: getComponentByNameTool(strapi),
    });
  },
});
