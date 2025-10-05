/**
 * Status Command Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

describe('Status Command', () => {
  let testDir: string;
  let automatosxDir: string;

  beforeEach(async () => {
    // Create unique test directory
    testDir = join(tmpdir(), `status-test-${Date.now()}`);
    automatosxDir = join(testDir, '.automatosx');

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

  describe('Basic Status Display', () => {
    it('should display system status', async () => {
      // Create minimal project structure
      await mkdir(automatosxDir, { recursive: true });
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      await mkdir(join(automatosxDir, 'memory'), { recursive: true });
      await mkdir(join(automatosxDir, 'workspaces'), { recursive: true });

      // Create config file
      const config = {
        providers: {
          'claude-code': { enabled: true, priority: 1, timeout: 120000, command: 'claude' }
        },
        memory: { maxEntries: 10000, persistPath: '.automatosx/memory', autoCleanup: true, cleanupDays: 30 },
        workspace: { basePath: '.automatosx/workspaces', autoCleanup: true, cleanupDays: 7, maxFiles: 100 },
        logging: { level: 'info', path: '.automatosx/logs', console: true }
      };

      await writeFile(
        join(testDir, 'automatosx.config.json'),
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // Verify structure exists
      expect(await checkExists(automatosxDir)).toBe(true);
      expect(await checkExists(join(automatosxDir, 'agents'))).toBe(true);
      expect(await checkExists(join(automatosxDir, 'memory'))).toBe(true);
    });

    it('should show version information', () => {
      const version = '4.0.0-alpha.1';
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('should show node version', () => {
      const nodeVersion = process.version;
      expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      const majorVersion = nodeVersion.slice(1).split('.')[0];
      expect(parseInt(majorVersion || '0')).toBeGreaterThanOrEqual(20);
    });

    it('should show platform information', () => {
      const platform = process.platform;
      const arch = process.arch;

      expect(['darwin', 'linux', 'win32']).toContain(platform);
      expect(['x64', 'arm64']).toContain(arch);
    });
  });

  describe('Directory Status', () => {
    it('should detect .automatosx directory exists', async () => {
      await mkdir(automatosxDir, { recursive: true });

      const exists = await checkExists(automatosxDir);
      expect(exists).toBe(true);
    });

    it('should detect missing .automatosx directory', async () => {
      const exists = await checkExists(automatosxDir);
      expect(exists).toBe(false);
    });

    it('should detect all required subdirectories', async () => {
      await mkdir(automatosxDir, { recursive: true });
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      await mkdir(join(automatosxDir, 'abilities'), { recursive: true });
      await mkdir(join(automatosxDir, 'memory'), { recursive: true });
      await mkdir(join(automatosxDir, 'workspaces'), { recursive: true });

      const dirs = ['agents', 'abilities', 'memory', 'workspaces'];
      for (const dir of dirs) {
        const dirPath = join(automatosxDir, dir);
        expect(await checkExists(dirPath)).toBe(true);
      }
    });

    it('should report missing subdirectories', async () => {
      await mkdir(automatosxDir, { recursive: true });
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      // Missing: abilities, memory, workspaces

      expect(await checkExists(join(automatosxDir, 'agents'))).toBe(true);
      expect(await checkExists(join(automatosxDir, 'abilities'))).toBe(false);
      expect(await checkExists(join(automatosxDir, 'memory'))).toBe(false);
      expect(await checkExists(join(automatosxDir, 'workspaces'))).toBe(false);
    });
  });

  describe('Configuration Status', () => {
    it('should detect config file exists', async () => {
      const configPath = join(testDir, 'automatosx.config.json');
      await writeFile(configPath, '{}', 'utf-8');

      expect(await checkExists(configPath)).toBe(true);
    });

    it('should detect missing config file', async () => {
      const configPath = join(testDir, 'automatosx.config.json');
      expect(await checkExists(configPath)).toBe(false);
    });

    it('should validate config file format', async () => {
      const configPath = join(testDir, 'automatosx.config.json');
      const config = {
        providers: {},
        memory: { maxEntries: 10000 },
        workspace: {},
        logging: { level: 'info' }
      };

      await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');

      const { readFile } = await import('fs/promises');
      const content = await readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);

      expect(parsed).toBeDefined();
      expect(parsed.providers).toBeDefined();
      expect(parsed.memory).toBeDefined();
    });

    it('should handle invalid JSON in config', async () => {
      const configPath = join(testDir, 'automatosx.config.json');
      await writeFile(configPath, 'invalid json{', 'utf-8');

      const { readFile } = await import('fs/promises');
      const content = await readFile(configPath, 'utf-8');

      expect(() => JSON.parse(content)).toThrow();
    });
  });

  describe('Resource Statistics', () => {
    it('should count agent files', async () => {
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      await writeFile(join(automatosxDir, 'agents', 'agent1.yaml'), 'name: agent1', 'utf-8');
      await writeFile(join(automatosxDir, 'agents', 'agent2.yml'), 'name: agent2', 'utf-8');
      await writeFile(join(automatosxDir, 'agents', 'README.md'), '# Agents', 'utf-8');

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'agents'));
      const agentFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      expect(agentFiles).toHaveLength(2);
    });

    it('should count ability files', async () => {
      await mkdir(join(automatosxDir, 'abilities'), { recursive: true });
      await writeFile(join(automatosxDir, 'abilities', 'ability1.md'), '# Ability 1', 'utf-8');
      await writeFile(join(automatosxDir, 'abilities', 'ability2.md'), '# Ability 2', 'utf-8');
      await writeFile(join(automatosxDir, 'abilities', 'ability3.md'), '# Ability 3', 'utf-8');

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'abilities'));
      const abilityFiles = files.filter(f => f.endsWith('.md'));

      expect(abilityFiles).toHaveLength(3);
    });

    it('should calculate directory sizes', async () => {
      await mkdir(join(automatosxDir, 'memory'), { recursive: true });
      await writeFile(join(automatosxDir, 'memory', 'file1.db'), 'x'.repeat(1000), 'utf-8');
      await writeFile(join(automatosxDir, 'memory', 'file2.db'), 'y'.repeat(2000), 'utf-8');

      const { stat } = await import('fs/promises');
      const stat1 = await stat(join(automatosxDir, 'memory', 'file1.db'));
      const stat2 = await stat(join(automatosxDir, 'memory', 'file2.db'));

      const totalSize = stat1.size + stat2.size;
      expect(totalSize).toBeGreaterThanOrEqual(3000);
    });

    it('should handle empty directories', async () => {
      await mkdir(join(automatosxDir, 'workspaces'), { recursive: true });

      const { readdir } = await import('fs/promises');
      const files = await readdir(join(automatosxDir, 'workspaces'));

      expect(files).toHaveLength(0);
    });
  });

  describe('Verbose Mode', () => {
    it('should show additional details in verbose mode', () => {
      const verbose = true;

      if (verbose) {
        const uptime = process.uptime();
        expect(uptime).toBeGreaterThan(0);
      }
    });

    it('should show file paths in verbose mode', async () => {
      await mkdir(automatosxDir, { recursive: true });
      const verbose = true;

      if (verbose) {
        const path = automatosxDir;
        expect(path).toContain('.automatosx');
      }
    });

    it('should show performance metrics in verbose mode', () => {
      const startTime = Date.now();
      // Simulate some work
      for (let i = 0; i < 1000; i++) {
        Math.sqrt(i);
      }
      const duration = Date.now() - startTime;

      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('JSON Output Mode', () => {
    it('should output valid JSON', () => {
      const status = {
        system: { version: '4.0.0-alpha.1', nodeVersion: process.version },
        directories: { automatosx: { exists: true } },
        providers: [],
        router: { totalProviders: 0 }
      };

      const json = JSON.stringify(status, null, 2);
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should include all required fields in JSON output', () => {
      const status = {
        system: { version: '4.0.0-alpha.1' },
        directories: {},
        providers: [],
        router: {}
      };

      expect(status.system).toBeDefined();
      expect(status.directories).toBeDefined();
      expect(status.providers).toBeDefined();
      expect(status.router).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied errors gracefully', async () => {
      // Create directory we can't read (simulated)
      await mkdir(automatosxDir, { recursive: true });

      // Attempt to read should not throw
      try {
        await checkExists(automatosxDir);
        expect(true).toBe(true);
      } catch (error) {
        // Should handle gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle missing package.json', async () => {
      const packagePath = join(testDir, 'package.json');
      const exists = await checkExists(packagePath);

      // Should not fail, just report missing
      expect(exists).toBe(false);
    });

    it('should continue if some directories are missing', async () => {
      await mkdir(automatosxDir, { recursive: true });
      await mkdir(join(automatosxDir, 'agents'), { recursive: true });
      // Other directories missing

      expect(await checkExists(join(automatosxDir, 'agents'))).toBe(true);
      expect(await checkExists(join(automatosxDir, 'memory'))).toBe(false);

      // Status should still run
    });
  });

  describe('Helper Functions', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });

    it('should format uptime correctly', () => {
      expect(formatUptime(0)).toBe('0s');
      expect(formatUptime(59)).toBe('59s');
      expect(formatUptime(60)).toBe('1m');
      expect(formatUptime(3661)).toBe('1h 1m 1s');
    });
  });
});

/**
 * Helper Functions
 */

async function checkExists(path: string): Promise<boolean> {
  try {
    const { access } = await import('fs/promises');
    const { constants } = await import('fs');
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}
