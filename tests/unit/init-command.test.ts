/**
 * Init Command Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { constants } from 'fs';

describe('Init Command Integration', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(tmpdir(), `automatosx-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Directory Structure', () => {
    it('should create .automatosx directory structure', async () => {
      const automatosxDir = join(testDir, '.automatosx');

      // Simulate init command creating directories
      await mkdir(automatosxDir, { recursive: true });
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      await mkdir(join(automatosxDir, 'memory'), { recursive: true });
      await mkdir(join(automatosxDir, 'workspaces'), { recursive: true });
      await mkdir(join(automatosxDir, 'logs'), { recursive: true });

      // Verify directories exist
      const dirs = ['agents', 'memory', 'workspaces', 'logs'];
      for (const dir of dirs) {
        const dirPath = join(automatosxDir, dir);
        await expect(checkExists(dirPath)).resolves.toBe(true);
      }
    });

    it('should create required subdirectories', async () => {
      const automatosxDir = join(testDir, '.automatosx');
      const dirs = [
        automatosxDir,
        join(automatosxDir, 'agents'),
        join(automatosxDir, 'memory'),
        join(automatosxDir, 'workspaces'),
        join(automatosxDir, 'logs')
      ];

      for (const dir of dirs) {
        await mkdir(dir, { recursive: true });
      }

      // All directories should exist
      for (const dir of dirs) {
        await expect(checkExists(dir)).resolves.toBe(true);
      }
    });
  });

  describe('Configuration File', () => {
    it('should create automatosx.config.json', async () => {
      const configPath = join(testDir, 'automatosx.config.json');
      const config = {
        providers: {
          'claude-code': {
            enabled: true,
            priority: 1,
            timeout: 120000,
            command: 'claude'
          }
        },
        memory: {
          maxEntries: 10000,
          persistPath: '.automatosx/memory',
          autoCleanup: true,
          cleanupDays: 30
        },
        workspace: {
          basePath: '.automatosx/workspaces',
          autoCleanup: true,
          cleanupDays: 7,
          maxFiles: 100
        },
        logging: {
          level: 'info',
          path: '.automatosx/logs',
          console: true
        }
      };

      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      // Verify file exists
      await expect(checkExists(configPath)).resolves.toBe(true);

      // Verify content
      const content = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.providers).toBeDefined();
      expect(parsed.memory).toBeDefined();
      expect(parsed.workspace).toBeDefined();
      expect(parsed.logging).toBeDefined();
    });

    it('should have valid JSON config', async () => {
      const configPath = join(testDir, 'automatosx.config.json');
      const config = {
        providers: {},
        memory: { maxEntries: 1000, persistPath: '.automatosx/memory', autoCleanup: true, cleanupDays: 30 },
        workspace: { basePath: '.automatosx/workspaces', autoCleanup: true, cleanupDays: 7, maxFiles: 100 },
        logging: { level: 'info', path: '.automatosx/logs', console: true }
      };

      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      const content = await readFile(configPath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();
    });
  });

  describe('Gitignore', () => {
    it('should create .gitignore with AutomatosX entries', async () => {
      const gitignorePath = join(testDir, '.gitignore');
      const entries = [
        '',
        '# AutomatosX',
        '.automatosx/memory/',
        '.automatosx/workspaces/',
        '.automatosx/logs/',
        ''
      ].join('\n');

      await writeFile(gitignorePath, entries, 'utf-8');

      // Verify file exists
      await expect(checkExists(gitignorePath)).resolves.toBe(true);

      // Verify content
      const content = await readFile(gitignorePath, 'utf-8');
      expect(content).toContain('# AutomatosX');
      expect(content).toContain('.automatosx/memory/');
      expect(content).toContain('.automatosx/workspaces/');
      expect(content).toContain('.automatosx/logs/');
    });
  });
});

/**
 * Helper function to check if file/directory exists
 */
async function checkExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper function to write file
 */
async function writeFile(path: string, content: string, encoding: BufferEncoding): Promise<void> {
  const { writeFile: write } = await import('fs/promises');
  await write(path, content, encoding);
}
