// noinspection JSUnusedGlobalSymbols
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';

import type { StrapiContext } from '@local-types/strapi';

import { name, version } from '../../../package.json';
import { getPluginConfig } from '../config';
import { buildLogger, createTransportStore } from '../utils';

// Constants for HTTP status codes
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Constants for JSON-RPC error codes
const JSONRPC_ERROR_CODES = {
  SERVER_ERROR: -32000,
  INTERNAL_ERROR: -32603,
} as const;

// Constants for headers and messages
const HEADERS = {
  MCP_SESSION_ID: 'mcp-session-id',
} as const;

const ERROR_MESSAGES = {
  INVALID_SESSION: 'Invalid or missing session ID',
  INTERNAL_SERVER_ERROR: 'Internal server error',
  TRANSPORT_SESSION_UNDEFINED: 'Transport session ID is undefined',
} as const;

/**
 * Creates and configures the events controller for the MCP plugin.
 * This controller handles MCP (Model Context Protocol) server connections and transport management.
 *
 * @param {StrapiContext} context - The Strapi context containing the strapi instance
 * @param {object} context.strapi - The Strapi instance
 * @returns {object} Controller object with endpoint handlers for MCP transport
 */
const eventsController = ({ strapi }: StrapiContext) => {
  const plugin = strapi.plugin('mcp');
  const logger = buildLogger(strapi);

  const contentTypesService = plugin.service('contentTypes');
  const strapiInfoService = plugin.service('strapiInfo');
  const servicesService = plugin.service('services');
  const customService = plugin.service('custom');

  const pluginConfig = getPluginConfig(strapi);
  const transportStore = createTransportStore({
    strapi,
    options: pluginConfig.session,
  });

  /**
   * Creates and configures a new MCP server instance with all available tools.
   *
   * @returns {McpServer} Configured MCP server with content types, Strapi info, and services tools
   */
  const createServer = () => {
    const server = new McpServer({
      name,
      version,
    });

    contentTypesService.addTools(server);
    strapiInfoService.addTools(server);
    servicesService.addTools(server);
    customService.addTools(server);

    return server;
  };

  /**
   * Retrieves or creates a transport for the MCP connection based on the session ID.
   *
   * @param {any} ctx - The Koa context object containing request headers and body
   * @returns {Promise<object|null>} The transport object or null if session is invalid
   * @throws {Error} If transport session ID is undefined during creation
   */
  const getTransport = async (ctx: any) => {
    const sessionId = getSessionId(ctx);
    const server = createServer();

    if (sessionId) {
      const existing = await transportStore.get(sessionId);

      if (existing.type !== 'none') {
        if (existing.type === 'regenerated') {
          // In service of DX, we re-initialize the transport manually. This is a hack.
          existing.transport.sessionId = sessionId;
          // @ts-expect-error - _initialized is private
          existing.transport._initialized = true;

          logger.debug(`Regenerated transport for session ${sessionId}`);

          await server.connect(existing.transport);
        }

        return existing.transport;
      }
    }

    if (!sessionId && isInitializeRequest(ctx.request.body)) {
      logger.debug('Creating new transport for session');

      const transport = transportStore.createTransport({
        sessionIdGenerator: () => randomUUID(),
      });

      // @ts-expect-error - sessionId is not defined
      await transportStore.set(transport.sessionId, transport);

      logger.debug(`Created new transport for session ${transport.sessionId}`);

      await server.connect(transport);

      return transport;
    }

    ctx.status = HTTP_STATUS.BAD_REQUEST;
    ctx.body = emptySessionResponse;

    logger.debug('No session ID found, returning null');

    return null;
  };

  return {
    /**
     * Handles GET requests for MCP streamable connections.
     * Validates session and delegates request handling to the transport.
     *
     * @param {any} ctx - The Koa context object
     * @returns {Promise<void>}
     */
    async getStreamable(ctx: any) {
      const sessionId = getSessionId(ctx);
      const readResult = await transportStore.get(sessionId);

      if (!sessionId || readResult.type === 'none') {
        ctx.status = HTTP_STATUS.BAD_REQUEST;
        ctx.body = emptySessionResponse;
        return;
      }

      logger.debug(
        `Delegating request (GET) to transport for session ${sessionId} ${JSON.stringify(
          ctx.request.body,
          null,
          2
        )}`
      );

      await readResult.transport.handleRequest(ctx.req, ctx.res);
    },

    /**
     * Handles DELETE requests for MCP streamable connections.
     * Validates session and delegates request handling to the transport.
     *
     * @param {any} ctx - The Koa context object
     * @returns {Promise<void>}
     */
    async deleteStreamable(ctx: any) {
      const sessionId = getSessionId(ctx);
      const readResult = await transportStore.get(sessionId);

      if (!sessionId || readResult.type === 'none') {
        ctx.status = HTTP_STATUS.BAD_REQUEST;
        ctx.body = emptySessionResponse;

        return;
      }

      logger.debug(
        `Delegating request (DELETE) to transport for session ${sessionId} ${JSON.stringify(ctx.request.body, null, 2)}`
      );

      await readResult.transport.handleRequest(ctx.req, ctx.res);
    },

    /**
     * Handles POST requests for MCP streamable connections.
     * Creates or retrieves transport and delegates request handling.
     * Includes comprehensive error handling with proper HTTP status codes.
     *
     * @param {any} ctx - The Koa context object
     * @returns {Promise<void>}
     */
    async postStreamable(ctx: any) {
      try {
        const transport = await getTransport(ctx);

        if (transport) {
          logger.debug(`Handling request (POST) for session ${transport.sessionId} ${JSON.stringify(ctx.request.body, null, 2)}`);

          await transport.handleRequest(ctx.req, ctx.res, ctx.request.body);
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error(`Error in streamable endpoint: ${error.message}`);
        } else {
          logger.error(`Error in streamable endpoint: ${JSON.stringify(error, null, 2)}`);
        }

        if (!ctx.res.headersSent) {
          ctx.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
          ctx.body = internalServerErrorResponse;
        }
      }
    },
  };
};

/**
 * Extracts the MCP session ID from the request headers.
 *
 * @param {any} ctx - The Koa context object
 * @returns {string | undefined} The session ID from the 'mcp-session-id' header, or undefined if not present
 */
const getSessionId = (ctx: any): string | undefined => ctx.headers[HEADERS.MCP_SESSION_ID];

const emptySessionResponse = {
  jsonrpc: '2.0',
  error: {
    code: JSONRPC_ERROR_CODES.SERVER_ERROR,
    message: ERROR_MESSAGES.INVALID_SESSION,
  },
  id: null,
};

const internalServerErrorResponse = {
  jsonrpc: '2.0',
  error: {
    code: JSONRPC_ERROR_CODES.INTERNAL_ERROR,
    message: ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
  },
  id: null,
};

export default eventsController;
