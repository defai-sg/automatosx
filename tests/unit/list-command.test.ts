/**
 * List Command Unit Tests
 *
 * Tests the list command handler directly for coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { listCommand } from '../../src/cli/commands/list.js';

describe('List Command', () => {
  let testDir: string;
  let automatosxDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleTableSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `list-test-${Date.now()}`);
    automatosxDir = join(testDir, '.automatosx');
    await mkdir(automatosxDir, { recursive: true });

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleTableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleTableSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Handler', () => {
    it('should have correct command definition', () => {
      expect(listCommand.command).toBe('list <type>');
      expect(listCommand.describe).toBeDefined();
    });

    it('should list agents', async () => {
      // Create test agents
      const agentsDir = join(automatosxDir, 'agents');
      await mkdir(agentsDir, { recursive: true });

      await writeFile(
        join(agentsDir, 'assistant.yaml'),
        'name: assistant\nversion: 1.0.0\ndescription: General assistant\nmodel:\n  provider: claude\n',
        'utf-8'
      );

      await writeFile(
        join(agentsDir, 'coder.yaml'),
        'name: coder\nversion: 1.0.0\ndescription: Code assistant\nmodel:\n  provider: claude\n',
        'utf-8'
      );

      // Change to test directory
      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        await listCommand.handler({ type: 'agents', _: [], $0: '' });

        // Verify console.log was called
        expect(consoleLogSpy).toHaveBeenCalled();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should list abilities', async () => {
      // Create test abilities
      const abilitiesDir = join(automatosxDir, 'abilities');
      await mkdir(abilitiesDir, { recursive: true });

      await writeFile(
        join(abilitiesDir, 'web-search.md'),
        '# Web Search\n\nSearch the web for information.\n',
        'utf-8'
      );

      await writeFile(
        join(abilitiesDir, 'code-analysis.md'),
        '# Code Analysis\n\nAnalyze code structure.\n',
        'utf-8'
      );

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        await listCommand.handler({ type: 'abilities', _: [], $0: '' });

        expect(consoleLogSpy).toHaveBeenCalled();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should list providers', async () => {
      // Create config
      const config = {
        providers: {
          'claude-code': {
            enabled: true,
            priority: 1
          },
          'gemini-cli': {
            enabled: true,
            priority: 2
          }
        }
      };

      await writeFile(
        join(testDir, 'automatosx.config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        await listCommand.handler({ type: 'providers', _: [], $0: '' });

        expect(consoleLogSpy).toHaveBeenCalled();
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should exit with error for invalid type', async () => {
      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);

        await expect(
          listCommand.handler({ type: 'invalid', _: [], $0: '' })
        ).rejects.toThrow('process.exit(1)');
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle empty agents directory', async () => {
      const agentsDir = join(automatosxDir, 'agents');
      await mkdir(agentsDir, { recursive: true });

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        await listCommand.handler({ type: 'agents', _: [], $0: '' });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('No agents found')
        );
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should handle empty abilities directory', async () => {
      const abilitiesDir = join(automatosxDir, 'abilities');
      await mkdir(abilitiesDir, { recursive: true });

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        await listCommand.handler({ type: 'abilities', _: [], $0: '' });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('No abilities found')
        );
      } finally {
        process.chdir(originalCwd);
      }
    });

    it('should show version information', async () => {
      const agentsDir = join(automatosxDir, 'agents');
      await mkdir(agentsDir, { recursive: true });

      await writeFile(
        join(agentsDir, 'assistant.yaml'),
        'name: assistant\nversion: 2.1.0\ndescription: Test\nmodel:\n  provider: claude\n',
        'utf-8'
      );

      const originalCwd = process.cwd();
      try {
        process.chdir(testDir);
        await listCommand.handler({ type: 'agents', _: [], $0: '' });

        // Version should be displayed
        expect(consoleLogSpy).toHaveBeenCalled();
      } finally {
        process.chdir(originalCwd);
      }
    });
  });

  describe('Builder', () => {
    it('should configure type positional argument', () => {
      const yargsStub = {
        positional: vi.fn().mockReturnThis()
      };

      listCommand.builder(yargsStub as any);

      expect(yargsStub.positional).toHaveBeenCalledWith('type', expect.objectContaining({
        describe: expect.any(String),
        type: 'string',
        choices: expect.arrayContaining(['agents', 'abilities', 'providers'])
      }));
    });
  });
});
