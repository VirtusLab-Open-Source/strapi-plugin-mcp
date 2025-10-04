import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { faker } from '@faker-js/faker';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';

import { McpToolDefinition } from '../../common';
import customService from './custom.service';

describe('customService', () => {
  let service: ReturnType<typeof customService>;
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    service = customService();
    mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;
  });

  describe('registerTool', () => {
    it('allows registering a tool with minimal definition', () => {
      // Given
      const toolName = faker.word.noun();
      const toolDefinition: McpToolDefinition<{}> = {
        name: toolName,
        callback: vi.fn(),
      };

      // When & Then
      expect(() => service.registerTool(toolDefinition)).not.toThrow();
    });

    it('allows registering a tool with full definition', () => {
      // Given
      const toolName = faker.word.noun();
      const description = faker.lorem.sentence();
      const toolDefinition: McpToolDefinition<{ input: z.ZodString }> = {
        name: toolName,
        description,
        argsSchema: {
          input: z.string(),
        },
        callback: vi.fn(),
        annotations: {
          audience: ['user'],
        },
      };

      // When & Then
      expect(() => service.registerTool(toolDefinition)).not.toThrow();
    });

    it('allows registering multiple tools', () => {
      // Given
      const tool1: McpToolDefinition<{}> = {
        name: faker.word.noun(),
        callback: vi.fn(),
      };
      const tool2: McpToolDefinition<{ value: z.ZodNumber }> = {
        name: faker.word.noun(),
        description: faker.lorem.sentence(),
        argsSchema: { value: z.number() },
        callback: vi.fn(),
      };

      // When & Then
      expect(() => {
        service.registerTool(tool1);
        service.registerTool(tool2);
      }).not.toThrow();
    });
  });

  describe('addTools', () => {
    it('registers no tools when none have been registered', () => {
      // Given
      // No tools registered

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).not.toHaveBeenCalled();
    });

    it('registers a single tool with minimal definition', () => {
      // Given
      const toolName = faker.word.noun();
      const callback = vi.fn();
      const toolDefinition: McpToolDefinition<{}> = {
        name: toolName,
        callback,
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(toolName, callback);
    });

    it('registers a tool with description and args schema', () => {
      // Given
      const toolName = faker.word.noun();
      const description = faker.lorem.sentence();
      const argsSchema = { input: z.string() };
      const callback = vi.fn();
      const toolDefinition: McpToolDefinition<typeof argsSchema> = {
        name: toolName,
        description,
        argsSchema,
        callback,
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(toolName, description, argsSchema, callback);
    });

    it('registers a tool with args schema and annotations', () => {
      // Given
      const toolName = faker.word.noun();
      const argsSchema = { count: z.number() };
      const annotations = { audience: ['user'] as const };
      const callback = vi.fn();
      const toolDefinition: McpToolDefinition<typeof argsSchema> = {
        name: toolName,
        argsSchema,
        annotations,
        callback,
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(toolName, argsSchema, annotations, callback);
    });

    it('registers a tool with all optional parameters', () => {
      // Given
      const toolName = faker.word.noun();
      const description = faker.lorem.sentence();
      const argsSchema = { data: z.object({ id: z.string() }) };
      const annotations = { audience: ['user'] as const };
      const callback = vi.fn();
      const toolDefinition: McpToolDefinition<typeof argsSchema> = {
        name: toolName,
        description,
        argsSchema,
        annotations,
        callback,
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(toolName, description, argsSchema, annotations, callback);
    });

    it('registers multiple tools in order', () => {
      // Given
      const tool1Name = faker.word.noun();
      const tool2Name = faker.word.noun();
      const tool3Name = faker.word.noun();
      
      const tool1: McpToolDefinition<{}> = {
        name: tool1Name,
        callback: vi.fn(),
      };
      const tool2: McpToolDefinition<{ input: z.ZodString }> = {
        name: tool2Name,
        description: faker.lorem.sentence(),
        argsSchema: { input: z.string() },
        callback: vi.fn(),
      };
      const tool3: McpToolDefinition<{ value: z.ZodNumber }> = {
        name: tool3Name,
        argsSchema: { value: z.number() },
        callback: vi.fn(),
      };

      service.registerTool(tool1);
      service.registerTool(tool2);
      service.registerTool(tool3);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(3);
      expect(mockServer.tool).toHaveBeenNthCalledWith(1, tool1Name, tool1.callback);
      expect(mockServer.tool).toHaveBeenNthCalledWith(2, tool2Name, tool2.description, tool2.argsSchema, tool2.callback);
      expect(mockServer.tool).toHaveBeenNthCalledWith(3, tool3Name, tool3.argsSchema, tool3.callback);
    });

    it('can be called multiple times without duplicate registrations', () => {
      // Given
      const toolName = faker.word.noun();
      const toolDefinition: McpToolDefinition<{}> = {
        name: toolName,
        callback: vi.fn(),
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(2);
      expect(mockServer.tool).toHaveBeenNthCalledWith(1, toolName, toolDefinition.callback);
      expect(mockServer.tool).toHaveBeenNthCalledWith(2, toolName, toolDefinition.callback);
    });
  });

  describe('service isolation', () => {
    it('creates independent service instances', () => {
      // Given
      const service1 = customService();
      const service2 = customService();
      const tool1: McpToolDefinition<{}> = {
        name: faker.word.noun(),
        callback: vi.fn(),
      };
      const tool2: McpToolDefinition<{}> = {
        name: faker.word.noun(),
        callback: vi.fn(),
      };

      // When
      service1.registerTool(tool1);
      service2.registerTool(tool2);

      service1.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(tool1.name, tool1.callback);
    });
  });

  describe('edge cases', () => {
    it('handles tools with only args schema', () => {
      // Given
      const toolName = faker.word.noun();
      const argsSchema = { query: z.string() };
      const callback = vi.fn();
      const toolDefinition: McpToolDefinition<typeof argsSchema> = {
        name: toolName,
        argsSchema,
        callback,
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(toolName, argsSchema, callback);
    });

    it('handles tools with complex Zod schemas', () => {
      // Given
      const toolName = faker.word.noun();
      const argsSchema = {
        user: z.object({
          id: z.string(),
          email: z.string().email(),
          age: z.number().optional(),
        }),
        filters: z.array(z.string()).optional(),
      };
      const callback = vi.fn();
      const toolDefinition: McpToolDefinition<typeof argsSchema> = {
        name: toolName,
        argsSchema,
        callback,
      };
      service.registerTool(toolDefinition);

      // When
      service.addTools(mockServer);

      // Then
      expect(mockServer.tool).toHaveBeenCalledTimes(1);
      expect(mockServer.tool).toHaveBeenCalledWith(toolName, argsSchema, callback);
    });
  });
});
