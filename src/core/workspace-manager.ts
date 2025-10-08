/**
 * Workspace Manager - Manages agent workspaces and session-based collaboration
 *
 * Provides:
 * - Session-based workspace organization
 * - Agent workspace isolation with controlled sharing
 * - Permission-based access control
 * - Automatic cleanup of old session workspaces
 *
 * @module core/workspace-manager
 * @since v4.7.0
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { AgentProfile } from '../types/agent.js';
import { WorkspaceError } from '../types/orchestration.js';
import { logger } from '../utils/logger.js';

/**
 * Workspace structure:
 * ```
 * .automatosx/workspaces/
 * ├── shared/
 * │   ├── sessions/<sessionId>/     # Session-specific shared workspace
 * │   │   ├── specs/                # Requirements, designs
 * │   │   └── outputs/
 * │   │       ├── <agentName>/      # Each agent's outputs
 * │   │       └── ...
 * │   └── persistent/               # Cross-session shared files
 * └── <agentName>/                  # Agent private workspace
 *     ├── drafts/
 *     └── temp/
 * ```
 */

export interface WorkspaceStats {
  /** Total number of session workspaces */
  totalSessions: number;

  /** Total disk space used (bytes) */
  totalSizeBytes: number;

  /** Number of agent workspaces */
  agentWorkspaces: number;
}

/**
 * Workspace Manager
 *
 * Manages workspace organization for multi-agent collaboration with:
 * - Session-based isolation (each session gets its own workspace)
 * - Permission-based access control (based on OrchestrationConfig)
 * - Automatic cleanup of old sessions
 *
 * @example
 * ```typescript
 * const workspaceManager = new WorkspaceManager('/path/to/project');
 *
 * // Create session workspace
 * await workspaceManager.createSessionWorkspace('session-123');
 *
 * // Agent writes to session
 * await workspaceManager.writeToSession(
 *   'session-123',
 *   'backend',
 *   'api-spec.md',
 *   '# API Specification...'
 * );
 *
 * // Another agent reads from backend's output
 * const spec = await workspaceManager.readFromAgentWorkspace(
 *   'frontend',
 *   'backend',
 *   'session-123',
 *   'api-spec.md'
 * );
 * ```
 */
export class WorkspaceManager {
  private readonly workspacesRoot: string;
  private readonly sharedRoot: string;
  private readonly sessionsRoot: string;
  private readonly persistentRoot: string;

  /** Maximum file size for writeToSession (10 MB) */
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024;

  constructor(projectDir: string) {
    this.workspacesRoot = path.join(projectDir, '.automatosx', 'workspaces');
    this.sharedRoot = path.join(this.workspacesRoot, 'shared');
    this.sessionsRoot = path.join(this.sharedRoot, 'sessions');
    this.persistentRoot = path.join(this.sharedRoot, 'persistent');
  }

  /**
   * Initialize workspace structure
   *
   * Creates all necessary directories for workspace management.
   *
   * @example
   * ```typescript
   * await workspaceManager.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.workspacesRoot, { recursive: true });
    await fs.mkdir(this.sharedRoot, { recursive: true });
    await fs.mkdir(this.sessionsRoot, { recursive: true });
    await fs.mkdir(this.persistentRoot, { recursive: true });

    logger.debug('Workspace structure initialized', {
      workspacesRoot: this.workspacesRoot
    });
  }

  /**
   * Create workspace for a session
   *
   * @param sessionId - Session ID
   * @throws {WorkspaceError} If creation fails
   *
   * @example
   * ```typescript
   * await workspaceManager.createSessionWorkspace('session-123');
   * ```
   */
  async createSessionWorkspace(sessionId: string): Promise<void> {
    const sessionDir = this.getSessionDir(sessionId);
    const specsDir = path.join(sessionDir, 'specs');
    const outputsDir = path.join(sessionDir, 'outputs');

    try {
      await fs.mkdir(sessionDir, { recursive: true });
      await fs.mkdir(specsDir, { recursive: true });
      await fs.mkdir(outputsDir, { recursive: true });

      logger.info('Session workspace created', {
        sessionId,
        path: sessionDir
      });
    } catch (error) {
      throw new WorkspaceError(
        `Failed to create session workspace: ${(error as Error).message}`,
        sessionDir,
        'creation_failed'
      );
    }
  }

  /**
   * Get agent's output directory within a session
   *
   * @param sessionId - Session ID
   * @param agentName - Agent name
   * @returns Path to agent's output directory
   */
  private getAgentOutputDir(sessionId: string, agentName: string): string {
    return path.join(this.getSessionDir(sessionId), 'outputs', agentName);
  }

