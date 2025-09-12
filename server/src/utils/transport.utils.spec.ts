// Helper to create a fake transport-like object by using the real class but avoiding network
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Redis } from 'ioredis';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTransportStore } from './transport.utils';

// Mock strapi object
const mockStrapi = {
  log: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
} as any;

vi.mock('ioredis', () => {
  return {
    Redis: vi.fn(),
  };
});

describe('createTransportStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates configuration and throws on invalid options', () => {
    // Given/When/Then - invalid configuration should throw at schema validation level
    expect(() => createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'invalid' } as any 
    })).toThrow();
    
    // Extended schema validation for transport-specific options
    expect(() => createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'memory', max: -5 } 
    })).toThrow();
    
    // Invalid URL format should be handled gracefully (no throw due to graceful error handling)
    expect(() => createTransportStore({ 
      strapi: mockStrapi,
      options: { 
        type: 'redis', 
        connection: 'invalid-url'
      }
    })).not.toThrow(); // Graceful fallback to LRU
  });

  it('handles missing Redis configuration gracefully', () => {
    // Given/When - Redis type with no connection info should not throw (graceful fallback to LRU)
    expect(() => createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'redis' } 
    })).not.toThrow();
    
    // Then - should create store that works with LRU fallback
    const store = createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'redis' } 
    });
    expect(store.size()).toBe(0);
  });

  it('stores and retrieves transports, cleans on close', async () => {
    // Given
    const store = createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'memory' } 
    });
    const t = new StreamableHTTPServerTransport({} as any);

    // When
    store.set('s1', t);

    // Then
    const result = await store.get('s1');
    expect(result.type).toBe('existing');
    if (result.type === 'existing') {
      expect(result.transport).toBe(t);
    }
    expect(store.size()).toBe(1);

    // When: close triggers deletion
    t.onclose?.();

    // Then
    const resultAfterClose = await store.get('s1');
    expect(resultAfterClose.type).toBe('none');
    expect(store.size()).toBe(0);
  });

  it('creates transport and auto-registers on session initialized', async () => {
    // Given
    const store = createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'memory' } 
    });
    const onInit = vi.fn();
    const transport = store.createTransport({
      sessionIdGenerator: () => 'gen-1',
      onsessioninitialized: onInit,
    });

    // When: simulate session init via internal hook
    (transport as any)._onsessioninitialized?.('sess-123');

    // Then
    const result = await store.get('sess-123');
    expect(result.type).toBe('existing');
    if (result.type === 'existing') {
      expect(result.transport).toBe(transport);
    }
    expect(onInit).toHaveBeenCalledWith('sess-123');

    // Cleanup on close
    transport.onclose?.();
    const resultAfterClose = await store.get('sess-123');
    expect(resultAfterClose.type).toBe('none');
  });

  it('uses LRU cache with max and ttl, and cleans on close', async () => {
    // Given
    const store = createTransportStore({ 
      strapi: mockStrapi, 
      options: { type: 'memory', max: 2, ttlMs: 100, updateAgeOnGet: true } 
    });
    const t1 = new StreamableHTTPServerTransport({} as any);
    const t2 = new StreamableHTTPServerTransport({} as any);
    const t3 = new StreamableHTTPServerTransport({} as any);

    // When
    store.set('a', t1);
    store.set('b', t2);

    // Access 'a' to refresh its age
    const resultA1 = await store.get('a');
    expect(resultA1.type).toBe('existing');
    if (resultA1.type === 'existing') {
      expect(resultA1.transport).toBe(t1);
    }

    // Insert third to evict least-recently-used ('b')
    store.set('c', t3);

    // Then
    const resultA2 = await store.get('a');
    expect(resultA2.type).toBe('existing');
    if (resultA2.type === 'existing') {
      expect(resultA2.transport).toBe(t1);
    }
    
    const resultB = await store.get('b');
    expect(resultB.type).toBe('none');
    
    const resultC = await store.get('c');
    expect(resultC.type).toBe('existing');
    if (resultC.type === 'existing') {
      expect(resultC.transport).toBe(t3);
    }

    // Close should remove from store
    t1.onclose?.();
    const resultA3 = await store.get('a');
    expect(resultA3.type).toBe('none');
  });

  it('handles Redis connection failures gracefully', async () => {
    // Given
    const mockRedis = {
      on: vi.fn(),
      ping: vi.fn(async () => {
        throw new Error('Connection failed');
      }),
    };
    (Redis as unknown as Mock).mockReturnValue(mockRedis);

    // When - should not throw despite Redis connection failure
    const store = createTransportStore({
      strapi: mockStrapi,
      options: {
        type: 'redis',
        connection: 'redis://localhost:6379',
      },
    });

    // Then - store should still work with LRU fallback
    expect(store.size()).toBe(0);
    const result = await store.get('nonexistent');
    expect(result.type).toBe('none');
  });

  it('handles Redis operation failures gracefully during set/get', async () => {
    // Given
    const redisSet = vi.fn(async () => {
      throw new Error('Redis set failed');
    });
    const redisGet = vi.fn(async () => {
      throw new Error('Redis get failed');
    });
    const client = {
      set: redisSet,
      get: redisGet,
      del: vi.fn(),
      on: vi.fn(),
      ping: vi.fn(async () => 'PONG'),
    } as any;
    (Redis as unknown as Mock).mockReturnValue(client);

    const store = createTransportStore({
      strapi: mockStrapi,
      options: {
        type: 'redis',
        connection: 'redis://localhost:6379',
      },
    });
    const transport = new StreamableHTTPServerTransport({} as any);

    // When - Redis operations fail but should not throw
    await expect(store.set('test-session', transport)).resolves.not.toThrow();
    
    // Then - should still work with local LRU
    const result = await store.get('test-session');
    expect(result.type).toBe('existing');
    if (result.type === 'existing') {
      expect(result.transport).toBe(transport);
    }
  });

  it('mirrors presence to Redis when in redis mode', async () => {
    // Given
    const registry: Record<string, any> = {};
    const redisSet = vi.fn(async (key, value) => {
      registry[key] = value;

      return 'ok';
    });
    const redisDel = vi.fn(async (key) => {
      delete registry[key];

      return 1;
    });
    const redisGet = vi.fn(async (key) => registry[key]);
    const client = { 
      set: redisSet, 
      del: redisDel, 
      get: redisGet,
      on: vi.fn(),
      ping: vi.fn(async () => 'PONG'),
    } as any;

    (Redis as unknown as Mock).mockReturnValue(client);

    const store = createTransportStore({
      strapi: mockStrapi,
      options: {
        type: 'redis',
        ttlMs: 100,
        keyPrefix: 'test:',
        connection: 'redis://localhost:6379',
      },
    });
    const t = new StreamableHTTPServerTransport({} as any);

    // When
    store.set('sess', t);

    // Then: local get works and redis set called with PX ttl
    const result = await store.get('sess');
    expect(result.type).toBe('existing');
    if (result.type === 'existing') {
      expect(result.transport).toBe(t);
    }
    expect(store.size()).toBe(1);
    expect(redisSet).toHaveBeenCalledWith('test:sess', '1', 'PX', 100);

    // When: closing transport removes from store and calls redis del
    t.onclose?.();

    // Then
    const resultAfterClose = await store.get('sess');
    expect(resultAfterClose.type).toBe('none');
    expect(redisDel).toHaveBeenCalledWith('test:sess');
  });
});
