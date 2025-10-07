/**
 * BaseProvider - Abstract base class for all AI providers
 *
 * Provides common functionality:
 * - Rate limiting with token bucket algorithm
 * - Exponential backoff retry logic
 * - Health monitoring and circuit breaker
 * - Cost tracking and estimation
 * - Error categorization
 */

import type {
  Provider,
  ProviderConfig,
  ProviderCapabilities,
  ExecutionRequest,
  ExecutionResponse,
  HealthStatus,
  RateLimitStatus,
  Cost,
  UsageStats,
  EmbeddingOptions,
  RetryConfig
} from '../types/provider.js';
import { logger } from '../utils/logger.js';
import { ProviderResponseCache } from '../core/cache.js';

export abstract class BaseProvider implements Provider {
  protected config: ProviderConfig;
  protected health: HealthStatus;
  protected usageStats: UsageStats;
  protected rateLimitState: {
    requests: number[];  // timestamps of recent requests
    tokens: number[];    // token usage with timestamps
    concurrentRequests: number;
  };
  protected responseCache: ProviderResponseCache;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.health = {
      available: true,
      latencyMs: 0,
      errorRate: 0,
      consecutiveFailures: 0
    };
    this.usageStats = {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      averageLatencyMs: 0,
      errorCount: 0
    };
    this.rateLimitState = {
      requests: [],
      tokens: [],
      concurrentRequests: 0
    };
    // Initialize response cache with 5 minute TTL
    this.responseCache = new ProviderResponseCache({
      maxEntries: 100,
      ttl: 300000, // 5 minutes
      maxSize: 10 * 1024 * 1024, // 10MB
      debug: false
    });
  }

  // Abstract methods to be implemented by concrete providers
  abstract get name(): string;
  abstract get version(): string;
  abstract get capabilities(): ProviderCapabilities;

  // Priority from config
  get priority(): number {
    return this.config.priority;
  }

  protected abstract executeRequest(request: ExecutionRequest): Promise<ExecutionResponse>;
  protected abstract generateEmbeddingInternal(text: string, options?: EmbeddingOptions): Promise<number[]>;

  // Health & Availability
  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled || !this.health.available) {
      return false;
    }

    // Check if CLI command actually exists
    return this.checkCLIAvailability();
  }

  /**
   * Check if the CLI command is available in the system
   */
  private async checkCLIAvailability(): Promise<boolean> {
    try {
      const { spawn } = await import('child_process');

      return new Promise<boolean>((resolve) => {
        // Try to spawn the command with --version or --help
        const child = spawn(this.config.command, ['--version'], {
          stdio: 'ignore',
          timeout: 5000
        });

        let resolved = false;

        child.on('close', (code) => {
          if (!resolved) {
            resolved = true;
            // Consider success if exit code is 0 or 1 (some CLIs return 1 for --version)
            resolve(code === 0 || code === 1);
          }
        });

        child.on('error', (error: NodeJS.ErrnoException) => {
          if (!resolved) {
            resolved = true;
            // ENOENT means command not found
            if (error.code === 'ENOENT') {
              logger.warn(`CLI command not found: ${this.config.command}`);
              resolve(false);
            } else {
              // Other errors might be temporary
              resolve(true);
            }
          }
        });

        // Timeout fallback
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            child.kill();
            resolve(false);
          }
        }, 5000);
      });
    } catch (error) {
      logger.error(`Error checking CLI availability: ${(error as Error).message}`);
      return false;
    }
  }

  async getHealth(): Promise<HealthStatus> {
    return { ...this.health };
  }

  // Execution with retry logic
  async execute(request: ExecutionRequest): Promise<ExecutionResponse> {
    if (!await this.isAvailable()) {
      throw new Error(`Provider ${this.name} is not available`);
    }

    // Check rate limits
    await this.waitForCapacity();

    // Check cache before executing
    const messages = this.requestToMessages(request);
    const cacheOptions = {
      temperature: request.temperature,
      maxTokens: request.maxTokens
    };
    const cached = this.responseCache.get(
      this.name,
      request.model || 'default',
      messages,
      cacheOptions
    );

    if (cached) {
      logger.debug('Provider cache hit', {
        provider: this.name,
        model: request.model
      });

      // Return cached response (reconstruct ExecutionResponse)
      return {
        content: cached.response,
        model: request.model || 'default',
        tokensUsed: cached.usage || {
          prompt: this.estimateTokens(request.prompt),
          completion: this.estimateTokens(cached.response),
          total: this.estimateTokens(request.prompt) + this.estimateTokens(cached.response)
        },
        latencyMs: 0, // Cached response has no latency
        finishReason: 'stop'
      };
    }

    const retryPolicy = this.config.retryPolicy ?? this.getDefaultRetryPolicy();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryPolicy.maxAttempts; attempt++) {
      try {
        // Track concurrent requests
        this.rateLimitState.concurrentRequests++;
        const startTime = Date.now();

        const response = await this.executeWithTimeout(request);

        // Update metrics
        const latency = Date.now() - startTime;
        this.updateMetrics(response, latency);
        this.health.consecutiveFailures = 0;

        // Cache successful response
        this.responseCache.set(
          this.name,
          request.model || 'default',
          messages,
          response.content,
          cacheOptions,
          response.tokensUsed
        );

        return response;

      } catch (error) {
        lastError = error as Error;
        this.health.consecutiveFailures++;
        this.usageStats.errorCount++;

        logger.error(`Provider ${this.name} execution failed (attempt ${attempt})`, {
          error: lastError.message,
          attempt,
          maxAttempts: retryPolicy.maxAttempts
        });

        // Check if we should retry
        if (attempt < retryPolicy.maxAttempts && this.shouldRetry(lastError)) {
          const delay = this.getRetryDelay(attempt);
          logger.info(`Retrying after ${delay}ms...`);
          await this.sleep(delay);
        } else {
          break;
        }
      } finally {
        this.rateLimitState.concurrentRequests--;
      }
    }

    // All retries failed
    this.updateHealthAfterFailure();
    throw lastError || new Error('Execution failed');
  }

  // Embeddings
  async generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]> {
    if (!this.capabilities.supportsEmbedding) {
      throw new Error(`Provider ${this.name} does not support embeddings`);
    }

    return this.generateEmbeddingInternal(text, options);
  }

  // Rate Limiting - Token Bucket Algorithm
  async checkRateLimit(): Promise<RateLimitStatus> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean old entries
    this.rateLimitState.requests = this.rateLimitState.requests.filter(t => t > oneMinuteAgo);
    this.rateLimitState.tokens = this.rateLimitState.tokens.filter(t => t > oneMinuteAgo);

    const limits = this.config.rateLimits;
    if (!limits) {
      return {
        hasCapacity: true,
        requestsRemaining: Infinity,
        tokensRemaining: Infinity,
        resetAtMs: now + 60000
      };
    }

    const requestsRemaining = limits.maxRequestsPerMinute - this.rateLimitState.requests.length;
    const tokensRemaining = limits.maxTokensPerMinute - this.rateLimitState.tokens.length;
    const concurrentOk = this.rateLimitState.concurrentRequests < limits.maxConcurrentRequests;

    return {
      hasCapacity: requestsRemaining > 0 && tokensRemaining > 0 && concurrentOk,
      requestsRemaining,
      tokensRemaining,
      resetAtMs: now + 60000
    };
  }

  async waitForCapacity(): Promise<void> {
    const maxWaitMs = 60000; // 1 minute max wait
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.checkRateLimit();

      if (status.hasCapacity) {
        // Reserve capacity
        this.rateLimitState.requests.push(Date.now());
        return;
      }

      // Wait until reset time
      const waitMs = Math.min(status.resetAtMs - Date.now(), 1000);
      await this.sleep(waitMs);
    }

    throw new Error(`Rate limit exceeded for provider ${this.name}`);
  }

  // Cost Management (to be overridden by providers with specific pricing)
  async estimateCost(request: ExecutionRequest): Promise<Cost> {
    // Default implementation - providers should override with actual pricing
    const estimatedTokens = this.estimateTokens(request.prompt);
    return {
      estimatedUsd: 0,
      tokensUsed: estimatedTokens
    };
  }

  async getUsageStats(): Promise<UsageStats> {
    return { ...this.usageStats };
  }

  // Error Handling
  shouldRetry(error: Error): boolean {
    // Default: retry on network errors, rate limits, timeouts
    const retryableErrors = [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'rate_limit',
      'timeout'
    ];

    return retryableErrors.some(msg =>
      error.message.toLowerCase().includes(msg.toLowerCase())
    );
  }

  getRetryDelay(attempt: number): number {
    const policy = this.config.retryPolicy ?? this.getDefaultRetryPolicy();
    const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
    return Math.min(delay, policy.maxDelayMs);
  }

  // Protected helper methods
  protected async executeWithTimeout(request: ExecutionRequest): Promise<ExecutionResponse> {
    const timeout = this.config.timeout;

    return Promise.race([
      this.executeRequest(request),
      this.createTimeoutPromise(timeout)
    ]);
  }

  protected createTimeoutPromise(timeoutMs: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
    });
  }

  protected updateMetrics(response: ExecutionResponse, latency: number): void {
    this.usageStats.totalRequests++;
    this.usageStats.totalTokens += response.tokensUsed.total;

    // Update average latency (running average)
    const totalLatency = this.usageStats.averageLatencyMs * (this.usageStats.totalRequests - 1);
    this.usageStats.averageLatencyMs = (totalLatency + latency) / this.usageStats.totalRequests;

    // Update health
    this.health.latencyMs = latency;
    this.health.errorRate = this.usageStats.errorCount / this.usageStats.totalRequests;

    // Track tokens for rate limiting
    for (let i = 0; i < response.tokensUsed.total; i++) {
      this.rateLimitState.tokens.push(Date.now());
    }
  }

  protected updateHealthAfterFailure(): void {
    // Circuit breaker: disable provider after too many consecutive failures
    if (this.health.consecutiveFailures >= 5) {
      this.health.available = false;
      logger.error(`Provider ${this.name} circuit breaker triggered (5 consecutive failures)`);

      // Auto-recover after 60 seconds
      setTimeout(() => {
        this.health.available = true;
        this.health.consecutiveFailures = 0;
        logger.info(`Provider ${this.name} circuit breaker reset`);
      }, 60000);
    }
  }

  protected estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convert ExecutionRequest to messages array for cache key generation
   */
  protected requestToMessages(request: ExecutionRequest): any[] {
    const messages: any[] = [];

    // Add system message if present
    if (request.systemPrompt) {
      messages.push({
        role: 'system',
        content: request.systemPrompt
      });
    }

    // Add user message
    messages.push({
      role: 'user',
      content: request.prompt
    });

    // Include context if present
    if (request.context && Object.keys(request.context).length > 0) {
      messages.push({
        role: 'context',
        content: request.context
      });
    }

    return messages;
  }

  protected getDefaultRetryPolicy(): RetryConfig {
    return {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    };
  }
}
