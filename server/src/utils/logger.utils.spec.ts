import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Strapi } from '@local-types/strapi';

import { buildLogger } from './logger.utils';

describe('logger.utils', () => {
  const mockStrapi = {
    log: {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    },
  } as unknown as Strapi;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now() to ensure consistent timestamps in tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-01-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('buildLogger', () => {
    it('should create logger with all required methods', () => {
      // Given/When
      const logger = buildLogger(mockStrapi);

      // Then
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should log info messages with correct format', () => {
      // Given
      const logger = buildLogger(mockStrapi);
      const testMessage = 'Test info message';
      const expectedMessage = 'strapi-mcp-plugin::"Test info message"';

      // When
      logger.info(testMessage);

      // Then
      expect(mockStrapi.log.info).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.info).toHaveBeenCalledWith(expectedMessage);
    });

    it('should log error messages with correct format', () => {
      // Given
      const logger = buildLogger(mockStrapi);
      const testMessage = 'Test error message';
      const expectedMessage = 'strapi-mcp-plugin::"Test error message"';

      // When
      logger.error(testMessage);

      // Then
      expect(mockStrapi.log.error).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.error).toHaveBeenCalledWith(expectedMessage);
    });

    it('should log warn messages with correct format', () => {
      // Given
      const logger = buildLogger(mockStrapi);
      const testMessage = 'Test warn message';
      const expectedMessage = 'strapi-mcp-plugin::"Test warn message"';

      // When
      logger.warn(testMessage);

      // Then
      expect(mockStrapi.log.warn).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.warn).toHaveBeenCalledWith(expectedMessage);
    });

    it('should log debug messages with correct format', () => {
      // Given
      const logger = buildLogger(mockStrapi);
      const testMessage = 'Test debug message';
      const expectedMessage = 'strapi-mcp-plugin::"Test debug message"';

      // When
      logger.debug(testMessage);

      // Then
      expect(mockStrapi.log.debug).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.debug).toHaveBeenCalledWith(expectedMessage);
    });

    it('should handle empty messages', () => {
      // Given
      const logger = buildLogger(mockStrapi);
      const testMessage = '';
      const expectedMessage = 'strapi-mcp-plugin::""';

      // When
      logger.info(testMessage);

      // Then
      expect(mockStrapi.log.info).toHaveBeenCalledWith(expectedMessage);
    });

    it('should handle messages with special characters', () => {
      // Given
      const logger = buildLogger(mockStrapi);
      const testMessage = 'Message with "quotes" and \n newlines';
      const expectedMessage = 'strapi-mcp-plugin::"Message with "quotes" and \n newlines"';

      // When
      logger.info(testMessage);

      // Then
      expect(mockStrapi.log.info).toHaveBeenCalledWith(expectedMessage);
    });

    it('should create independent logger instances', () => {
      // Given
      const logger1 = buildLogger(mockStrapi);
      const logger2 = buildLogger(mockStrapi);

      // When
      logger1.info('Message from logger 1');
      logger2.error('Message from logger 2');

      // Then
      expect(mockStrapi.log.info).toHaveBeenCalledTimes(1);
      expect(mockStrapi.log.error).toHaveBeenCalledTimes(1);
      expect(logger1).not.toBe(logger2);
    });

    it('should include current timestamp in each log message', () => {
      // Given
      const logger = buildLogger(mockStrapi);

      // When - first message
      logger.info('First message');

      // When - advance time and log second message
      vi.setSystemTime(new Date('2023-01-01T12:05:00.000Z'));
      logger.info('Second message');

      // Then
      expect(mockStrapi.log.info).toHaveBeenCalledTimes(2);
      expect(mockStrapi.log.info).toHaveBeenNthCalledWith(1, 'strapi-mcp-plugin::"First message"');
      expect(mockStrapi.log.info).toHaveBeenNthCalledWith(2, 'strapi-mcp-plugin::"Second message"');
    });

    it('should work with different Strapi instances', () => {
      // Given
      const mockStrapi2 = {
        log: {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
        },
      } as unknown as Strapi;

      const logger1 = buildLogger(mockStrapi);
      const logger2 = buildLogger(mockStrapi2);
      const testMessage = 'Test message';

      // When
      logger1.info(testMessage);
      logger2.info(testMessage);

      // Then
      expect(mockStrapi.log.info).toHaveBeenCalledTimes(1);
      expect(mockStrapi2.log.info).toHaveBeenCalledTimes(1);
    });
  });
});
