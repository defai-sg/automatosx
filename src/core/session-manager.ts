/**
 * Session Manager - Manages multi-agent collaborative sessions
 *
 * @module core/session-manager
 * @since v4.7.0
 */

import { randomUUID } from 'crypto';
import { readFile, writeFile, mkdir, rename, copyFile, unlink } from 'fs/promises';
import { dirname } from 'path';
import type { Session } from '../types/orchestration.js';
import { SessionError } from '../types/orchestration.js';
import { logger } from '../utils/logger.js';

/**
 * Session Manager
 *
 * Manages the lifecycle of multi-agent collaborative sessions, providing:
 * - Session creation and tracking
 * - Agent participation tracking
 * - Session completion and failure handling
 * - Automatic cleanup of old sessions
 *
 * @example
 * ```typescript
 * const sessionManager = new SessionManager();
 *
 * // Create session
 * const session = await sessionManager.createSession(
 *   'Implement auth feature',
 *   'backend'
 * );
 *
 * // Add agents as they join
 * await sessionManager.addAgent(session.id, 'frontend');
 * await sessionManager.addAgent(session.id, 'security');
 *
 * // Complete session
 * await sessionManager.completeSession(session.id);
 * ```
 */
export class SessionManager {
  /** Active sessions (in-memory, keyed by session ID) */
  private activeSessions: Map<string, Session> = new Map();

  /** Maximum number of sessions to keep in memory (oldest are cleaned up) */
  private readonly MAX_SESSIONS: number;

  /** Path to persistence file (optional) */
  private readonly persistencePath?: string;

  /** Pending save operation (for debouncing) */
  private saveTimeout?: NodeJS.Timeout;

  /** Pending save promise (for flushing) */
  private pendingSave?: Promise<void>;

  /** Maximum metadata size (10 KB) */
  private readonly MAX_METADATA_SIZE = 10 * 1024;

  /** UUID v4 validation regex (static for performance) */
  private static readonly UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  /**
   * Validate session ID format (must be valid UUID v4)
   *
   * @param sessionId - Session ID to validate
   * @throws {SessionError} If session ID is invalid
   * @private
   */
  private validateSessionId(sessionId: string): void {
    // Check for empty/whitespace session ID
    if (!sessionId || sessionId.trim().length === 0) {
      throw new SessionError(
        'Session ID cannot be empty. Must be a valid UUID v4.',
        sessionId,
        'invalid_format'
      );
    }

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where y is 8, 9, a, or b
    if (!SessionManager.UUID_V4_REGEX.test(sessionId)) {
      throw new SessionError(
        `Invalid session ID format: ${sessionId}. Session IDs must be valid UUID v4.`,
        sessionId,
        'invalid_format'
      );
    }
  }

  /**
   * Create SessionManager instance
   *
   * @param config - Configuration options
   * @param config.persistencePath - Optional path to JSON file for persistence
   * @param config.maxSessions - Maximum sessions to keep in memory (default: 100)
   *
   * @example
   * ```typescript
   * // In-memory only (no persistence)
   * const sessionManager = new SessionManager();
   *
   * // With persistence
   * const sessionManager = new SessionManager({
   *   persistencePath: '.automatosx/sessions/sessions.json'
   * });
   * await sessionManager.initialize();
   *
   * // With custom limit
   * const sessionManager = new SessionManager({
   *   persistencePath: '.automatosx/sessions/sessions.json',
   *   maxSessions: 1000  // For large-scale systems
   * });
   * ```
   */
  constructor(config?: { persistencePath?: string; maxSessions?: number }) {
    this.persistencePath = config?.persistencePath;
    this.MAX_SESSIONS = config?.maxSessions ?? 100;
  }

  /**
   * Initialize session manager (load from persistence if configured)
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager({
   *   persistencePath: '.automatosx/sessions/sessions.json'
   * });
   * await sessionManager.initialize();
   * ```
   */
  async initialize(): Promise<void> {
    if (this.persistencePath) {
      await this.loadFromFile();
    }
  }

