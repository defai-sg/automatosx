/**
 * Workspace Manager - Unit Tests
 *
 * @group unit
 * @group core
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { WorkspaceManager } from '../../src/core/workspace-manager.js';
import { WorkspaceError } from '../../src/types/orchestration.js';
import type { AgentProfile } from '../../src/types/agent.js';

describe('WorkspaceManager', () => {
  let workspaceManager: WorkspaceManager;
  let testProjectDir: string;

  beforeEach(async () => {
    // Create temp directory for testing
    testProjectDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workspace-test-'));
    workspaceManager = new WorkspaceManager(testProjectDir);
    await workspaceManager.initialize();
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(testProjectDir, { recursive: true, force: true });
  });

  describe('Initialization', () => {
    it('should create workspace directory structure', async () => {
      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const sharedRoot = path.join(workspacesRoot, 'shared');
      const sessionsRoot = path.join(sharedRoot, 'sessions');
      const persistentRoot = path.join(sharedRoot, 'persistent');

      const [workspacesStat, sharedStat, sessionsStat, persistentStat] = await Promise.all([
        fs.stat(workspacesRoot),
        fs.stat(sharedRoot),
        fs.stat(sessionsRoot),
        fs.stat(persistentRoot)
      ]);

      expect(workspacesStat.isDirectory()).toBe(true);
      expect(sharedStat.isDirectory()).toBe(true);
      expect(sessionsStat.isDirectory()).toBe(true);
      expect(persistentStat.isDirectory()).toBe(true);
    });
  });

  describe('Session Workspace Creation', () => {
    it('should create session workspace with proper structure', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const sessionDir = path.join(workspacesRoot, 'shared', 'sessions', sessionId);
      const specsDir = path.join(sessionDir, 'specs');
      const outputsDir = path.join(sessionDir, 'outputs');

      const [sessionStat, specsStat, outputsStat] = await Promise.all([
        fs.stat(sessionDir),
        fs.stat(specsDir),
        fs.stat(outputsDir)
      ]);

      expect(sessionStat.isDirectory()).toBe(true);
      expect(specsStat.isDirectory()).toBe(true);
      expect(outputsStat.isDirectory()).toBe(true);
    });

    it('should handle duplicate session workspace creation gracefully', async () => {
      const sessionId = randomUUID();

      await workspaceManager.createSessionWorkspace(sessionId);
      await expect(
        workspaceManager.createSessionWorkspace(sessionId)
      ).resolves.not.toThrow();
    });
  });

  describe('Writing to Session', () => {
    it('should write file to session workspace', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      const content = '# API Specification\n\nGET /users';
      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'api-spec.md',
        content
      );

      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const filePath = path.join(
        workspacesRoot,
        'shared',
        'sessions',
        sessionId,
        'outputs',
        'backend',
        'api-spec.md'
      );

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });

    it('should create nested directories when writing', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'api/models/user.ts',
        'export interface User {}'
      );

      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const filePath = path.join(
        workspacesRoot,
        'shared',
        'sessions',
        sessionId,
        'outputs',
        'backend',
        'api/models/user.ts'
      );

      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });

    it('should reject path traversal attempts', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await expect(
        workspaceManager.writeToSession(
          sessionId,
          'backend',
          '../../../etc/passwd',
          'malicious'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should reject absolute paths', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await expect(
        workspaceManager.writeToSession(
          sessionId,
          'backend',
          '/etc/passwd',
          'malicious'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should reject complex path traversal with multiple ..', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await expect(
        workspaceManager.writeToSession(
          sessionId,
          'backend',
          'a/../../b/../../../etc/passwd',
          'malicious'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should reject path traversal with mixed separators', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await expect(
        workspaceManager.writeToSession(
          sessionId,
          'backend',
          './../../etc/passwd',
          'malicious'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should allow valid nested paths', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      // Valid path with ./
      await expect(
        workspaceManager.writeToSession(
          sessionId,
          'backend',
          './api/users.ts',
          'content'
        )
      ).resolves.not.toThrow();

      // Verify file was created
      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const filePath = path.join(
        workspacesRoot,
        'shared',
        'sessions',
        sessionId,
        'outputs',
        'backend',
        'api/users.ts'
      );

      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('Reading from Agent Workspace', () => {
    const createAgentProfile = (
      name: string,
      canReadWorkspaces?: string[]
    ): AgentProfile => ({
      name,
      role: 'test',
      description: 'Test agent',
      systemPrompt: 'Test',
      abilities: [],
      orchestration: {
        canDelegate: true,
        canReadWorkspaces
      }
    });

    it('should read file from authorized agent workspace', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      const content = '# API Spec';
      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'api-spec.md',
        content
      );

      const frontendProfile = createAgentProfile('frontend', ['backend']);

      const read = await workspaceManager.readFromAgentWorkspace(
        frontendProfile,
        'backend',
        sessionId,
        'api-spec.md'
      );

      expect(read).toBe(content);
    });

    it('should deny reading without permission', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'api-spec.md',
        'content'
      );

      const frontendProfile = createAgentProfile('frontend', []); // No read permissions

      await expect(
        workspaceManager.readFromAgentWorkspace(
          frontendProfile,
          'backend',
          sessionId,
          'api-spec.md'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should deny reading when canReadWorkspaces is undefined', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'api-spec.md',
        'content'
      );

      const frontendProfile = createAgentProfile('frontend'); // No orchestration config

      await expect(
        workspaceManager.readFromAgentWorkspace(
          frontendProfile,
          'backend',
          sessionId,
          'api-spec.md'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should throw error when file not found', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      const frontendProfile = createAgentProfile('frontend', ['backend']);

      await expect(
        workspaceManager.readFromAgentWorkspace(
          frontendProfile,
          'backend',
          sessionId,
          'nonexistent.md'
        )
      ).rejects.toThrow(WorkspaceError);
    });
  });

  describe('Writing to Shared Workspace', () => {
    const createAgentProfile = (
      name: string,
      canWriteToShared?: boolean
    ): AgentProfile => ({
      name,
      role: 'test',
      description: 'Test agent',
      systemPrompt: 'Test',
      abilities: [],
      orchestration: {
        canDelegate: true,
        canWriteToShared
      }
    });

    it('should write to shared workspace with permission', async () => {
      const agentProfile = createAgentProfile('backend', true);
      const content = 'export const template = "...";';

      await workspaceManager.writeToShared(
        agentProfile,
        'templates/api-template.ts',
        content
      );

      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const filePath = path.join(
        workspacesRoot,
        'shared',
        'persistent',
        'templates/api-template.ts'
      );

      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });

    it('should deny writing without permission', async () => {
      const agentProfile = createAgentProfile('backend', false);

      await expect(
        workspaceManager.writeToShared(
          agentProfile,
          'templates/template.ts',
          'content'
        )
      ).rejects.toThrow(WorkspaceError);
    });

    it('should reject path traversal in shared workspace', async () => {
      const agentProfile = createAgentProfile('backend', true);

      await expect(
        workspaceManager.writeToShared(
          agentProfile,
          '../../../etc/passwd',
          'malicious'
        )
      ).rejects.toThrow(WorkspaceError);
    });
  });

  describe('Listing Session Files', () => {
    it('should list files in session workspace', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'file1.md',
        'content1'
      );
      await workspaceManager.writeToSession(
        sessionId,
        'backend',
        'api/file2.ts',
        'content2'
      );

      const files = await workspaceManager.listSessionFiles(
        sessionId,
        'backend'
      );

      expect(files).toHaveLength(2);
      expect(files).toContain('file1.md');
      expect(files).toContain(path.join('api', 'file2.ts'));
    });

    it('should return empty array when no files exist', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      const files = await workspaceManager.listSessionFiles(
        sessionId,
        'backend'
      );

      expect(files).toEqual([]);
    });
  });

  describe('Session Cleanup', () => {
    it('should remove inactive session workspaces', async () => {
      // Create multiple sessions
      const session1 = randomUUID();
      const session2 = randomUUID();
      const session3 = randomUUID();

      await workspaceManager.createSessionWorkspace(session1);
      await workspaceManager.createSessionWorkspace(session2);
      await workspaceManager.createSessionWorkspace(session3);

      // Cleanup, keeping only session-1 and session-2
      const removed = await workspaceManager.cleanupSessions([
        session1,
        session2
      ]);

      expect(removed).toBe(1);

      // Verify session-3 is removed
      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const session3Dir = path.join(workspacesRoot, 'shared', 'sessions', session3);

      await expect(fs.stat(session3Dir)).rejects.toThrow();
    });

    it('should not remove active sessions', async () => {
      const session1 = randomUUID();
      await workspaceManager.createSessionWorkspace(session1);

      const removed = await workspaceManager.cleanupSessions([session1]);

      expect(removed).toBe(0);

      // Verify session-1 still exists
      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const session1Dir = path.join(workspacesRoot, 'shared', 'sessions', session1);

      const stat = await fs.stat(session1Dir);
      expect(stat.isDirectory()).toBe(true);
    });
  });

  describe('Workspace Statistics', () => {
    it('should return accurate workspace statistics', async () => {
      await workspaceManager.createSessionWorkspace(randomUUID());
      await workspaceManager.createSessionWorkspace(randomUUID());
      await workspaceManager.createAgentWorkspace('backend');

      const stats = await workspaceManager.getStats();

      expect(stats.totalSessions).toBe(2);
      expect(stats.agentWorkspaces).toBe(1);
      expect(stats.totalSizeBytes).toBeDefined();
    });

    it('should return zero stats when no workspaces exist', async () => {
      const stats = await workspaceManager.getStats();

      expect(stats.totalSessions).toBe(0);
      expect(stats.agentWorkspaces).toBe(0);
    });
  });

  describe('Agent Workspace Creation', () => {
    it('should create agent workspace with proper structure', async () => {
      await workspaceManager.createAgentWorkspace('backend');

      const workspacesRoot = path.join(testProjectDir, '.automatosx', 'workspaces');
      const agentDir = path.join(workspacesRoot, 'backend');
      const draftsDir = path.join(agentDir, 'drafts');
      const tempDir = path.join(agentDir, 'temp');

      const [agentStat, draftsStat, tempStat] = await Promise.all([
        fs.stat(agentDir),
        fs.stat(draftsDir),
        fs.stat(tempDir)
      ]);

      expect(agentStat.isDirectory()).toBe(true);
      expect(draftsStat.isDirectory()).toBe(true);
      expect(tempStat.isDirectory()).toBe(true);
    });
  });

  describe('File Size Limits', () => {
    it('should reject files exceeding 10MB', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      // Create content larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);

      await expect(
        workspaceManager.writeToSession(sessionId, 'agent', 'large.txt', largeContent)
      ).rejects.toThrow('File too large');
    });

    it('should accept files under 10MB', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      // Create content under 10MB (5MB)
      const content = 'x'.repeat(5 * 1024 * 1024);

      await expect(
        workspaceManager.writeToSession(sessionId, 'agent', 'ok.txt', content)
      ).resolves.not.toThrow();
    });

    it('should handle multi-byte characters in file size calculation', async () => {
      const sessionId = randomUUID();
      await workspaceManager.createSessionWorkspace(sessionId);

      // Chinese characters are 3 bytes each
      // 3.5M characters * 3 bytes = 10.5MB (over limit)
      const largeContent = '測試'.repeat(3500000);

      await expect(
        workspaceManager.writeToSession(sessionId, 'agent', 'chinese.txt', largeContent)
      ).rejects.toThrow('File too large');
    });
  });
});
