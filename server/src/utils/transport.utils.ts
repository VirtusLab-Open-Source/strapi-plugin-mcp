import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type IORedis from 'ioredis';
import { Redis } from 'ioredis';
import { LRUCache } from 'lru-cache';
import { z } from 'zod';

import { LruSessionConfigSchema, RedisSessionConfigSchema } from '../config';

export type TransportStoreMode = 'lru' | 'redis';

/** Options for creating a transport instance registered in the store. */
export interface CreateTransportOptions {
  sessionIdGenerator?: () => string;
  onsessioninitialized?: (sessionId: string) => void;
}

// Extended transport store options that include LRU-specific settings
export interface ExtendedLruOptions {
  type: 'memory';
  max?: number;
  ttlMs?: number;
  updateAgeOnGet?: boolean;
}

// Extended Redis options that include URL support
export interface ExtendedRedisOptions {
  type: 'redis';
  connection?:
    | {
        port: number;
        host: string;
        username?: string;
        password?: string;
        db?: number;
      }
    | string;
  ttlMs?: number;
  keyPrefix?: string;
}

export type TransportStoreOptions = ExtendedRedisOptions | ExtendedLruOptions;

// Legacy type aliases for backward compatibility
export type RedisTransportStoreOptions = ExtendedRedisOptions;
export type LruTransportStoreOptions = ExtendedLruOptions;

const generateRedisKey = ({
  options,
  sessionId,
}: {
  options: RedisTransportStoreOptions;
  sessionId: string;
}) => {
  const rawPrefix = options.keyPrefix ?? defaultRedisOptions.keyPrefix;
  const normalizedPrefix = rawPrefix?.endsWith(':')
    ? rawPrefix.slice(0, -1)
    : (rawPrefix ?? 'strapi-mcp');

  return `${normalizedPrefix}:${sessionId}`;
};

type GetResult =
  | {
      type: 'existing';
      transport: StreamableHTTPServerTransport;
    }
  | {
      type: 'none';
    }
  | {
      type: 'regenerated';
      transport: StreamableHTTPServerTransport;
    };

export interface TransportStore {
  /** Retrieve a transport reference by session id (local only). */
  get(sessionId?: string): Promise<GetResult>;
  set(sessionId: string, transport: StreamableHTTPServerTransport): Promise<void>;
  delete(sessionId: string): void;
  /** Number of transports currently kept locally. */
  size(): number;
  createTransport(options?: CreateTransportOptions): StreamableHTTPServerTransport;
}

const TEN_MINUTES = 10 * 60 * 1000;
const MAX_ITEMS_COUNT = 20;

const defaultLruOptions: ExtendedLruOptions = {
  type: 'memory',
  max: MAX_ITEMS_COUNT,
  ttlMs: TEN_MINUTES,
  updateAgeOnGet: true,
};

const defaultRedisOptions: RedisTransportStoreOptions = {
  type: 'redis',
  connection: '',
  ttlMs: TEN_MINUTES,
  keyPrefix: 'mcp:session',
};

// Extended schemas that add LRU-specific options to the base config schemas
const ExtendedLruOptionsSchema = LruSessionConfigSchema.extend({
  max: z.number().int().positive().optional(),
  updateAgeOnGet: z.boolean().optional(),
  ttlMs: z.number().int().positive().optional(),
});

const TransportOptionsSchema = z.discriminatedUnion('type', [
  ExtendedLruOptionsSchema,
  RedisSessionConfigSchema,
]);

/**
 * Create a transport store.
 *
 * - In 'memory' mode, keeps transports in an in-memory LRU with TTL.
 * - In 'redis' mode, validates Redis config and mirrors session presence in Redis (not the transport).
 */
