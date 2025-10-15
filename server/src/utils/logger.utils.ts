import { Strapi } from '@local-types/strapi';

const prefix = 'strapi-mcp-plugin';

const getMessage = (message: string) => `${prefix}::"${message}"`;

export type Logger = ReturnType<typeof buildLogger>;

/**
 * Creates a logger instance with consistent formatting for the Strapi MCP plugin.
 * 
 * The logger prefixes all messages with the plugin name and ISO timestamp for
 * consistent log formatting across the plugin.
 * 
 * @param strapi - The Strapi instance to use for logging
 * @returns A logger object with info, error, warn, and debug methods
 * 
 * @example
 * ```typescript
 * const logger = buildLogger(strapi);
 * logger.info('Plugin initialized successfully');
 * logger.error('Failed to process request');
 * ```
 */
export const buildLogger = (strapi: Strapi) => ({
  info: (message: string) => {
    strapi.log.info(getMessage(message));
  },
  error: (message: string) => {
    strapi.log.error(getMessage(message));
  },
  warn: (message: string) => {
    strapi.log.warn(getMessage(message));
  },
  debug: (message: string) => {
    strapi.log.debug(getMessage(message));
  },
});
