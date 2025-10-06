/**
 * Config Command Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { configCommand } from '../../src/cli/commands/config.js';
import { DEFAULT_CONFIG } from '../../src/types/config.js';
import type { AutomatosXConfig } from '../../src/types/config.js';

// Mock file system
const mockFiles: Record<string, string> = {};

vi.mock('fs/promises', () => ({
  readFile: vi.fn(async (path: string) => {
    if (mockFiles[path]) {
      return mockFiles[path];
    }
    throw new Error('ENOENT: no such file or directory');
  }),
  writeFile: vi.fn(async (path: string, content: string) => {
    mockFiles[path] = content;
  }),
  access: vi.fn(async (path: string) => {
    if (!mockFiles[path]) {
      throw new Error('ENOENT: no such file or directory');
    }
  })
}));

// Mock process.cwd
vi.stubGlobal('process', {
  ...process,
  cwd: () => '/test-project',
  exit: vi.fn()
});

describe('Config Command', () => {
  beforeEach(() => {
    // Clear mock files
    Object.keys(mockFiles).forEach(key => delete mockFiles[key]);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clear mock files
    Object.keys(mockFiles).forEach(key => delete mockFiles[key]);
  });

  describe('handler', () => {
    it('should show error if config file not found', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should list configuration', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        $schema: 'https://automatosx.dev/schema/config.json',
        version: '4.0.0'
      };

      // Use .automatosx/config.json (new priority)
      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        list: true,
        reset: false,
        verbose: false
      } as any);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Configuration');
      expect(output).toContain('Providers');
      expect(output).toContain('Memory');
      expect(output).toContain('Logging');

      consoleSpy.mockRestore();
    });

    it('should get configuration value', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        logging: {
          ...DEFAULT_CONFIG.logging,
          level: 'debug' as const
        }
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        get: 'logging.level',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(consoleSpy).toHaveBeenCalledWith('debug');

      consoleSpy.mockRestore();
    });

    it('should get nested object value', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        get: 'logging',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls[0]?.[0];
      expect(output).toBeDefined();
      expect(output).toContain('level');

      consoleSpy.mockRestore();
    });

    it('should set configuration value', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        set: 'logging.level',
        value: 'debug',
        list: false,
        reset: false,
        verbose: false
      } as any);

      // Read updated config
      const updatedContent = mockFiles['/test-project/.automatosx/config.json'];
      const updatedConfig = JSON.parse(updatedContent);

      expect(updatedConfig.logging.level).toBe('debug');
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should set numeric value', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        set: 'memory.maxEntries',
        value: '20000',
        list: false,
        reset: false,
        verbose: false
      } as any);

      // Read updated config
      const updatedContent = mockFiles['/test-project/.automatosx/config.json'];
      const updatedConfig = JSON.parse(updatedContent);

      expect(updatedConfig.memory.maxEntries).toBe(20000);

      consoleSpy.mockRestore();
    });

    it('should set boolean value', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        set: 'workspace.isolation',
        value: 'false',
        list: false,
        reset: false,
        verbose: false
      } as any);

      // Read updated config
      const updatedContent = mockFiles['/test-project/.automatosx/config.json'];
      const updatedConfig = JSON.parse(updatedContent);

      expect(updatedConfig.workspace.isolation).toBe(false);

      consoleSpy.mockRestore();
    });

    it('should reset configuration to defaults', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        logging: {
          ...DEFAULT_CONFIG.logging,
          level: 'debug' as const
        }
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        reset: true,
        list: false,
        verbose: false
      } as any);

      // Read reset config (should be written to the same path it was loaded from)
      const resetContent = mockFiles['/test-project/.automatosx/config.json'];
      const resetConfig = JSON.parse(resetContent);

      expect(resetConfig.logging.level).toBe(DEFAULT_CONFIG.logging.level);
      expect(resetConfig.$schema).toBe('https://automatosx.dev/schema/config.json');
      expect(resetConfig.version).toBe('4.0.0');

      consoleSpy.mockRestore();
    });

    it('should show error for invalid key in get', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        get: 'invalid.key',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should show error for invalid key in set', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        set: 'invalid.key',
        value: 'test',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should show error when --set without --value', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        set: 'logging.level',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should show config path when no options provided', async () => {
      const config = {
        ...DEFAULT_CONFIG
      };

      mockFiles['/test-project/.automatosx/config.json'] = JSON.stringify(config);

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await configCommand.handler?.({
        _: [],
        $0: 'automatosx',
        list: false,
        reset: false,
        verbose: false
      } as any);

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map(call => call[0]).join('\n');
      expect(output).toContain('Configuration file');
      expect(output).toContain('.automatosx/config.json');

      consoleSpy.mockRestore();
    });
  });
});