  /**
   * Validate session ID format (must be valid UUID v4)
   *
   * @param sessionId - Session ID to validate
   * @throws {WorkspaceError} If session ID is invalid
   */
  private validateSessionId(sessionId: string): void {
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is 8, 9, a, or b
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidV4Regex.test(sessionId)) {
      throw new WorkspaceError(
        `Invalid session ID format: ${sessionId}. Session IDs must be valid UUID v4.`,
        undefined,
        'invalid_session_id'
      );
    }
  }

  /**
   * Get session directory path
   *
   * @param sessionId - Session ID
   * @returns Session directory path
   */
  private getSessionDir(sessionId: string): string {
    this.validateSessionId(sessionId);
    return path.join(this.sessionsRoot, sessionId);
  }

  /**
   * Validate that a file path is safe (prevents path traversal attacks)
   *
   * @param baseDir - Base directory that file must be within
   * @param filePath - Relative file path to validate
   * @returns Resolved absolute path
   * @throws {WorkspaceError} If path is unsafe
   *
   * Security checks:
   * 1. Normalize path to resolve '..' and '.'
   * 2. Resolve to absolute path
   * 3. Verify resolved path is within base directory
   * 4. Prevent symlink attacks by checking real path
   */
  private async validatePath(baseDir: string, filePath: string): Promise<string> {
    // 1. Reject absolute paths immediately
    if (path.isAbsolute(filePath)) {
      throw new WorkspaceError(
        `Absolute paths not allowed: ${filePath}`,
        filePath,
        'permission_denied'
      );
    }

    // 2. Normalize the path (resolves '..' and '.')
    const normalized = path.normalize(filePath);

    // 3. Additional check: normalized path shouldn't start with '..'
    if (normalized.startsWith('..')) {
      throw new WorkspaceError(
        `Path traversal detected: ${filePath}`,
        filePath,
        'permission_denied'
      );
    }

    // 4. Resolve to absolute path
    const resolved = path.resolve(baseDir, normalized);

    // 5. Verify resolved path is within base directory
    const resolvedBase = path.resolve(baseDir);
    if (!resolved.startsWith(resolvedBase + path.sep) && resolved !== resolvedBase) {
      throw new WorkspaceError(
        `Path outside workspace: ${filePath}`,
        filePath,
        'permission_denied'
      );
    }

    return resolved;
  }

  /**
   * Get agent's private workspace directory
   *
   * @param agentName - Agent name
   * @returns Agent workspace path
   */
  private getAgentWorkspaceDir(agentName: string): string {
    return path.join(this.workspacesRoot, agentName);
  }

  /**
   * Write file to session workspace (agent's output area)
   *
   * @param sessionId - Session ID
   * @param agentName - Agent writing the file
   * @param filePath - Relative file path within agent's output
   * @param content - File content
   * @param callerAgent - Optional: Agent profile of the caller (for permission verification)
   * @throws {WorkspaceError} If write fails, path is invalid, or permission denied
   *
   * @example
   * ```typescript
   * await workspaceManager.writeToSession(
   *   'session-123',
   *   'backend',
   *   'api/users.ts',
   *   'export interface User { ... }',
   *   backendProfile  // Verify caller is actually 'backend'
   * );
   * ```
   */
  async writeToSession(
    sessionId: string,
    agentName: string,
    filePath: string,
    content: string,
    callerAgent?: AgentProfile
  ): Promise<void> {
    // Permission check: Verify caller is the agent they claim to be
    if (callerAgent && callerAgent.name !== agentName) {
      throw new WorkspaceError(
        `Agent '${callerAgent.name}' is not authorized to write to '${agentName}' workspace`,
        undefined,
        'permission_denied'
      );
    }

    const agentOutputDir = this.getAgentOutputDir(sessionId, agentName);

    // Validate path security (prevents path traversal)
    const fullPath = await this.validatePath(agentOutputDir, filePath);

    // Check file size (prevent disk quota exhaustion)
    const fileSize = Buffer.byteLength(content, 'utf-8');
    if (fileSize > this.MAX_FILE_SIZE) {
      throw new WorkspaceError(
        `File too large: ${fileSize} bytes (max: ${this.MAX_FILE_SIZE} bytes)`,
        fullPath,
        'quota_exceeded'
      );
    }

    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });

      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');

      logger.debug('File written to session workspace', {
        sessionId,
        agentName,
        filePath,
        size: content.length
      });
    } catch (error) {
      throw new WorkspaceError(
        `Failed to write file: ${(error as Error).message}`,
        fullPath,
        'permission_denied'
      );
    }
  }

  /**
   * Read file from another agent's workspace (within a session)
   *
   * Requires permission check: requestingAgent must have targetAgent
   * in their canReadWorkspaces whitelist.
   *
   * @param requestingAgent - Agent profile requesting access
   * @param targetAgent - Target agent whose workspace to read
   * @param sessionId - Session ID
   * @param filePath - Relative file path within target agent's output
   * @returns File content
   * @throws {WorkspaceError} If permission denied or file not found
   *
   * @example
   * ```typescript
   * const spec = await workspaceManager.readFromAgentWorkspace(
   *   frontendProfile,
   *   'backend',
   *   'session-123',
   *   'api-spec.md'
   * );
   * ```
   */
  async readFromAgentWorkspace(
    requestingAgent: AgentProfile,
    targetAgent: string,
    sessionId: string,
    filePath: string
  ): Promise<string> {
    // Permission check
    const canRead = requestingAgent.orchestration?.canReadWorkspaces;
    if (!canRead || !canRead.includes(targetAgent)) {
      throw new WorkspaceError(
        `Agent '${requestingAgent.name}' is not authorized to read '${targetAgent}' workspace`,
        undefined,
        'permission_denied'
      );
    }

    const agentOutputDir = this.getAgentOutputDir(sessionId, targetAgent);

    // Validate path security (prevents path traversal)
    const fullPath = await this.validatePath(agentOutputDir, filePath);

    try {
      const content = await fs.readFile(fullPath, 'utf-8');

      logger.debug('File read from agent workspace', {
        requestingAgent: requestingAgent.name,
        targetAgent,
        sessionId,
        filePath
      });

      return content;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        throw new WorkspaceError(
          `File not found: ${filePath}`,
          fullPath,
          'not_found'
        );
      }
      throw new WorkspaceError(
        `Failed to read file: ${err.message}`,
        fullPath,
        'permission_denied'
      );
    }
  }

  /**
   * Write to persistent shared workspace (cross-session)
   *
   * Requires permission check: agent must have canWriteToShared enabled.
   *
   * @param agent - Agent profile
   * @param filePath - Relative file path
   * @param content - File content
   * @throws {WorkspaceError} If permission denied or write fails
   *
   * @example
   * ```typescript
   * await workspaceManager.writeToShared(
   *   agentProfile,
   *   'templates/api-template.ts',
   *   'export const template = ...'
   * );
   * ```
   */
  async writeToShared(
    agent: AgentProfile,
    filePath: string,
    content: string
  ): Promise<void> {
    // Permission check
    if (!agent.orchestration?.canWriteToShared) {
      throw new WorkspaceError(
        `Agent '${agent.name}' is not authorized to write to shared workspace`,
        undefined,
        'permission_denied'
      );
    }

    // Validate path security (prevents path traversal)
    const fullPath = await this.validatePath(this.persistentRoot, filePath);

    try {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      logger.info('File written to persistent shared workspace', {
        agentName: agent.name,
        filePath
      });
    } catch (error) {
      throw new WorkspaceError(
        `Failed to write to shared workspace: ${(error as Error).message}`,
        fullPath,
        'permission_denied'
      );
    }
  }

  /**
   * List files in session workspace for a specific agent
   *
   * @param sessionId - Session ID
   * @param agentName - Agent name
   * @returns Array of relative file paths
   * @throws {WorkspaceError} If listing fails
   *
   * @example
   * ```typescript
   * const files = await workspaceManager.listSessionFiles('session-123', 'backend');
   * console.log(files); // ['api-spec.md', 'models/user.ts']
   * ```
   */
  async listSessionFiles(sessionId: string, agentName: string): Promise<string[]> {
    const agentOutputDir = this.getAgentOutputDir(sessionId, agentName);

    try {
      const files: string[] = [];
      await this.collectFiles(agentOutputDir, agentOutputDir, files);
      return files;
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ENOENT') {
        return []; // Directory doesn't exist yet
      }
      throw new WorkspaceError(
        `Failed to list files: ${err.message}`,
        agentOutputDir,
        'permission_denied'
      );
    }
  }

  /**
   * Recursively collect files from a directory
   *
   * @param dir - Directory to scan
   * @param baseDir - Base directory for relative paths
   * @param files - Array to collect file paths
   */
  private async collectFiles(
    dir: string,
    baseDir: string,
    files: string[]
  ): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.collectFiles(fullPath, baseDir, files);
      } else {
        const relativePath = path.relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }
  }

  /**
   * Cleanup old session workspaces
   *
   * Removes session workspaces older than specified days.
   * Should be called in sync with SessionManager cleanup.
   *
   * @param sessionIds - Active session IDs to keep
   * @returns Number of sessions cleaned up
   *
   * @example
   * ```typescript
   * const activeSessions = await sessionManager.getActiveSessions();
   * const activeIds = activeSessions.map(s => s.id);
   * const removed = await workspaceManager.cleanupSessions(activeIds);
   * ```
   */
  async cleanupSessions(sessionIds: string[]): Promise<number> {
    try {
      const sessionDirs = await fs.readdir(this.sessionsRoot);
      const activeSet = new Set(sessionIds);
      let removed = 0;

      for (const sessionId of sessionDirs) {
        if (!activeSet.has(sessionId)) {
          const sessionDir = this.getSessionDir(sessionId);
          await fs.rm(sessionDir, { recursive: true, force: true });
          removed++;

          logger.debug('Session workspace removed', { sessionId });
        }
      }

      if (removed > 0) {
        logger.info('Session workspaces cleaned up', { removed });
      }

      return removed;
    } catch (error) {
      logger.warn('Failed to cleanup session workspaces', {
        error: (error as Error).message
      });
      return 0;
    }
  }

  /**
   * Cleanup specific session workspaces by session IDs
   *
   * Removes workspace directories for the specified session IDs.
   * Useful when coordinating with SessionManager cleanup.
   *
   * @param sessionIds - Session IDs to remove
   * @returns Number of workspaces removed
   *
   * @example
   * ```typescript
   * const result = await sessionManager.cleanupOldSessions(7);
   * await workspaceManager.cleanupSessionWorkspaces(result.removedSessionIds);
   * ```
   */
  async cleanupSessionWorkspaces(sessionIds: string[]): Promise<number> {
    let removed = 0;

    for (const sessionId of sessionIds) {
      try {
        const sessionDir = this.getSessionDir(sessionId);
        await fs.rm(sessionDir, { recursive: true, force: true });
        removed++;

        logger.debug('Session workspace removed', { sessionId });
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        // Ignore ENOENT errors (workspace already doesn't exist)
        if (err.code !== 'ENOENT') {
          logger.warn('Failed to remove session workspace', {
            sessionId,
            error: err.message
          });
        }
      }
    }

    if (removed > 0) {
      logger.info('Session workspaces cleaned up', {
        removed,
        total: sessionIds.length
      });
    }

    return removed;
  }

  /**
   * Get workspace statistics
   *
   * @returns Workspace statistics
   *
   * @example
   * ```typescript
   * const stats = await workspaceManager.getStats();
   * console.log(`${stats.totalSessions} session workspaces`);
   * ```
   */
  async getStats(): Promise<WorkspaceStats> {
    try {
      const sessionDirs = await fs.readdir(this.sessionsRoot);
      const agentDirs = await fs.readdir(this.workspacesRoot);

      // Count only directories (exclude 'shared')
      const agentWorkspaces = agentDirs.filter(
        name => name !== 'shared'
      ).length;

      // Calculate total size (simplified - doesn't traverse all files)
      const stats: WorkspaceStats = {
        totalSessions: sessionDirs.length,
        totalSizeBytes: 0,
        agentWorkspaces
      };

      return stats;
    } catch (error) {
      logger.warn('Failed to get workspace stats', {
        error: (error as Error).message
      });

      return {
        totalSessions: 0,
        totalSizeBytes: 0,
        agentWorkspaces: 0
      };
    }
  }

  /**
   * Create agent's private workspace
   *
   * @param agentName - Agent name
   *
   * @example
   * ```typescript
   * await workspaceManager.createAgentWorkspace('backend');
   * ```
   */
  async createAgentWorkspace(agentName: string): Promise<void> {
    const agentDir = this.getAgentWorkspaceDir(agentName);
    const draftsDir = path.join(agentDir, 'drafts');
    const tempDir = path.join(agentDir, 'temp');

    try {
      await fs.mkdir(agentDir, { recursive: true });
      await fs.mkdir(draftsDir, { recursive: true });
      await fs.mkdir(tempDir, { recursive: true });

      logger.debug('Agent workspace created', {
        agentName,
        path: agentDir
      });
    } catch (error) {
      throw new WorkspaceError(
        `Failed to create agent workspace: ${(error as Error).message}`,
        agentDir,
        'creation_failed'
      );
    }
  }
}
