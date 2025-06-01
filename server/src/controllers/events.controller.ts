// noinspection JSUnusedGlobalSymbols

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import type { StrapiContext } from '../@types/strapi';

const eventsController = ({ strapi }: StrapiContext) => {
  const contentTypesService = strapi.plugin('mcp').service('contentTypes');
  const strapiInfoService = strapi.plugin('mcp').service('strapiInfo');
  const transports: Map<string, StreamableHTTPServerTransport> = new Map();

  const createServer = () => {
    const server = new McpServer({
      name: 'strapi-mcp-server',
      version: '1.0.0',
    });
    contentTypesService.addTools(server);
    strapiInfoService.addTools(server);

    return server;
  };

  const getSessionId = (ctx: any) => ctx.headers['mcp-session-id'] as string | undefined;

  const getTransport = async (ctx: any) => {
    const sessionId = getSessionId(ctx);
    if (sessionId && transports.has(sessionId)) {
      return transports.get(sessionId);
    }
    if (!sessionId && isInitializeRequest(ctx.request.body)) {
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (sessionId) => {
          transports.set(sessionId, transport);
        },
      });
      transport.onclose = () => {
        if (transport.sessionId) {
          transports.delete(transport.sessionId);
        }
      };
      const server = createServer();
      await server.connect(transport);
      return transport;
    }
    ctx.status = 400;
    ctx.body = {
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    };
    return null;
  };

  return {
    async getStreamable(ctx: any) {
      const sessionId = getSessionId(ctx);
      const transport = transports.get(sessionId);
      if (!sessionId || !transport) {
        ctx.status = 400;
        ctx.body = {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Invalid or missing session ID',
          },
          id: null,
        };
        return;
      }
      await transport.handleRequest(ctx.req, ctx.res);
    },
    async deleteStreamable(ctx: any) {
      const sessionId = getSessionId(ctx);
      const transport = transports.get(sessionId);
      if (!sessionId || !transport) {
        ctx.status = 400;
        ctx.body = {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Invalid or missing session ID',
          },
          id: null,
        };
        return;
      }
      await transport.handleRequest(ctx.req, ctx.res);
    },
    async postStreamable(ctx: any) {
      try {
        const transport = await getTransport(ctx);
        if (transport) {
          await transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
        }
      } catch (error) {
        console.error('Error in streamable endpoint:', error);
        if (!ctx.res.headersSent) {
          ctx.status = 500;
          ctx.body = {
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal server error',
            },
            id: null,
          };
        }
      }
    },
  };
};

export default eventsController;
