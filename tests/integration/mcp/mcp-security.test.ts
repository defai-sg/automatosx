/**
 * MCP Security Integration Tests
 *
 * Tests for security features including:
 * - Path traversal prevention
 * - Sandbox boundary validation
 * - Input sanitization
 * - PathResolver guards
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { MCPServer } from '../../../src/mcp/server.js';

describe('MCP Security Tests', () => {
  let testDir: string;
  let server: MCPServer;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = join(tmpdir(), `automatosx-mcp-security-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });

    // Create minimal .automatosx structure
    const automatosxDir = join(testDir, '.automatosx');
    await mkdir(join(automatosxDir, 'agents'), { recursive: true });
    await mkdir(join(automatosxDir, 'teams'), { recursive: true });
    await mkdir(join(automatosxDir, 'abilities'), { recursive: true });
    await mkdir(join(automatosxDir, 'memory'), { recursive: true });
    await mkdir(join(automatosxDir, 'memory/exports'), { recursive: true });
    await mkdir(join(automatosxDir, 'sessions'), { recursive: true });
    await mkdir(join(automatosxDir, 'workspaces'), { recursive: true });

    // Create a test team
    const teamPath = join(automatosxDir, 'teams/core.yaml');
    await writeFile(teamPath, `
name: core
displayName: Core Team
provider:
  primary: gemini
  fallbackChain: [gemini, claude, codex]
sharedAbilities: []
orchestration:
  maxDelegationDepth: 1
`);

    // Initialize server
    server = await MCPServer.initialize(testDir);
  });

  afterEach(async () => {
    // Cleanup
    await server.close();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Path Traversal Prevention', () => {
    it('should reject path traversal in memory_export', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: '../../etc/passwd'
          }
        })
      ).rejects.toThrow(/not allowed for security reasons/i);
    });

    it('should reject path traversal with multiple dotdots', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: '../../../../../etc/passwd'
          }
        })
      ).rejects.toThrow(/not allowed for security reasons/i);
    });

    it('should reject path traversal with encoded characters', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: '..%2F..%2Fetc%2Fpasswd'
          }
        })
      ).rejects.toThrow();
    });

    it('should reject absolute paths in memory_export', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: '/etc/passwd'
          }
        })
      ).rejects.toThrow();
    });

    it('should accept safe relative path', async () => {
      const result = await server.handleToolCall({
        name: 'memory_export',
        arguments: {
          path: 'safe-export.json'
        }
      });

      expect(result).toHaveProperty('success', true);
      expect(result.path).toContain('exports/safe-export.json');
    });

    it('should extract filename only from complex path', async () => {
      const result = await server.handleToolCall({
        name: 'memory_export',
        arguments: {
          path: 'some/nested/path/export.json'
        }
      });

      expect(result).toHaveProperty('success', true);
      // Should only use filename, ignore directory components
      expect(result.path).toContain('exports/export.json');
      expect(result.path).not.toContain('some/nested/path');
    });
  });

  describe('Sandbox Boundary Validation', () => {
    it('should restrict exports to designated directory', async () => {
      const result = await server.handleToolCall({
        name: 'memory_export',
        arguments: {
          path: 'boundary-test.json'
        }
      });

      expect(result.path).toContain('.automatosx/memory/exports');
      expect(result.path).not.toContain('..');
      expect(result.path).not.toContain('/etc');
      expect(result.path).not.toContain('/tmp');
    });

    it('should prevent escape via symlinks (implicit)', async () => {
      // Note: Actual symlink following prevention is handled by PathResolver
      // This test verifies export path is within boundaries
      const result = await server.handleToolCall({
        name: 'memory_export',
        arguments: {
          path: 'test.json'
        }
      });

      expect(result.path).toMatch(/\.automatosx\/memory\/exports\/[^/]+\.json$/);
    });
  });

  describe('Input Sanitization', () => {
    it('should reject empty path in memory_export', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: ''
          }
        })
      ).rejects.toThrow();
    });

    it('should reject null path in memory_export', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: null as unknown as string
          }
        })
      ).rejects.toThrow();
    });

    it('should reject special characters in path', async () => {
      // Most special chars should be handled gracefully or rejected
      const dangerousPaths = [
        'test\x00.json',    // Null byte
        'test\n.json',      // Newline
        'test;rm -rf /',    // Shell injection attempt
        'test && echo pwned', // Command injection
      ];

      for (const path of dangerousPaths) {
        await expect(
          server.handleToolCall({
            name: 'memory_export',
            arguments: { path }
          })
        ).rejects.toThrow();
      }
    });

    it('should handle unicode characters safely', async () => {
      const result = await server.handleToolCall({
        name: 'memory_export',
        arguments: {
          path: 'test-日本語-export.json'
        }
      });

      expect(result).toHaveProperty('success', true);
      expect(result.path).toContain('test-日本語-export.json');
    });

    it('should reject missing required fields', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_add',
          arguments: {} // Missing required 'content'
        })
      ).rejects.toThrow();
    });

    it('should reject invalid field types', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_delete',
          arguments: {
            id: 'not-a-number' // Should be number
          }
        })
      ).rejects.toThrow();
    });

    it('should reject negative IDs', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_delete',
          arguments: {
            id: -1
          }
        })
      ).rejects.toThrow();
    });

    it('should handle large content safely', async () => {
      const largeContent = 'x'.repeat(1000000); // 1MB content

      const result = await server.handleToolCall({
        name: 'memory_add',
        arguments: {
          content: largeContent,
          metadata: { agent: 'test' }
        }
      });

      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Error Message Safety', () => {
    it('should not leak sensitive paths in error messages', async () => {
      try {
        await server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: '../../etc/passwd'
          }
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        const errorMessage = error.message.toLowerCase();
        // Should not reveal full system paths
        expect(errorMessage).not.toContain('/users/');
        expect(errorMessage).not.toContain('/home/');
        expect(errorMessage).not.toContain(process.env.HOME || '');
      }
    });

    it('should provide helpful but safe error messages', async () => {
      try {
        await server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: '../../../bad-path.json'
          }
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        const errorMessage = error.message;
        // Should explain the issue without revealing internal details
        expect(errorMessage).toBeTruthy();
        expect(errorMessage.length).toBeGreaterThan(10);
      }
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent memory operations safely', async () => {
      // Create multiple concurrent requests
      const operations = Array.from({ length: 10 }, (_, i) =>
        server.handleToolCall({
          name: 'memory_add',
          arguments: {
            content: `Concurrent test ${i}`,
            metadata: { agent: 'test' }
          }
        })
      );

      const results = await Promise.all(operations);

      // All should succeed
      results.forEach((result, i) => {
        expect(result).toHaveProperty('success', true);
        expect(result).toHaveProperty('id');
      });

      // All IDs should be unique
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should handle concurrent export operations safely', async () => {
      // Create multiple concurrent export requests
      const operations = Array.from({ length: 5 }, (_, i) =>
        server.handleToolCall({
          name: 'memory_export',
          arguments: {
            path: `concurrent-export-${i}.json`
          }
        })
      );

      const results = await Promise.all(operations);

      // All should succeed with different paths
      results.forEach((result, i) => {
        expect(result).toHaveProperty('success', true);
        expect(result.path).toContain(`concurrent-export-${i}.json`);
      });
    });
  });

  describe('Resource Limits', () => {
    it('should handle memory_list with reasonable limits', async () => {
      // Add test entries
      for (let i = 0; i < 100; i++) {
        await server.handleToolCall({
          name: 'memory_add',
          arguments: {
            content: `Test entry ${i}`,
            metadata: { agent: 'test' }
          }
        });
      }

      // Request with limit
      const result = await server.handleToolCall({
        name: 'memory_list',
        arguments: {
          limit: 10
        }
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle search_memory with reasonable limits', async () => {
      // Add searchable entries
      for (let i = 0; i < 50; i++) {
        await server.handleToolCall({
          name: 'memory_add',
          arguments: {
            content: `Searchable content ${i}`,
            metadata: { agent: 'test' }
          }
        });
      }

      // Search with limit
      const result = await server.handleToolCall({
        name: 'search_memory',
        arguments: {
          query: 'searchable',
          limit: 5
        }
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });
});
