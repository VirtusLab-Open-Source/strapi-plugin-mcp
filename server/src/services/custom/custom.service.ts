import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { ZodRawShape } from 'zod';

import { McpToolDefinition, registerTool } from '../../common';

/**
 * Custom service factory for managing user-defined MCP tools.
 * 
 * This service provides a registry system that allows developers to register custom
 * MCP (Model Context Protocol) tools dynamically. Tools are stored in memory until
 * they are registered with an MCP server instance.
 * 
 * The service follows a two-phase approach:
 * 1. **Registration Phase**: Tools are registered via `registerTool()` and stored in memory
 * 2. **Application Phase**: All registered tools are applied to an MCP server via `addTools()`
 * 
 * This pattern allows for flexible tool composition and ensures all custom tools
 * are properly registered with the MCP server when the plugin initializes.
 * 
 * @returns An object with methods for registering and applying custom tools
 * 
 * @example
 * ```typescript
 * import customService from './custom.service';
 * 
 * const service = customService();
 * 
 * // Register a custom tool
 * service.registerTool({
 *   name: 'my-custom-tool',
 *   description: 'Does something custom',
 *   argsSchema: { input: z.string() },
 *   callback: async (args) => ({
 *     content: [{ type: 'text', text: `Processed: ${args.input}` }]
 *   })
 * });
 * 
 * // Later, register all tools with the MCP server
 * service.addTools(mcpServer);
 * ```
 */
export default () => {
  /** Registry to store custom tool definitions before they are registered with the MCP server */
  const tools: Array<McpToolDefinition<ZodRawShape>> = [];

  return {
  /**
   * Registers a custom MCP tool definition for later application to a server.
   * 
   * This method adds a tool definition to the internal registry. The tool will not
   * be active until `addTools()` is called with an MCP server instance.
   * 
   * @template Args - The Zod schema shape for validating tool arguments
   * @param definition - The complete tool definition including name, callback, and optional schema/description
   * 
   * @example
   * ```typescript
   * service.registerTool({
   *   name: 'calculate-sum',
   *   description: 'Adds two numbers together',
   *   argsSchema: {
   *     a: z.number(),
   *     b: z.number()
   *   },
   *   callback: async ({ a, b }) => ({
   *     content: [{ type: 'text', text: `${a} + ${b} = ${a + b}` }]
   *   })
   * });
   * ```
   */
  registerTool: <Args extends ZodRawShape>(definition: McpToolDefinition<Args>) => {
    tools.push(definition);
  },

  /**
   * Registers all previously registered custom tools with an MCP server.
   * 
   * This method iterates through all tools in the registry and registers them
   * with the provided MCP server instance. After this call, all custom tools
   * will be available for use by MCP clients.
   * 
   * @param server - The MCP server instance to register tools with
   * 
   * @example
   * ```typescript
   * import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
   * 
   * const server = new McpServer({ name: 'my-server', version: '1.0.0' });
   * const service = customService();
   * 
   * // Register some custom tools first
   * service.registerTool(myCustomTool);
   * service.registerTool(anotherCustomTool);
   * 
   * // Apply all registered tools to the server
   * service.addTools(server);
   * ```
   */
  addTools: (server: McpServer) => {
    if (tools.length === 0) {
      return;
    }

    tools.forEach((tool) => {
      registerTool({
        server,
        tool,
      });
    });
  },
  };
};
