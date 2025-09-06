import { faker } from '@faker-js/faker';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTransportStore } from '../utils';
import eventsController from './events.controller';

// Mock the transport store to observe interactions
vi.mock('../utils', () => {
  return {
    createTransportStore: vi.fn(),
  };
});

// Mock MCP server to prevent real behavior
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  return {
    McpServer: vi.fn(() => ({
      connect: vi.fn(async () => undefined),
    })),
  };
});

// Control initialize request detection
vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  isInitializeRequest: vi.fn(() => false),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function createStrapi() {
  return {
    plugin() {
      return {
        service() {
          return { addTools: vi.fn() };
        },
      };
    },
    config: {
      get: vi.fn(() => ({
        session: {
          type: 'memory',
        },
      })),
    },
  } as any;
}

function createCtx({ sessionId, body }: { sessionId?: string; body?: any } = {}) {
  const headers: Record<string, string> = {};
  if (sessionId) headers['mcp-session-id'] = sessionId;
  return {
    headers,
    request: { body },
    req: {} as any,
    res: { headersSent: false } as any,
    status: undefined as any,
    body: undefined as any,
  };
}

describe('eventsController', () => {
  it('postStreamable initializes transport when no session and initialize request', async () => {
    // Given
    (isInitializeRequest as any).mockReturnValue(true);
    const handleRequest = vi.fn(async () => undefined);
    const transport = { handleRequest, onclose: undefined as any, sessionId: undefined } as any;
    const store = {
      get: vi.fn(() => undefined),
      set: vi.fn(),
      delete: vi.fn(),
      size: vi.fn(() => 0),
      createTransport: vi.fn(() => transport),
    };
    (createTransportStore as any).mockReturnValue(store);

    const ctrl = eventsController({ strapi: createStrapi() } as any);
    const ctx = createCtx({ body: { jsonrpc: '2.0', method: 'initialize', id: faker.number.int() } });

    // When
    await ctrl.postStreamable(ctx as any);

    // Then
    expect(store.createTransport).toHaveBeenCalledTimes(1);
    expect(handleRequest).toHaveBeenCalledWith(ctx.req, ctx.res, ctx.request.body);
  });

  it('getStreamable returns 400 when sessionId missing or not found', async () => {
    // Given
    const store = {
      get: vi.fn(() => ({ type: 'none' })),
      set: vi.fn(),
      delete: vi.fn(),
      size: vi.fn(() => 0),
      createTransport: vi.fn(),
    };
    (createTransportStore as any).mockReturnValue(store);
    const ctrl = eventsController({ strapi: createStrapi() } as any);
    const ctx = createCtx();

    // When
    await ctrl.getStreamable(ctx as any);

    // Then
    expect(ctx.status).toBe(400);
    expect(ctx.body?.error?.message).toBe('Invalid or missing session ID');
  });

  it('getStreamable delegates to transport when session exists', async () => {
    // Given
    const handleRequest = vi.fn(async () => undefined);
    const transport = { handleRequest } as any;
    const store = {
      get: vi.fn(() => ({ type: 'existing', transport })),
      set: vi.fn(),
      delete: vi.fn(),
      size: vi.fn(() => 1),
      createTransport: vi.fn(),
    };
    (createTransportStore as any).mockReturnValue(store);
    const ctrl = eventsController({ strapi: createStrapi() } as any);
    const sessionId = faker.string.uuid();
    const ctx = createCtx({ sessionId });

    // When
    await ctrl.getStreamable(ctx as any);

    // Then
    expect(store.get).toHaveBeenCalledWith(sessionId);
    expect(handleRequest).toHaveBeenCalledWith(ctx.req, ctx.res);
  });
});
