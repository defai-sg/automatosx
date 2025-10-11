/**
 * MCP Server Integration Tests
 *
 * Tests for MCP server initialization, tool registration,
 * and JSON-RPC 2.0 protocol compliance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { MCPServer } from '../../../src/mcp/server.js';
import type { ToolSchema } from '../../../src/mcp/types.js';

describe('MCP Server Integration', () => {
  let testDir: string;
  let server: MCPServer;

  beforeEach(async () => {
    // Create isolated test directory
    testDir = join(tmpdir(), `automatosx-mcp-test-${Date.now()}`);
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

    // Create a test agent
    const agentPath = join(automatosxDir, 'agents/test-agent.yaml');
    await writeFile(agentPath, `
name: test-agent
team: core
role: Test Agent
systemPrompt: |
  You are a test agent.
`);

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

    // Initialize server in test mode
    server = await MCPServer.initialize(testDir);
  });

  afterEach(async () => {
    // Cleanup
    await server.close();
    await rm(testDir, { recursive: true, force: true });
  });

  describe('Server Initialization', () => {
    it('should initialize successfully', () => {
      expect(server).toBeDefined();
    });

    it('should register all 16 tools', () => {
      const toolCount = server.getToolSchemas().length;
      expect(toolCount).toBe(16);
    });

    it('should register Phase 1 tools (core)', () => {
      const toolNames = server.getToolSchemas().map((t: ToolSchema) => t.name);
      expect(toolNames).toContain('run_agent');
      expect(toolNames).toContain('list_agents');
      expect(toolNames).toContain('search_memory');
      expect(toolNames).toContain('get_status');
    });

    it('should register Phase 2 tools (sessions)', () => {
      const toolNames = server.getToolSchemas().map((t: ToolSchema) => t.name);
      expect(toolNames).toContain('session_create');
      expect(toolNames).toContain('session_list');
      expect(toolNames).toContain('session_status');
      expect(toolNames).toContain('session_complete');
      expect(toolNames).toContain('session_fail');
    });

    it('should register Phase 3 tools (memory management)', () => {
      const toolNames = server.getToolSchemas().map((t: ToolSchema) => t.name);
      expect(toolNames).toContain('memory_add');
      expect(toolNames).toContain('memory_list');
      expect(toolNames).toContain('memory_delete');
      expect(toolNames).toContain('memory_export');
      expect(toolNames).toContain('memory_import');
      expect(toolNames).toContain('memory_stats');
      expect(toolNames).toContain('memory_clear');
    });

    it('should have valid tool schemas', () => {
      const schemas = server.getToolSchemas();
      schemas.forEach((schema: ToolSchema) => {
        expect(schema.name).toBeDefined();
        expect(schema.description).toBeDefined();
        expect(schema.inputSchema).toBeDefined();
        expect(schema.inputSchema.type).toBe('object');
      });
    });
  });

  describe('Tool Execution', () => {
    it('should execute list_agents tool', async () => {
      const result = await server.handleToolCall({
        name: 'list_agents',
        arguments: {}
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should execute get_status tool', async () => {
      const result = await server.handleToolCall({
        name: 'get_status',
        arguments: {}
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('sessions');
      expect(result).toHaveProperty('providers');
    });

    it('should execute memory_add tool', async () => {
      const result = await server.handleToolCall({
        name: 'memory_add',
        arguments: {
          content: 'Test memory entry',
          metadata: {
            agent: 'test-agent',
            timestamp: new Date().toISOString()
          }
        }
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('id');
    });

    it('should execute memory_stats tool', async () => {
      const result = await server.handleToolCall({
        name: 'memory_stats',
        arguments: {}
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty('totalEntries');
      expect(result).toHaveProperty('dbSize');
    });

    it('should execute session_list tool', async () => {
      const result = await server.handleToolCall({
        name: 'session_list',
        arguments: {}
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle invalid tool name', async () => {
      await expect(
        server.handleToolCall({
          name: 'invalid_tool',
          arguments: {}
        })
      ).rejects.toThrow();
    });

    it('should handle missing required arguments', async () => {
      await expect(
        server.handleToolCall({
          name: 'memory_add',
          arguments: {} // Missing required 'content' field
        })
      ).rejects.toThrow();
    });
  });

  describe('Session Management', () => {
    it('should create and list sessions', async () => {
      // Create session
      const createResult = await server.handleToolCall({
        name: 'session_create',
        arguments: {
          name: 'Test Session',
          agent: 'test-agent'
        }
      });

      expect(createResult).toHaveProperty('success', true);
      expect(createResult).toHaveProperty('sessionId');

      // List sessions
      const listResult = await server.handleToolCall({
        name: 'session_list',
        arguments: {}
      });

      expect(Array.isArray(listResult)).toBe(true);
      expect(listResult.length).toBeGreaterThan(0);
    });

    it('should get session status', async () => {
      // Create session
      const createResult = await server.handleToolCall({
        name: 'session_create',
        arguments: {
          name: 'Test Session',
          agent: 'test-agent'
        }
      });

      const sessionId = createResult.sessionId;

      // Get status
      const statusResult = await server.handleToolCall({
        name: 'session_status',
        arguments: { id: sessionId }
      });

      expect(statusResult).toHaveProperty('id', sessionId);
      expect(statusResult).toHaveProperty('status');
      expect(statusResult).toHaveProperty('agents');
    });

    it('should complete session', async () => {
      // Create session
      const createResult = await server.handleToolCall({
        name: 'session_create',
        arguments: {
          name: 'Test Session',
          agent: 'test-agent'
        }
      });

      const sessionId = createResult.sessionId;

      // Complete session
      const completeResult = await server.handleToolCall({
        name: 'session_complete',
        arguments: { id: sessionId }
      });

      expect(completeResult).toHaveProperty('success', true);
      expect(completeResult).toHaveProperty('sessionId', sessionId);
    });
  });

  describe('Memory Management', () => {
    it('should add and list memory entries', async () => {
      // Add memory
      const addResult = await server.handleToolCall({
        name: 'memory_add',
        arguments: {
          content: 'Test memory content',
          metadata: { agent: 'test-agent' }
        }
      });

      expect(addResult).toHaveProperty('success', true);
      expect(addResult).toHaveProperty('id');

      // List memory
      const listResult = await server.handleToolCall({
        name: 'memory_list',
        arguments: { limit: 10 }
      });

      expect(Array.isArray(listResult)).toBe(true);
      expect(listResult.length).toBeGreaterThan(0);
    });

    it('should search memory', async () => {
      // Add test memory
      await server.handleToolCall({
        name: 'memory_add',
        arguments: {
          content: 'Searchable test content',
          metadata: { agent: 'test-agent' }
        }
      });

      // Search
      const searchResult = await server.handleToolCall({
        name: 'search_memory',
        arguments: {
          query: 'searchable',
          limit: 5
        }
      });

      expect(Array.isArray(searchResult)).toBe(true);
    });

    it('should delete memory entry', async () => {
      // Add memory
      const addResult = await server.handleToolCall({
        name: 'memory_add',
        arguments: {
          content: 'To be deleted',
          metadata: { agent: 'test-agent' }
        }
      });

      const memoryId = addResult.id;

      // Delete
      const deleteResult = await server.handleToolCall({
        name: 'memory_delete',
        arguments: { id: memoryId }
      });

      expect(deleteResult).toHaveProperty('success', true);
      expect(deleteResult).toHaveProperty('id', memoryId);
    });

    it('should export memory to file', async () => {
      // Add test memory
      await server.handleToolCall({
        name: 'memory_add',
        arguments: {
          content: 'Export test content',
          metadata: { agent: 'test-agent' }
        }
      });

      // Export
      const exportResult = await server.handleToolCall({
        name: 'memory_export',
        arguments: {
          path: 'test-export.json'
        }
      });

      expect(exportResult).toHaveProperty('success', true);
      expect(exportResult).toHaveProperty('path');
      expect(exportResult.path).toContain('exports/test-export.json');
    });

    it('should get memory stats', async () => {
      const statsResult = await server.handleToolCall({
        name: 'memory_stats',
        arguments: {}
      });

      expect(statsResult).toHaveProperty('totalEntries');
      expect(statsResult).toHaveProperty('dbSize');
      expect(typeof statsResult.totalEntries).toBe('number');
    });
  });
});
