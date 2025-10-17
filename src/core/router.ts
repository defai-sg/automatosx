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
import type { ResponseCache } from './response-cache.js';

export interface RouterConfig {
  providers: Provider[];
  fallbackEnabled: boolean;
  healthCheckInterval?: number;
  providerCooldownMs?: number; // Cooldown period for failed providers (default: 30000ms)
  cache?: ResponseCache; // Optional response cache
}

export class Router {
  private providers: Provider[];
  private fallbackEnabled: boolean;
  private healthCheckInterval?: NodeJS.Timeout;
  private penalizedProviders: Map<string, number>; // provider name -> penalty expiry timestamp
  private providerCooldownMs: number;
  private cache?: ResponseCache;

  constructor(config: RouterConfig) {
    // Sort providers by priority (lower number = higher priority)
    this.providers = [...config.providers].sort((a, b) => {
      return a.priority - b.priority;
    });
    this.fallbackEnabled = config.fallbackEnabled;
    this.penalizedProviders = new Map();
    this.providerCooldownMs = config.providerCooldownMs ?? 30000; // Default: 30 seconds
    this.cache = config.cache;

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
        // Check cache first (if enabled and available)
        if (this.cache?.isEnabled) {
          const modelParams = {
            temperature: request.temperature,
            maxTokens: request.maxTokens
          };

          const cachedContent = this.cache.get(
            provider.name,
            request.prompt,
            modelParams
          );

          if (cachedContent) {
            logger.info(`Cache hit for provider: ${provider.name}`);

            // Return cached response with minimal latency
            return {
              content: cachedContent,
              model: request.model || 'cached',
              latencyMs: 0,
              tokensUsed: {
                prompt: 0,
                completion: 0,
                total: 0
              },
              finishReason: 'stop',
              cached: true
            };
          }
        }

        logger.info(`Attempting execution with provider: ${provider.name}`);

        const response = await provider.execute(request);

        logger.info(`Execution successful with provider: ${provider.name}`, {
          latency: response.latencyMs,
          tokens: response.tokensUsed.total
        });

        // Cache successful response (if cache is enabled)
        if (this.cache?.isEnabled) {
          const modelParams = {
            temperature: request.temperature,
            maxTokens: request.maxTokens
          };

          this.cache.set(
            provider.name,
            request.prompt,
            response.content,
            modelParams
          );
        }

        // Remove provider from penalty list on success
        this.penalizedProviders.delete(provider.name);

        return response;

      } catch (error) {
        lastError = error as Error;

        logger.warn(`Provider ${provider.name} failed`, {
          error: lastError.message
        });

        // Penalize failed provider (add cooldown period)
        const penaltyExpiry = Date.now() + this.providerCooldownMs;
        this.penalizedProviders.set(provider.name, penaltyExpiry);

        logger.debug(`Provider ${provider.name} penalized until ${new Date(penaltyExpiry).toISOString()}`);

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
   * Filters out penalized providers (those in cooldown period)
   */
  async getAvailableProviders(): Promise<Provider[]> {
    const now = Date.now();

    // Clean up expired penalties
    for (const [providerName, expiryTime] of this.penalizedProviders.entries()) {
      if (now >= expiryTime) {
        this.penalizedProviders.delete(providerName);
        logger.debug(`Provider ${providerName} penalty expired`);
      }
    }

    // Check availability in parallel
    const checks = this.providers.map(async provider => {
      try {
        // Skip penalized providers
        if (this.penalizedProviders.has(provider.name)) {
          const expiryTime = this.penalizedProviders.get(provider.name)!;
          const remainingMs = expiryTime - now;
          logger.debug(`Skipping penalized provider ${provider.name} (${Math.ceil(remainingMs / 1000)}s remaining)`);
          return null;
        }

        // Check if provider is available
        const isAvailable = await provider.isAvailable();
        return isAvailable ? provider : null;
      } catch (error) {
        logger.warn('Provider availability check failed', {
          provider: provider.name,
          error: (error as Error).message
        });
        return null;
      }
    });

    const results = await Promise.all(checks);
    return results.filter((p): p is Provider => p !== null);
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
    const runHealthChecks = async () => {
      try {
        const healthStatus = await this.getHealthStatus();

        logger.debug('Provider health check', {
          providers: Array.from(healthStatus.entries()).map(([name, health]) => ({
            name,
            available: health.available,
            latency: health.latencyMs,
            failures: health.consecutiveFailures
          }))
        });
      } catch (error) {
        logger.warn('Provider health check failed', {
          error: (error as Error).message
        });
      }
    };

    // Set up interval
    this.healthCheckInterval = setInterval(() => {
      void runHealthChecks(); // Explicitly handle promise
    }, intervalMs);

    // Run immediately on start
    void runHealthChecks();
  }

  /**
   * Stop health checks and cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    // Clear penalty list
    this.penalizedProviders.clear();
  }
}
