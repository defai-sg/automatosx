/**
 * Init Command Unit Tests
 *
 * Tests the init command handler directly for coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { constants } from 'fs';
import { initCommand } from '../../src/cli/commands/init.js';

describe('Init Command', () => {
  let testDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let processExitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    testDir = join(tmpdir(), `automatosx-init-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Handler', () => {
    it('should have correct command definition', () => {
      expect(initCommand.command).toBe('init [path]');
      expect(initCommand.describe).toBeDefined();
    });

    it('should initialize project in new directory', async () => {
      await initCommand.handler({ path: testDir, force: false, _: [], $0: '' });

      // Verify .automatosx directory structure
      const automatosxDir = join(testDir, '.automatosx');
      await expect(pathExists(automatosxDir)).resolves.toBe(true);
      await expect(pathExists(join(automatosxDir, 'agents'))).resolves.toBe(true);
      await expect(pathExists(join(automatosxDir, 'abilities'))).resolves.toBe(true);
      await expect(pathExists(join(automatosxDir, 'memory'))).resolves.toBe(true);
      await expect(pathExists(join(automatosxDir, 'workspaces'))).resolves.toBe(true);
      await expect(pathExists(join(automatosxDir, 'logs'))).resolves.toBe(true);

      // Verify config file
      const configPath = join(testDir, 'automatosx.config.json');
      await expect(pathExists(configPath)).resolves.toBe(true);

      const config = JSON.parse(await readFile(configPath, 'utf-8'));
      expect(config.providers).toBeDefined();
      expect(config.memory).toBeDefined();
      expect(config.workspace).toBeDefined();
      expect(config.logging).toBeDefined();
    });

    it('should exit with error if already initialized without force', async () => {
      // First initialization
      await initCommand.handler({ path: testDir, force: false, _: [], $0: '' });

      // Try to initialize again without force
      await expect(
        initCommand.handler({ path: testDir, force: false, _: [], $0: '' })
      ).rejects.toThrow('process.exit(1)');
    });

    it('should reinitialize with --force flag', async () => {
      // First initialization
      await initCommand.handler({ path: testDir, force: false, _: [], $0: '' });

      // Reinitialize with force
      await expect(
        initCommand.handler({ path: testDir, force: true, _: [], $0: '' })
      ).resolves.not.toThrow();

      // Directory should still exist
      const automatosxDir = join(testDir, '.automatosx');
      await expect(pathExists(automatosxDir)).resolves.toBe(true);
    });

    it('should create example agents', async () => {
      await initCommand.handler({ path: testDir, force: false, _: [], $0: '' });

      const agentsDir = join(testDir, '.automatosx', 'agents');
      const agents = ['assistant.yaml', 'coder.yaml', 'reviewer.yaml'];

      for (const agent of agents) {
        await expect(pathExists(join(agentsDir, agent))).resolves.toBe(true);
      }
    });

    it('should create example abilities', async () => {
      await initCommand.handler({ path: testDir, force: false, _: [], $0: '' });

      const abilitiesDir = join(testDir, '.automatosx', 'abilities');

      // Check abilities directory exists (abilities are optional)
      await expect(pathExists(abilitiesDir)).resolves.toBe(true);
    });

    it('should create or update .gitignore', async () => {
      await initCommand.handler({ path: testDir, force: false, _: [], $0: '' });

      const gitignorePath = join(testDir, '.gitignore');
      await expect(pathExists(gitignorePath)).resolves.toBe(true);

      const content = await readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# AutomatosX');
      expect(content).toContain('.automatosx/memory/');
      expect(content).toContain('.automatosx/workspaces/');
      expect(content).toContain('.automatosx/logs/');
    });

    it('should handle error when directory creation fails', async () => {
      // Try to init in a non-existent parent directory that can't be created
      const invalidPath = '/root/cannot-create-this-path-' + Date.now();

      await expect(
        initCommand.handler({ path: invalidPath, force: false, _: [], $0: '' })
      ).rejects.toThrow();
    });
  });

  describe('Builder', () => {
    it('should configure positional path argument', () => {
      const yargsStub = {
        positional: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis()
      };

      initCommand.builder(yargsStub as any);

      expect(yargsStub.positional).toHaveBeenCalledWith('path', expect.objectContaining({
        describe: expect.any(String),
        type: 'string',
        default: '.'
      }));
    });

    it('should configure force option', () => {
      const yargsStub = {
        positional: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis()
      };

      initCommand.builder(yargsStub as any);

      expect(yargsStub.option).toHaveBeenCalledWith('force', expect.objectContaining({
        alias: 'f',
        describe: expect.any(String),
        type: 'boolean',
        default: false
      }));
    });
  });
});

/**
 * Helper: Check if path exists
 */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
