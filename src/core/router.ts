/**
 * Router - AI Provider Router with Fallback
 *
 * Routes requests to available providers based on:
 * - Provider priority
 * - Provider health
 * - Rate limit status
 * - Automatic fallback on failure
 */

import type {
  Provider,
  ExecutionRequest,
  ExecutionResponse,
  HealthStatus
} from '../types/provider.js';
import { logger } from '../utils/logger.js';
import { ProviderError, ErrorCode } from '../utils/errors.js';

export interface RouterConfig {
  providers: Provider[];
  fallbackEnabled: boolean;
  healthCheckInterval?: number;
}

export class Router {
  private providers: Provider[];
  private fallbackEnabled: boolean;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: RouterConfig) {
    // Sort providers by priority (lower number = higher priority)
    this.providers = [...config.providers].sort((a, b) => {
      return a.priority - b.priority;
    });
    this.fallbackEnabled = config.fallbackEnabled;

    // Start health checks if interval is provided
    if (config.healthCheckInterval) {
      this.startHealthChecks(config.healthCheckInterval);
    }
  }

  /**
   * Execute request with automatic provider fallback
   */
  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      throw ProviderError.noAvailableProviders();
    }

    let lastError: Error | undefined;

    for (const provider of availableProviders) {
      try {
        logger.info(`Attempting execution with provider: ${provider.name}`);

        const response = await provider.execute(request);

        logger.info(`Execution successful with provider: ${provider.name}`, {
          latency: response.latencyMs,
          tokens: response.tokensUsed.total
        });

        return response;

      } catch (error) {
        lastError = error as Error;

        logger.warn(`Provider ${provider.name} failed`, {
          error: lastError.message
        });

        // If fallback is disabled, throw immediately
        if (!this.fallbackEnabled) {
          throw lastError;
        }

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    throw new ProviderError(
      `All providers failed. Last error: ${lastError?.message || 'Unknown error'}`,
      ErrorCode.PROVIDER_NO_AVAILABLE,
      [
        'Check provider availability with "automatosx status"',
        'Verify provider CLIs are installed and in PATH',
        'Check provider configuration in automatosx.config.json',
        'Review error logs for more details'
      ],
      { lastError: lastError?.message }
    );
  }

  /**
   * Get available providers sorted by priority
   */
  async getAvailableProviders(): Promise<Provider[]> {
    const available: Provider[] = [];

    for (const provider of this.providers) {
      if (await provider.isAvailable()) {
        available.push(provider);
      }
    }

    return available;
  }

  /**
   * Get health status of all providers
   */
  async getHealthStatus(): Promise<Map<string, HealthStatus>> {
    const healthMap = new Map<string, HealthStatus>();

    for (const provider of this.providers) {
      const health = await provider.getHealth();
      healthMap.set(provider.name, health);
    }

    return healthMap;
  }

  /**
   * Select best provider based on health and availability
   */
  async selectProvider(): Promise<Provider | null> {
    const availableProviders = await this.getAvailableProviders();

    if (availableProviders.length === 0) {
      return null;
    }

    // Return first available provider (already sorted by priority)
    return availableProviders[0] ?? null;
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(intervalMs: number): void {
    this.healthCheckInterval = setInterval(async () => {
      const healthStatus = await this.getHealthStatus();

      logger.debug('Provider health check', {
        providers: Array.from(healthStatus.entries()).map(([name, health]) => ({
          name,
          available: health.available,
          latency: health.latencyMs,
          failures: health.consecutiveFailures
        }))
      });
    }, intervalMs);
  }

  /**
   * Stop health checks
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
  }
}
