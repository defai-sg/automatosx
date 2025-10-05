/**
 * Logger Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SimpleLogger, createLogger } from '../../src/utils/logger.js';

describe('SimpleLogger', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleSpy: {
    log: any;
    warn: any;
    error: any;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {})
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.error.mockRestore();
  });

  describe('Log Levels', () => {
    it('should log debug messages', () => {
      const logger = new SimpleLogger({ level: 'debug' });
      logger.debug('Debug message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Debug message'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('DEBUG'));
    });

    it('should log info messages', () => {
      const logger = new SimpleLogger({ level: 'info' });
      logger.info('Info message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Info message'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('INFO'));
    });

    it('should log warn messages', () => {
      const logger = new SimpleLogger({ level: 'info' });
      logger.warn('Warning message');

      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
      expect(consoleSpy.warn).toHaveBeenCalledWith(expect.stringContaining('WARN'));
    });

    it('should log error messages', () => {
      const logger = new SimpleLogger({ level: 'info' });
      logger.error('Error message');

      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('Error message'));
      expect(consoleSpy.error).toHaveBeenCalledWith(expect.stringContaining('ERROR'));
    });
  });

  describe('Log Level Filtering', () => {
    it('should not log debug when level is info', () => {
      const logger = new SimpleLogger({ level: 'info' });
      logger.debug('Debug message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should not log info when level is warn', () => {
      const logger = new SimpleLogger({ level: 'warn' });
      logger.info('Info message');

      expect(consoleSpy.log).not.toHaveBeenCalled();
    });

    it('should not log warn when level is error', () => {
      const logger = new SimpleLogger({ level: 'error' });
      logger.warn('Warning message');

      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });

    it('should log all levels when level is debug', () => {
      const logger = new SimpleLogger({ level: 'debug' });

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      expect(consoleSpy.log).toHaveBeenCalledTimes(2); // debug + info
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('Context', () => {
    it('should include context in log output', () => {
      const logger = new SimpleLogger({ level: 'info' });
      const context = { userId: 123, action: 'test' };

      logger.info('Test message', context);

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('userId'));
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('123'));
    });

    it('should work without context', () => {
      const logger = new SimpleLogger({ level: 'info' });

      logger.info('Test message');

      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
    });
  });

  describe('Configuration', () => {
    it('should use default level "info" when not specified', () => {
      const logger = new SimpleLogger();

      logger.debug('Debug');
      logger.info('Info');

      expect(consoleSpy.log).toHaveBeenCalledTimes(1); // Only info, not debug
    });

    it('should disable console output when console is false', () => {
      const logger = new SimpleLogger({ level: 'info', console: false });

      logger.info('Test');
      logger.warn('Test');
      logger.error('Test');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it('should enable console output by default', () => {
      const logger = new SimpleLogger({ level: 'info' });

      logger.info('Test');

      expect(consoleSpy.log).toHaveBeenCalled();
    });
  });

  describe('Factory Function', () => {
    it('should create logger with custom config', () => {
      const logger = createLogger({ level: 'warn' });

      logger.info('Info');
      logger.warn('Warn');

      expect(consoleSpy.log).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalled();
    });
  });

  describe('Timestamp', () => {
    it('should include timestamp in log output', () => {
      const logger = new SimpleLogger({ level: 'info' });

      logger.info('Test');

      // Check for ISO timestamp format (e.g., "2025-10-04T...")
      expect(consoleSpy.log).toHaveBeenCalledWith(expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/));
    });
  });

  describe('Color Codes', () => {
    it('should include color codes in output', () => {
      const logger = new SimpleLogger({ level: 'debug' });

      logger.debug('Debug');
      logger.info('Info');
      logger.warn('Warn');
      logger.error('Error');

      // Check for ANSI color codes (e.g., \x1b[36m for cyan)
      expect(consoleSpy.log.mock.calls.some((call: unknown[]) =>
        typeof call[0] === 'string' && call[0].includes('\x1b[')
      )).toBe(true);
    });
  });
});
