/**
 * Session Manager - Manages multi-agent collaborative sessions
 *
 * @module core/session-manager
 * @since v4.7.0
 */

import { randomUUID } from 'crypto';
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
  private readonly MAX_SESSIONS = 100;

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
    const session: Session = {
      id: randomUUID(),
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

    // Auto-cleanup: both quantity limit and time limit
    // 1. Cleanup if exceeded max sessions count
    if (this.activeSessions.size > this.MAX_SESSIONS) {
      await this.cleanup();
    }

    // 2. Cleanup old completed/failed sessions (prevents memory leak)
    await this.cleanupOldSessions(7); // Clean sessions older than 7 days

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
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      throw new SessionError(
        `Session not found: ${sessionId}`,
        sessionId,
        'not_found'
      );
    }

    session.metadata = {
      ...session.metadata,
      ...metadata
    };
    session.updatedAt = new Date();

    logger.debug('Session metadata updated', {
      sessionId,
      metadata: Object.keys(metadata)
    });
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

    // Sort by update time (oldest first)
    const sessions = Array.from(this.activeSessions.values())
      .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());

    // Calculate how many to remove
    const toRemoveCount = sessions.length - this.MAX_SESSIONS;
    const toRemove = sessions.slice(0, toRemoveCount);

    // Remove oldest sessions
    toRemove.forEach(session => {
      this.activeSessions.delete(session.id);
    });

    if (toRemoveCount > 0) {
      logger.info('Sessions cleaned up', {
        removed: toRemoveCount,
        remaining: this.activeSessions.size
      });
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
   * @returns Number of sessions removed
   *
   * @example
   * ```typescript
   * // Clean up sessions older than 7 days
   * const removed = await sessionManager.cleanupOldSessions();
   *
   * // Clean up sessions older than 1 day
   * const removed = await sessionManager.cleanupOldSessions(1);
   * ```
   */
  async cleanupOldSessions(maxAgeDays: number = 7): Promise<number> {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);
    const sessions = Array.from(this.activeSessions.values());

    // Only remove completed/failed sessions (keep active ones)
    const toRemove = sessions.filter(s =>
      (s.status === 'completed' || s.status === 'failed') &&
      s.updatedAt.getTime() < cutoffTime
    );

    toRemove.forEach(s => this.activeSessions.delete(s.id));

    if (toRemove.length > 0) {
      logger.info('Old sessions cleaned up', {
        removed: toRemove.length,
        cutoffDays: maxAgeDays,
        remaining: this.activeSessions.size
      });
    }

    return toRemove.length;
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
    }

    return count;
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
}
