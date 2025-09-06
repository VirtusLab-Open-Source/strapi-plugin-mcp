import { McpServer, ToolCallback } from '@modelcontextprotocol/sdk/server/mcp';
import { ToolAnnotations } from '@modelcontextprotocol/sdk/types';
import { ZodRawShape } from 'zod';

import { Strapi } from '@local-types/strapi';

export interface McpToolDefinition<Args extends ZodRawShape> {
  name: string;
  callback: ToolCallback<Args>;
  argsSchema?: Args;
  description?: string;
  annotations?: ToolAnnotations;
}

export type McpToolDefinitionBuilder<Args extends ZodRawShape> = (
  strapi: Strapi
) => McpToolDefinition<Args>;

interface ApplyToolInput<Args extends ZodRawShape> {
  server: McpServer;
  tool: McpToolDefinition<Args>;
}

export const registerTool = <Args extends ZodRawShape>({ server, tool }: ApplyToolInput<Args>) => {
  const { name, callback, argsSchema, description, annotations } = tool;

  if (argsSchema && description && annotations) {
    server.tool(name, description, argsSchema, annotations, callback);
  } else if (argsSchema && description) {
    server.tool(name, description, argsSchema, callback);
  } else if (argsSchema && annotations) {
    server.tool(name, argsSchema, annotations, callback);
  } else if (argsSchema) {
    server.tool(name, argsSchema, callback);
  } else {
    server.tool(name, callback as ToolCallback);
  }
};