  /**
   * Create a new session
   *
   * @param task - Overall task/goal for the session
   * @param initiator - Agent that initiated the session
   * @returns Created session
   *
   * @example
   * ```typescript
   * const session = await sessionManager.createSession(
   *   'Implement authentication feature',
   *   'backend'
   * );
   * console.log('Session created:', session.id);
   * ```
   */
  async createSession(task: string, initiator: string): Promise<Session> {
    // Auto cleanup if approaching limit (prevent memory exhaustion)
    if (this.activeSessions.size >= this.MAX_SESSIONS) {
      logger.info('Session limit approaching, running auto cleanup', {
        current: this.activeSessions.size,
        limit: this.MAX_SESSIONS
      });
      await this.cleanup();  // Remove oldest completed sessions
    }

    // Generate unique session ID (handle extremely rare UUID collisions)
    let sessionId = randomUUID();
    let attempts = 0;
    const MAX_UUID_ATTEMPTS = 100;
    while (this.activeSessions.has(sessionId)) {
      if (++attempts >= MAX_UUID_ATTEMPTS) {
        throw new SessionError(
          `Failed to generate unique session ID after ${MAX_UUID_ATTEMPTS} attempts`,
          undefined,
          'creation_failed'
        );
      }
      sessionId = randomUUID();
    }

    const session: Session = {
      id: sessionId,
      initiator,
      task,
      agents: [initiator],  // Initiator is first agent
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };

    this.activeSessions.set(session.id, session);

    logger.info('Session created', {
      sessionId: session.id,
      initiator,
      task: task.substring(0, 100) + (task.length > 100 ? '...' : '')
    });

    // Cleanup old completed/failed sessions (prevents memory leak)
    // This runs after session creation to avoid blocking the creation process
    await this.cleanupOldSessions(7); // Clean sessions older than 7 days

    // Persist to file
    this.saveToFile();

    return session;
  }

  /**
   * Add an agent to an existing session
   *
   * @param sessionId - Session ID
   * @param agentName - Agent to add
   * @throws {SessionError} If session not found
   *
   * @example
   * ```typescript
   * await sessionManager.addAgent(session.id, 'frontend');
   * await sessionManager.addAgent(session.id, 'security');
   * ```
   */
  async addAgent(sessionId: string, agentName: string): Promise<void> {
    // Validate session ID format
    this.validateSessionId(sessionId);

    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new SessionError(
        `Session not found: ${sessionId}`,
        sessionId,
        'not_found'
      );
    }

