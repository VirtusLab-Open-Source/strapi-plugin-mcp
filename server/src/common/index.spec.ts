import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { describe, expect, it, vi } from 'vitest';
import { ZodRawShape } from 'zod';

import { McpToolDefinition, registerTool } from '.';

// Minimal shape to satisfy the call in tests
interface FakeMcpServer {
  tool: (...args: any[]) => void;
}

describe('applyTool', () => {
  it('registers tool with only callback', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<any> = {
      name: 'only-callback',
      callback: vi.fn(),
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith('only-callback', expect.any(Function));
  });

  it('registers tool with argsSchema', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-args',
      callback: vi.fn(),
      argsSchema: {},
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith('with-args', expect.any(Object), expect.any(Function));
  });

  it('registers tool with description and argsSchema', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-desc-args',
      callback: vi.fn(),
      argsSchema: {},
      description: 'desc',
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith(
      'with-desc-args',
      'desc',
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('registers tool with description, argsSchema, and annotations', () => {
    // Given
    const toolSpy = vi.fn();
    const server: FakeMcpServer = { tool: toolSpy };
    const tool: McpToolDefinition<ZodRawShape> = {
      name: 'with-all',
      callback: vi.fn(),
      argsSchema: {},
      description: 'desc',
      annotations: {},
    };

    // When
    registerTool({ server: server as unknown as McpServer, tool });

    // Then
    expect(toolSpy).toHaveBeenCalledWith(
      'with-all',
      'desc',
      expect.any(Object),
      expect.any(Object),
      expect.any(Function)
    );
  });
});
