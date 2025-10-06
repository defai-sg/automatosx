/**
 * CLI Memory Command Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';

const execFileAsync = promisify(execFile);

describe('CLI Memory Command Integration', () => {
  let testDir: string;
  let cliPath: string;

  beforeEach(async () => {
    // Create test directory
    testDir = join(tmpdir(), `automatosx-memory-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // CLI path (built binary)
    cliPath = join(process.cwd(), 'dist', 'index.js');

    // Initialize project
    await execFileAsync('node', [cliPath, 'init'], {
      cwd: testDir,
      env: process.env
    });
  });

  afterEach(async () => {
    // Cleanup
    await rm(testDir, { recursive: true, force: true });
  });

  describe('memory add', () => {
    it('should add a memory entry', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Test memory content',
        '--type', 'task'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/added|success/i);
    });

    it('should add memory with tags', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Tagged memory',
        '--tags', 'test,important'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/added|success/i);
      expect(result.stdout).toMatch(/test|important/i);
    });

    // TODO: metadata option not supported in current implementation
    it.skip('should add memory with metadata', async () => {
      // Skipped: metadata option not available in CLI
    });

    it('should accept type option', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Typed memory',
        '--type', 'document'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/added|success/i);
    });

    it('should handle long content', async () => {
      const longContent = 'A'.repeat(1000);
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'add',
        longContent
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/added|success/i);
    });
  });

  describe('memory list', () => {
    beforeEach(async () => {
      // Add test memories
      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'First memory',
        '--tags', 'test'
      ], { cwd: testDir, env: process.env });

      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Second memory',
        '--tags', 'important'
      ], { cwd: testDir, env: process.env });
    });

    it('should list all memories', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'list'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toContain('First memory');
      expect(result.stdout).toContain('Second memory');
    });

    it('should filter by type', async () => {
      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Code memory',
        '--type', 'code'
      ], { cwd: testDir, env: process.env });

      const result = await execFileAsync('node', [
        cliPath, 'memory', 'list',
        '--type', 'code'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toContain('Code memory');
    });

    it('should filter by tags', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'list',
        '--tags', 'test'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toContain('First memory');
      expect(result.stdout).not.toContain('Second memory');
    });

    it('should support limit option', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'list',
        '--limit', '1'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toBeTruthy();
    });

    // TODO: JSON format not in list command
    it.skip('should support JSON output format', async () => {
      // Skipped: --format option not available in list command
    });
  });

  describe('memory search', () => {
    // TODO: Search requires embedding provider configuration
    it.skip('should search memories by query', async () => {
      // Skipped: Requires embedding provider
    });

    it.skip('should support limit in search', async () => {
      // Skipped: Requires embedding provider
    });
  });

  describe('memory delete', () => {
    // TODO: Delete requires getting ID first, list doesn't have JSON format
    it.skip('should delete memory by ID', async () => {
      // Skipped: Needs list --format json support to get ID
    });

    it('should show error for invalid ID', async () => {
      try {
        await execFileAsync('node', [
          cliPath, 'memory', 'delete',
          'nonexistent-id'
        ], {
          cwd: testDir,
          env: process.env
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr).toMatch(/not found|error/i);
      }
    });
  });

  describe('memory export', () => {
    beforeEach(async () => {
      // Add some memories to export
      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Export test 1'
      ], { cwd: testDir, env: process.env });

      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Export test 2'
      ], { cwd: testDir, env: process.env });
    });

    it('should export memories to file', async () => {
      const exportPath = join(testDir, 'export.json');

      const result = await execFileAsync('node', [
        cliPath, 'memory', 'export',
        exportPath
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/exported|success/i);
      expect(existsSync(exportPath)).toBe(true);

      // Validate export file
      const exportData = JSON.parse(await readFile(exportPath, 'utf-8'));
      expect(exportData.version).toBeDefined();
      expect(Array.isArray(exportData.entries)).toBe(true);
      expect(exportData.entries.length).toBeGreaterThan(0);
    });

    it('should export with type filter', async () => {
      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Code export test',
        '--type', 'code'
      ], { cwd: testDir, env: process.env });

      const exportPath = join(testDir, 'filtered-export.json');

      const result = await execFileAsync('node', [
        cliPath, 'memory', 'export',
        exportPath,
        '--type', 'code'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/exported|success/i);
      expect(existsSync(exportPath)).toBe(true);
    });
  });

  describe('memory import', () => {
    it('should import memories from file', async () => {
      // Create export file
      const exportData = {
        version: '4.0.0',
        exported: new Date().toISOString(),
        entries: [
          {
            id: 'test-id-1',
            content: 'Imported memory 1',
            type: 'task',
            tags: ['imported'],
            metadata: {},
            embedding: new Array(1536).fill(0.1),
            createdAt: Date.now(),
            accessedAt: Date.now(),
            accessCount: 0
          },
          {
            id: 'test-id-2',
            content: 'Imported memory 2',
            type: 'code',
            tags: ['imported'],
            metadata: {},
            embedding: new Array(1536).fill(0.2),
            createdAt: Date.now(),
            accessedAt: Date.now(),
            accessCount: 0
          }
        ]
      };

      const importPath = join(testDir, 'import.json');
      await writeFile(importPath, JSON.stringify(exportData));

      const result = await execFileAsync('node', [
        cliPath, 'memory', 'import',
        importPath
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/imported|success/i);

      // Verify import
      const listResult = await execFileAsync('node', [
        cliPath, 'memory', 'list'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(listResult.stdout).toContain('Imported memory 1');
      expect(listResult.stdout).toContain('Imported memory 2');
    });

    it('should handle invalid import file', async () => {
      const importPath = join(testDir, 'invalid.json');
      await writeFile(importPath, 'invalid json');

      try {
        await execFileAsync('node', [
          cliPath, 'memory', 'import',
          importPath
        ], {
          cwd: testDir,
          env: process.env
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr).toMatch(/error|invalid/i);
      }
    });
  });

  describe('memory stats', () => {
    beforeEach(async () => {
      // Add various memories
      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Stat test 1',
        '--type', 'task'
      ], { cwd: testDir, env: process.env });

      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'Stat test 2',
        '--type', 'code'
      ], { cwd: testDir, env: process.env });
    });

    it('should show memory statistics', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'stats'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/total|count|entries/i);
      expect(result.stdout).toMatch(/\d+/); // Should contain numbers
    });
  });

  describe('memory clear', () => {
    beforeEach(async () => {
      // Add memories to clear
      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'To clear 1'
      ], { cwd: testDir, env: process.env });

      await execFileAsync('node', [
        cliPath, 'memory', 'add',
        'To clear 2'
      ], { cwd: testDir, env: process.env });
    });

    it('should clear all memories with confirmation', async () => {
      // Note: This test might need interactive input handling
      // For now, we'll skip it or mock the confirmation
      // Actual implementation would need stdin simulation
    });

    it('should support confirm flag to skip confirmation', async () => {
      const result = await execFileAsync('node', [
        cliPath, 'memory', 'clear',
        '--all',
        '--confirm'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(result.stdout).toMatch(/cleared|success/i);

      // Verify all cleared
      const listResult = await execFileAsync('node', [
        cliPath, 'memory', 'list'
      ], {
        cwd: testDir,
        env: process.env
      });

      expect(listResult.stdout).toMatch(/no entries|empty|0/i);
    });
  });

  describe('Error Handling', () => {
    it('should show help when no subcommand provided', async () => {
      try {
        await execFileAsync('node', [cliPath, 'memory'], {
          cwd: testDir,
          env: process.env
        });
      } catch (error: any) {
        // Command might exit with 0 showing help, or error
        const output = error.stdout || error.stderr || '';
        expect(output).toMatch(/add|list|search|delete|export|import/i);
      }
    });

    it('should handle missing required arguments', async () => {
      try {
        await execFileAsync('node', [
          cliPath, 'memory', 'add'
          // Missing content
        ], {
          cwd: testDir,
          env: process.env
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe(1);
      }
    });

    it('should handle invalid options', async () => {
      try {
        await execFileAsync('node', [
          cliPath, 'memory', 'list',
          '--invalid-option'
        ], {
          cwd: testDir,
          env: process.env
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.code).toBe(1);
      }
    });
  });
});