export function createTransportStore(
  options: TransportStoreOptions = defaultLruOptions
): TransportStore {
  const parsed = TransportOptionsSchema.parse(options);

  let lruStore: LRUCache<string, StreamableHTTPServerTransport> | undefined;
  let redisClient: IORedis | undefined;

  // Always use LRU locally. If redis is selected, LRU remains the local cache
  // and Redis serves as a fallback presence signal for rehydration.
  const lruResolved =
    parsed.type === 'memory'
      ? {
          max: parsed.max ?? defaultLruOptions.max,
          ttl: parsed.ttlMs ?? defaultLruOptions.ttlMs,
          updateAgeOnGet: parsed.updateAgeOnGet ?? defaultLruOptions.updateAgeOnGet,
        }
      : {
          max: defaultLruOptions.max,
          ttl: defaultLruOptions.ttlMs,
          updateAgeOnGet: defaultLruOptions.updateAgeOnGet,
        };
  lruStore = new LRUCache<string, StreamableHTTPServerTransport>(lruResolved as any);

  if (parsed.type === 'redis') {
    const debug = parsed.debug ?? false;

    try {
      // Create Redis client with proper configuration
      if (parsed.connection) {
        if (typeof parsed.connection === 'string') {
          redisClient = new Redis(parsed.connection, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
          });
        } else {
          redisClient = new Redis({
            ...parsed.connection,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
          });
        }
      } else {
        throw new Error('Redis storage selected but no redis client configuration or url provided');
      }

      if (debug) {
        // Test connection and handle errors gracefully
        redisClient.on('error', (error) => {
          console.warn(
            'Redis connection error (transport store will fall back to LRU only):',
            error.message
          );
        });

        redisClient.on('connect', () => {
          console.log('Redis transport store connected successfully');
        });

        // Attempt initial connection test
        redisClient.ping().catch((error) => {
          console.warn(
            'Redis initial connection test failed (will retry on demand):',
            error.message
          );
        });
      }
    } catch (error) {
      if (debug) {
        console.warn(
          'Failed to initialize Redis client, falling back to LRU-only mode:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }

      redisClient = undefined;
    }
  }

  const set = async (
    sessionId: string,
    transport: StreamableHTTPServerTransport
  ): Promise<void> => {
    // Ensure cleanup on close removes from the store
    const previousOnClose = transport.onclose;

    transport.onclose = () => {
      try {
        if (typeof previousOnClose === 'function') {
          previousOnClose();
        }
      } finally {
        remove(sessionId);
      }
    };

    // Store locally in LRU
    lruStore.set(sessionId, transport);

    if (redisClient && parsed.type === 'redis') {
      const redisOptions = parsed as RedisTransportStoreOptions;

      try {
        // Mirror presence with PX TTL
        const ttlMs = redisOptions.ttlMs ?? defaultRedisOptions.ttlMs!;
        const key = generateRedisKey({ options: redisOptions, sessionId });

        await redisClient.set(key, '1', 'PX', ttlMs);
      } catch (error) {
        // Best-effort Redis operation; log but don't throw to maintain local functionality
        console.warn(
          'Failed to set Redis session presence:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  };

  const get = async (sessionId?: string): Promise<GetResult> => {
    if (!sessionId) {
      return { type: 'none' };
    }

    let session = lruStore.get(sessionId);

    if (!session && redisClient && parsed.type === 'redis') {
      // Hint: Redis mirrors only session presence (not the transport object).
      // If the local store was missed (process restart/eviction), re-check Redis
      // and synthesize a lightweight transport bound to the same session id.
      // This rehydrates the local store and avoids spurious 400s on valid sessions.
      const redisOptions = parsed as RedisTransportStoreOptions;

      try {
        const key = generateRedisKey({ options: redisOptions, sessionId });
        const exists = await redisClient.get(key);

        if (exists) {
          session = createTransport({
            sessionIdGenerator: () => sessionId,
            onsessioninitialized: () => {},
          });

          await set(sessionId, session);

          return { type: 'regenerated', transport: session };
        }
      } catch (error) {
        // Redis lookup failed; log but continue with local-only behavior
        console.warn(
          'Failed to check Redis session presence:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    return session ? { type: 'existing', transport: session } : { type: 'none' };
  };

  const remove = (sessionId: string): void => {
    lruStore.delete(sessionId);

    if (redisClient && parsed.type === 'redis') {
      try {
        const key = generateRedisKey({ options: parsed as RedisTransportStoreOptions, sessionId });
        redisClient.del(key).catch((error) => {
          // Log Redis deletion errors but don't throw
          console.warn(
            'Failed to delete Redis session:',
            error instanceof Error ? error.message : 'Unknown error'
          );
        });
      } catch (error) {
        // Log Redis operation errors but don't throw
        console.warn(
          'Failed to initiate Redis session deletion:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }
  };

  const createTransport = (options: CreateTransportOptions = {}) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: options.sessionIdGenerator,
      onsessioninitialized: (sessionId: string) => {
        set(sessionId, transport);

        if (typeof options.onsessioninitialized === 'function') {
          try {
            options.onsessioninitialized(sessionId);
          } catch {
            // ignore user callback errors to not break store behavior
          }
        }
      },
    });

    // Ensure cleanup if closed after session established
    const previousOnClose = transport.onclose;

    transport.onclose = () => {
      try {
        if (typeof previousOnClose === 'function') {
          previousOnClose();
        }
      } finally {
        if (transport.sessionId) {
          remove(transport.sessionId);
        }
      }
    };

    return transport;
  };

  return {
    get,
    set,
    delete: remove,
    size: () => lruStore.size,
    createTransport,
  };
}