    // Only add if not already in the session
    if (!session.agents.includes(agentName)) {
      session.agents.push(agentName);
      session.updatedAt = new Date();

      logger.debug('Agent added to session', {
        sessionId,
        agentName,
        totalAgents: session.agents.length
      });

      // Persist to file
      this.saveToFile();
    }
  }

  /**
   * Get a session by ID
   *
   * @param sessionId - Session ID
   * @returns Session if found, null otherwise
   *
   * @example
   * ```typescript
   * const session = await sessionManager.getSession('session-123');
   * if (session) {
   *   console.log('Session status:', session.status);
   * }
   * ```
   */
  async getSession(sessionId: string): Promise<Session | null> {
    // Validate session ID format (return null for invalid IDs)
    try {
      this.validateSessionId(sessionId);
    } catch {
      return null;  // Invalid format = session doesn't exist
    }

    return this.activeSessions.get(sessionId) ?? null;
  }

  /**
   * Get all active sessions
   *
   * @returns Array of active sessions
   *
   * @example
   * ```typescript
   * const active = await sessionManager.getActiveSessions();
   * console.log(`${active.length} active sessions`);
   * ```
   */
  async getActiveSessions(): Promise<Session[]> {
    return Array.from(this.activeSessions.values())
      .filter(s => s.status === 'active');
  }

  /**
   * Get total number of sessions (all statuses)
   *
   * @returns Total session count
   *
   * @example
   * ```typescript
   * const total = await sessionManager.getTotalSessionCount();
   * console.log(`${total} total sessions`);
   * ```
   */
  async getTotalSessionCount(): Promise<number> {
    return this.activeSessions.size;
  }

  /**
   * Get active sessions for a specific agent
   *
   * @param agentName - Agent name
   * @returns Array of sessions where agent is involved
   *
   * @example
   * ```typescript
   * const sessions = await sessionManager.getActiveSessionsForAgent('backend');
   * console.log(`Backend is involved in ${sessions.length} sessions`);
   * ```
   */
  async getActiveSessionsForAgent(agentName: string): Promise<Session[]> {
    return Array.from(this.activeSessions.values())
      .filter(s =>
        s.status === 'active' &&
        s.agents.includes(agentName)
      )
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Complete a session successfully
   *
   * @param sessionId - Session ID
   * @throws {SessionError} If session not found
   *
   * @example
   * ```typescript
   * await sessionManager.completeSession(session.id);
   * ```
   */
  async completeSession(sessionId: string): Promise<void> {
    // Validate session ID format
    this.validateSessionId(sessionId);

    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new SessionError(
        `Session not found: ${sessionId}`,
        sessionId,
        'not_found'
      );
    }

    if (session.status === 'completed') {
      logger.warn('Session already completed', { sessionId });
      return;
    }

    session.status = 'completed';
    session.updatedAt = new Date();

    const duration = session.updatedAt.getTime() - session.createdAt.getTime();

    logger.info('Session completed', {
      sessionId,
      duration: `${(duration / 1000).toFixed(1)}s`,
      agents: session.agents.length,
      agentList: session.agents.join(', ')
    });

    // Persist to file
    this.saveToFile();
  }

  /**
   * Mark a session as failed
   *
   * @param sessionId - Session ID
   * @param error - Error that caused the failure
   * @throws {SessionError} If session not found
   *
   * @example
   * ```typescript
   * try {
   *   await delegateToAgent(...);
   * } catch (error) {
   *   await sessionManager.failSession(session.id, error);
   * }
   * ```
   */
  async failSession(sessionId: string, error: Error): Promise<void> {
    // Validate session ID format (gracefully handle invalid IDs)
    try {
      this.validateSessionId(sessionId);
    } catch {
      logger.warn('Cannot fail session - invalid ID format', { sessionId });
      return;
    }

    const session = this.activeSessions.get(sessionId);

    if (!session) {
      // Session might have been cleaned up, just log and return
      logger.warn('Cannot fail session - not found', { sessionId });
      return;
    }

    session.status = 'failed';
    session.updatedAt = new Date();
    session.metadata = {
      ...session.metadata,
      error: error.message,
      errorStack: error.stack
    };

    logger.warn('Session failed', {
      sessionId,
      error: error.message,
      agents: session.agents.join(', ')
    });

    // Persist to file
    this.saveToFile();
  }

  /**
   * Update session metadata
   *
   * @param sessionId - Session ID
   * @param metadata - Metadata to merge
   * @throws {SessionError} If session not found
   *
   * @example
   * ```typescript
   * await sessionManager.updateMetadata(session.id, {
   *   priority: 'high',
   *   tags: ['auth', 'security']
   * });
   * ```
   */
  async updateMetadata(
    sessionId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // Validate session ID format
    this.validateSessionId(sessionId);

    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new SessionError(
        `Session not found: ${sessionId}`,
        sessionId,
        'not_found'
      );
    }

    // Merge metadata
    const newMetadata = {
      ...session.metadata,
      ...metadata
    };

    // Check metadata size (prevent DoS attacks)
    // Use Buffer.byteLength for accurate byte count (handles multi-byte characters)
    let metadataSize: number;
    try {
      metadataSize = Buffer.byteLength(JSON.stringify(newMetadata), 'utf-8');
    } catch (error) {
      throw new SessionError(
        `Metadata contains circular reference or non-serializable value: ${(error as Error).message}`,
        sessionId,
        'metadata_too_large'
      );
    }

    if (metadataSize > this.MAX_METADATA_SIZE) {
      throw new SessionError(
        `Metadata too large: ${metadataSize} bytes (max: ${this.MAX_METADATA_SIZE} bytes)`,
        sessionId,
        'metadata_too_large'
      );
    }

    session.metadata = newMetadata;
    session.updatedAt = new Date();

    logger.debug('Session metadata updated', {
      sessionId,
      metadata: Object.keys(metadata)
    });

    // Persist to file
    this.saveToFile();
  }

  /**
   * Cleanup old sessions (keep last MAX_SESSIONS)
   *
   * Removes oldest sessions (by update time) when limit is exceeded.
   *
   * @returns Number of sessions removed
   *
   * @example
   * ```typescript
   * const removed = await sessionManager.cleanup();
   * console.log(`Cleaned up ${removed} old sessions`);
   * ```
   */
  async cleanup(): Promise<number> {
    if (this.activeSessions.size <= this.MAX_SESSIONS) {
      return 0;
    }

    // Prioritize removing completed/failed sessions over active ones
    // Sort by: 1) status (completed/failed first), 2) update time (oldest first)
    const sessions = Array.from(this.activeSessions.values())
      .sort((a, b) => {
        // Priority: completed/failed before active
        const statusPriority = (s: Session) => s.status === 'active' ? 1 : 0;
        const priorityDiff = statusPriority(a) - statusPriority(b);
        if (priorityDiff !== 0) return priorityDiff;

        // If same status, sort by update time (oldest first)
        return a.updatedAt.getTime() - b.updatedAt.getTime();
      });

    // Calculate how many to remove
    const toRemoveCount = sessions.length - this.MAX_SESSIONS;
    const toRemove = sessions.slice(0, toRemoveCount);

    // Remove selected sessions
    toRemove.forEach(session => {
      this.activeSessions.delete(session.id);
    });

    if (toRemoveCount > 0) {
      const statusCount = toRemove.reduce((acc, s) => {
        acc[s.status] = (acc[s.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      logger.info('Sessions cleaned up', {
        removed: toRemoveCount,
        remaining: this.activeSessions.size,
        removedByStatus: statusCount
      });

      // Persist to file
      this.saveToFile();
    }

    return toRemoveCount;
  }

  /**
   * Cleanup old completed/failed sessions
   *
   * Removes sessions that are completed or failed and older than the specified age.
   * This prevents memory leaks from inactive sessions.
   *
   * @param maxAgeDays - Maximum age in days (default: 7 days)
   * @returns Object with removed count and removed session IDs
   *
   * @example
   * ```typescript
   * // Clean up sessions older than 7 days
   * const result = await sessionManager.cleanupOldSessions();
   * console.log(`Removed ${result.removedCount} sessions`);
   *
   * // v5.2: Session workspaces no longer exist
   * // All agents share automatosx/PRD and automatosx/tmp
   * ```
   */
  async cleanupOldSessions(maxAgeDays: number = 7): Promise<{
    removedCount: number;
    removedSessionIds: string[];
  }> {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const sessions = Array.from(this.activeSessions.values());

    // Only remove completed/failed sessions (keep active ones)
    const toRemove = sessions.filter(s =>
      (s.status === 'completed' || s.status === 'failed') &&
      s.updatedAt.getTime() < cutoffTime
    );

    const removedSessionIds = toRemove.map(s => s.id);
    toRemove.forEach(s => this.activeSessions.delete(s.id));

    if (toRemove.length > 0) {
      logger.info('Old sessions cleaned up', {
        removed: toRemove.length,
        cutoffDays: maxAgeDays,
        remaining: this.activeSessions.size,
        removedSessionIds: removedSessionIds.slice(0, 5)  // Log first 5 IDs
      });

      // Persist to file
      this.saveToFile();
    }

    return {
      removedCount: toRemove.length,
      removedSessionIds
    };
  }

  /**
   * Clear all sessions (mainly for testing)
   *
   * @returns Number of sessions removed
   *
   * @example
   * ```typescript
   * await sessionManager.clearAll();
   * ```
   */
  async clearAll(): Promise<number> {
    const count = this.activeSessions.size;
    this.activeSessions.clear();

    if (count > 0) {
      logger.info('All sessions cleared', { count });

      // Persist to file
      this.saveToFile();
    }

    return count;
  }

  /**
   * Destroy session manager (cleanup resources)
   *
   * Clears pending save timeout and flushes any pending save operations.
   * Should be called before discarding the SessionManager instance.
   *
   * @example
   * ```typescript
   * const sessionManager = new SessionManager({...});
   * // ... use sessionManager ...
   * await sessionManager.destroy();
   * ```
   */
  async destroy(): Promise<void> {
    // Clear timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;
    }

    // Flush pending save (best effort - don't let errors prevent destroy)
    try {
      await this.flushSave();
    } catch (error) {
      logger.error('Error flushing save during destroy', {
        error: (error as Error).message
      });
      // Continue with destroy even if flush fails
    }

    logger.debug('SessionManager destroyed', {
      sessions: this.activeSessions.size
    });
  }

  /**
   * Flush pending save operation (wait for completion)
   *
   * Forces immediate save if there's a pending debounced save.
   *
   * @private
   */
  private async flushSave(): Promise<void> {
    // If there's a debounced save pending, cancel it and do immediate save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = undefined;

      // If there's also a pendingSave, wait for it first to avoid concurrent saves
      if (this.pendingSave) {
        try {
          await this.pendingSave;
        } catch (err) {
          // Ignore errors from previous save, we'll try again below
        }
      }

      // Do immediate save
      await this.doSave();
      return;
    }

    // No timeout, but there might be a pending save - wait for it
    if (this.pendingSave) {
      try {
        await this.pendingSave;
      } catch (err) {
        // Re-throw so destroy() knows there was a problem
        throw err;
      }
    }
  }

  /**
   * Perform actual save operation (internal)
   *
   * @private
   */
  private async doSave(): Promise<void> {
    if (!this.persistencePath) {
      return;
    }

    try {
      // Ensure directory exists
      await mkdir(dirname(this.persistencePath), { recursive: true });

      // Convert sessions to plain objects (Date -> string)
      const sessionsArray = Array.from(this.activeSessions.values()).map(session => ({
        id: session.id,
        initiator: session.initiator,
        task: session.task,
        agents: session.agents,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        metadata: session.metadata
      }));

      const data = JSON.stringify(sessionsArray, null, 2);

      // Atomic write: write to temp file then rename (prevents corruption)
      const tempPath = `${this.persistencePath}.tmp`;

      try {
        await writeFile(tempPath, data, 'utf-8');
        await rename(tempPath, this.persistencePath);

        logger.debug('Sessions saved to persistence', {
          path: this.persistencePath,
          count: sessionsArray.length
        });
      } catch (renameError) {
        // Clean up temp file if rename failed (prevents accumulation)
        try {
          await unlink(tempPath);
        } catch (unlinkError) {
          // Ignore unlink errors (file might not exist)
        }
        throw renameError;
      }
    } catch (error) {
      logger.error('Failed to save sessions to persistence', {
        path: this.persistencePath,
        error: (error as Error).message
      });
      throw error; // Re-throw for caller to handle
    }
  }

  /**
   * Get statistics about current sessions
   *
   * @returns Session statistics
   *
   * @example
   * ```typescript
   * const stats = await sessionManager.getStats();
   * console.log(`Active: ${stats.active}, Total: ${stats.total}`);
   * ```
   */
  async getStats(): Promise<{
    total: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const sessions = Array.from(this.activeSessions.values());

    return {
      total: sessions.length,
      active: sessions.filter(s => s.status === 'active').length,
      completed: sessions.filter(s => s.status === 'completed').length,
      failed: sessions.filter(s => s.status === 'failed').length
    };
  }

  /**
   * Load sessions from persistence file
   *
   * @private
   */
  private async loadFromFile(): Promise<void> {
    if (!this.persistencePath) {
      return;
    }

    try {
      const data = await readFile(this.persistencePath, 'utf-8');
      const sessionsArray = JSON.parse(data) as Array<{
        id: string;
        initiator: string;
        task: string;
        agents: string[];
        status: 'active' | 'completed' | 'failed';
        createdAt: string;
        updatedAt: string;
        metadata: Record<string, any>;
      }>;

      // Convert date strings back to Date objects
      this.activeSessions.clear();
      let skippedCount = 0;

      for (const sessionData of sessionsArray) {
        // Validate session ID before loading (security check)
        try {
          this.validateSessionId(sessionData.id);
        } catch (error) {
          skippedCount++;
          logger.warn('Skipping invalid session ID from persistence', {
            sessionId: sessionData.id,
            error: (error as Error).message
          });
          continue;
        }

        // Validate dates (protect against Invalid Date objects)
        const createdAt = new Date(sessionData.createdAt);
        const updatedAt = new Date(sessionData.updatedAt);

        if (isNaN(createdAt.getTime()) || isNaN(updatedAt.getTime())) {
          skippedCount++;
          logger.warn('Skipping session with invalid dates from persistence', {
            sessionId: sessionData.id,
            createdAt: sessionData.createdAt,
            updatedAt: sessionData.updatedAt
          });
          continue;
        }

        const session: Session = {
          ...sessionData,
          createdAt,
          updatedAt
        };
        this.activeSessions.set(session.id, session);
      }

      logger.info('Sessions loaded from persistence', {
        path: this.persistencePath,
        loaded: this.activeSessions.size,
        skipped: skippedCount,
        total: sessionsArray.length
      });
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // File not found is OK (first time initialization)
      if (err.code === 'ENOENT') {
        logger.debug('No existing sessions file, starting fresh', {
          path: this.persistencePath
        });
        return;
      }

      // For other errors (corrupted JSON, permission issues, etc.),
      // backup the corrupted file and start fresh
      try {
        const backupPath = `${this.persistencePath}.corrupted.${Date.now()}`;
        await copyFile(this.persistencePath, backupPath);

        logger.error('Corrupted sessions file backed up, starting fresh', {
          path: this.persistencePath,
          backupPath,
          error: err.message
        });
      } catch (backupError) {
        // If backup fails, just log and continue
        logger.error('Failed to backup corrupted sessions file', {
          path: this.persistencePath,
          error: err.message,
          backupError: (backupError as Error).message
        });
      }
    }
  }

  /**
   * Save sessions to persistence file (debounced)
   *
   * @private
   */
  private saveToFile(): void {
    if (!this.persistencePath) {
      return;
    }

    // Debounce saves to avoid excessive file writes
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    this.saveTimeout = setTimeout(() => {
      this.pendingSave = this.doSave().catch(err => {
        logger.error('Debounced save failed', {
          error: err.message
        });
        // Re-throw to keep promise rejected (so flushSave can detect failures)
        throw err;
      });
    }, 100); // 100ms debounce
  }
}
