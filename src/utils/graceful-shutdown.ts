/**
 * Graceful Shutdown Manager
 *
 * Handles process termination gracefully by:
 * - Stopping new requests
 * - Waiting for in-flight operations
 * - Closing database connections
 * - Saving state
 * - Cleaning up resources
 */

import { logger } from './logger.js';

export type ShutdownHandler = () => Promise<void> | void;

export interface ShutdownOptions {
  timeout: number;          // Maximum time to wait for graceful shutdown (ms)
  forceExitOnTimeout: boolean; // Force exit if timeout exceeded
}

const DEFAULT_SHUTDOWN_OPTIONS: ShutdownOptions = {
  timeout: 30000,  // 30 seconds
  forceExitOnTimeout: true
};

export class GracefulShutdownManager {
  private handlers: Array<{
    name: string;
    handler: ShutdownHandler;
    priority: number;
  }> = [];
  private isShuttingDown = false;
  private shutdownPromise: Promise<void> | null = null;

  /**
   * Register a shutdown handler
   * @param name - Handler name for logging
   * @param handler - Async function to execute on shutdown
   * @param priority - Lower numbers execute first (default: 100)
   */
  registerHandler(
    name: string,
    handler: ShutdownHandler,
    priority: number = 100
  ): void {
    this.handlers.push({ name, handler, priority });

    // Sort handlers by priority (ascending)
    this.handlers.sort((a, b) => a.priority - b.priority);

    logger.debug('Shutdown handler registered', {
      name,
      priority,
      totalHandlers: this.handlers.length
    });
  }

  /**
   * Unregister a shutdown handler
   */
  unregisterHandler(name: string): boolean {
    const initialLength = this.handlers.length;
    this.handlers = this.handlers.filter(h => h.name !== name);
    return this.handlers.length < initialLength;
  }

  /**
   * Check if shutdown is in progress
   */
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Execute graceful shutdown
   */
  async shutdown(
    signal: string,
    options: Partial<ShutdownOptions> = {}
  ): Promise<void> {
    // Prevent multiple simultaneous shutdowns
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, waiting...');
      return this.shutdownPromise || Promise.resolve();
    }

    this.isShuttingDown = true;
    const opts = { ...DEFAULT_SHUTDOWN_OPTIONS, ...options };

    this.shutdownPromise = this.executeShutdown(signal, opts);
    return this.shutdownPromise;
  }

  /**
   * Execute shutdown sequence
   */
  private async executeShutdown(
    signal: string,
    options: ShutdownOptions
  ): Promise<void> {
    logger.info('Graceful shutdown initiated', {
      signal,
      timeout: options.timeout,
      handlerCount: this.handlers.length
    });

    const startTime = Date.now();
    let timeoutHandle: NodeJS.Timeout | null = null;

    try {
      // Create cancellable timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Shutdown timeout exceeded (${options.timeout}ms)`));
        }, options.timeout);
      });

      // Execute handlers with timeout
      await Promise.race([
        this.executeHandlers(),
        timeoutPromise
      ]);

      // Clear timeout if handlers completed successfully
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }

      const duration = Date.now() - startTime;
      logger.info('Graceful shutdown completed', {
        signal,
        duration,
        handlersExecuted: this.handlers.length
      });

      process.exit(0);
    } catch (error) {
      // Clear timeout on error
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }

      const duration = Date.now() - startTime;
      logger.error('Graceful shutdown failed', {
        signal,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      if (options.forceExitOnTimeout) {
        logger.warn('Forcing exit due to shutdown timeout');
        process.exit(1);
      } else {
        throw error;
      }
    } finally {
      // Reset state to allow retry if needed
      this.isShuttingDown = false;
      this.shutdownPromise = null;
    }
  }

  /**
   * Execute all registered handlers in priority order
   */
  private async executeHandlers(): Promise<void> {
    for (const { name, handler } of this.handlers) {
      try {
        logger.info('Executing shutdown handler', { name });
        const startTime = Date.now();

        await handler();

        const duration = Date.now() - startTime;
        logger.info('Shutdown handler completed', { name, duration });
      } catch (error) {
        logger.error('Shutdown handler failed', {
          name,
          error: error instanceof Error ? error.message : String(error)
        });
        // Continue with other handlers even if one fails
      }
    }
  }
}

// Global shutdown manager instance
export const shutdownManager = new GracefulShutdownManager();

/**
 * Setup graceful shutdown for common signals
 */
export function setupGracefulShutdown(
  options: Partial<ShutdownOptions> = {}
): void {
  // Handle SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT signal');
    await shutdownManager.shutdown('SIGINT', options);
  });

  // Handle SIGTERM (e.g., from Docker, Kubernetes)
  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal');
    await shutdownManager.shutdown('SIGTERM', options);
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    logger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack
    });
    await shutdownManager.shutdown('uncaughtException', options);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', async (reason) => {
    logger.error('Unhandled promise rejection', {
      reason: reason instanceof Error ? reason.message : String(reason)
    });
    await shutdownManager.shutdown('unhandledRejection', options);
  });

  logger.info('Graceful shutdown handlers registered', {
    signals: ['SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']
  });
}

/**
 * Wait for in-flight operations to complete
 */
export class InFlightTracker {
  private inFlightCount = 0;
  private readonly operations = new Set<string>();

  /**
   * Track start of operation
   */
  start(operationId: string): void {
    this.operations.add(operationId);
    this.inFlightCount++;
  }

  /**
   * Track completion of operation
   */
  complete(operationId: string): void {
    if (this.operations.has(operationId)) {
      this.operations.delete(operationId);
      this.inFlightCount--;
    }
  }

  /**
   * Get count of in-flight operations
   */
  getCount(): number {
    return this.inFlightCount;
  }

  /**
   * Wait for all in-flight operations to complete
   */
  async waitForCompletion(timeoutMs: number = 30000): Promise<void> {
    if (this.inFlightCount === 0) {
      return;
    }

    logger.info('Waiting for in-flight operations', {
      count: this.inFlightCount,
      operations: Array.from(this.operations)
    });

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        if (this.inFlightCount === 0) {
          clearInterval(checkInterval);
          const duration = Date.now() - startTime;
          logger.info('All in-flight operations completed', { duration });
          resolve();
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          reject(new Error(
            `Timeout waiting for in-flight operations (${this.inFlightCount} remaining)`
          ));
        }
      }, 100); // Check every 100ms
    });
  }
}

// Global in-flight tracker
export const inFlightTracker = new InFlightTracker();
