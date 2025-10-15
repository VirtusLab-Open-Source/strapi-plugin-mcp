import { getPluginConfig } from '../config';
import { buildLogger } from '../utils';

// Constants for localhost IP addresses
const LOCALHOST_IPV4 = '127.0.0.1';
const LOCALHOST_IPV6 = '::1';
const LOCALHOST_IPV4_MAPPED_IPV6 = '::ffff:127.0.0.1';

/**
 * IP Allowlist Policy
 *
 * Restricts access to routes based on an allowlist of permitted IP addresses.
 * Configure allowed IPs in your plugin config under `allowedIPs`.
 */
export default (ctx: any, config: any, { strapi }: { strapi: any }) => {
    // Get the client IP address
    const clientIP = ctx.request.ip || ctx.ip;

    const logger = buildLogger(strapi);

    // Get allowed IPs from plugin config or use default
    const pluginConfig = getPluginConfig(strapi);

    if (!pluginConfig.allowedIPs || pluginConfig.allowedIPs.length === 0) {
      logger.warn('No allowed IPs configured, allowing all IPs');

      return true;
    }

    const allowedIPs: string[] = pluginConfig.allowedIPs;

    // Check if client IP is in the allowlist
    const isAllowed = allowedIPs.some((allowedIP) => {
      // Handle IPv6 localhost variants
      if (
        allowedIP === LOCALHOST_IPV6 &&
        (clientIP === LOCALHOST_IPV6 || clientIP === LOCALHOST_IPV4_MAPPED_IPV6)
      ) {
        return true;
      }
      // Handle IPv4 localhost
      if (
        allowedIP === LOCALHOST_IPV4 &&
        (clientIP === LOCALHOST_IPV4 || clientIP === LOCALHOST_IPV4_MAPPED_IPV6)
      ) {
        return true;
      }
      return clientIP === allowedIP;
    });

    if (!isAllowed) {
      logger.warn(`Access denied from IP: ${clientIP}`);
      return false;
    }

    return true
  };