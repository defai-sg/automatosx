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
  RetryConfig,
  StreamingOptions
} from '../types/provider.js';
import { logger } from '../utils/logger.js';
import { ProviderResponseCache } from '../core/cache.js';
import { existsSync } from 'fs';
import { findOnPath } from '../core/cli-provider-detector.js';
import { shouldAutoEnableMockProviders } from '../utils/environment.js';

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
  abstract get version(): string;
  abstract get capabilities(): ProviderCapabilities;

  // Name and priority from config
  get name(): string {
    return this.config.name;
  }

  get priority(): number {
    return this.config.priority;
  }

  protected abstract executeRequest(request: ExecutionRequest): Promise<ExecutionResponse>;
  protected abstract generateEmbeddingInternal(text: string, options?: EmbeddingOptions): Promise<number[]>;

  /**
   * Build CLI arguments for execution
   * @param request Execution request containing parameters
   * @returns Array of CLI arguments
   */
  protected abstract buildCLIArgs(request: ExecutionRequest): string[];

  /**
   * Check if provider supports streaming
   * @returns true if provider supports streaming
   */
  abstract supportsStreaming(): boolean;

  /**
   * Execute with streaming (if supported)
   * @param request Execution request
   * @param options Streaming options
   * @returns Execution response
   */
  async executeStreaming?(
    request: ExecutionRequest,
    options: StreamingOptions
  ): Promise<ExecutionResponse>;

  /**
   * Check if provider supports a specific parameter
   * @param param Parameter name to check
   * @returns true if parameter is supported
   */
  protected abstract supportsParameter(
    param: 'maxTokens' | 'temperature' | 'topP'
  ): boolean;

  // Health & Availability
  async isAvailable(): Promise<boolean> {
    if (!this.config.enabled || !this.health.available) {
      return false;
    }

    // Check if mock mode should be enabled (explicit or auto-detected)
    if (shouldAutoEnableMockProviders()) {
      logger.debug(`Mock providers enabled for ${this.config.name}`, {
        provider: this.config.name,
        reason: 'Auto-detected AI IDE environment or explicit AUTOMATOSX_MOCK_PROVIDERS=true'
      });
      return true;
    }

    // Check if CLI command actually exists (with enhanced detection)
    return this.checkCLIAvailabilityEnhanced();
  }

  /**
   * Enhanced CLI availability check with ENV variable and config path support.
   * Falls back to standard PATH detection if no overrides configured.
   * Also validates minimum version requirement if configured.
   *
   * Priority:
   * 1. ENV variable (e.g., CLAUDE_CLI, GEMINI_CLI, CODEX_CLI)
   * 2. Config customPath
   * 3. Standard PATH detection
   * 4. Version validation (if minVersion configured)
   *
   * @returns true if CLI is available and meets version requirement
   */
  private async checkCLIAvailabilityEnhanced(): Promise<boolean> {
    let detectedPath: string | null = null;

    // 1. Check ENV variable override (highest priority)
    const envVarName = `${this.config.name.toUpperCase().replace(/-/g, '_')}_CLI`;
    const envPath = process.env[envVarName];

    if (envPath) {
      logger.debug(`Checking ENV variable ${envVarName}`, { path: envPath });

      if (this.checkPathExists(envPath)) {
        logger.debug(`Provider ${this.config.name} found via ENV variable`, {
          envVar: envVarName,
          path: envPath
        });
        detectedPath = envPath;
      } else {
        logger.warn(`ENV variable ${envVarName} points to non-existent path`, {
          path: envPath
        });
        // Continue to next detection method
      }
    }

    // 2. Check config customPath (second priority)
    if (!detectedPath && this.config.customPath) {
      logger.debug(`Checking config customPath`, { path: this.config.customPath });

      if (this.checkPathExists(this.config.customPath)) {
        logger.debug(`Provider ${this.config.name} found via config customPath`, {
          path: this.config.customPath
        });
        detectedPath = this.config.customPath;
      } else {
        logger.warn(`Config customPath points to non-existent path`, {
          path: this.config.customPath
        });
        // Continue to fallback
      }
    }

    // 3. Fall back to standard PATH detection (lowest priority)
    if (!detectedPath) {
      logger.debug(`Using standard PATH detection for ${this.config.name}`);
      const available = await this.checkCLIAvailability();
      if (!available) {
        return false;
      }
      detectedPath = this.config.command; // Use command name for version check
    }

    // 4. Validate minimum version if configured
    if (this.config.minVersion && detectedPath) {
      logger.debug('Checking minimum version requirement', {
        provider: this.config.name,
        minVersion: this.config.minVersion
      });

      const actualVersion = await this.getProviderVersion(detectedPath);
      if (!actualVersion) {
        logger.warn('Could not detect provider version, allowing by default', {
          provider: this.config.name,
          path: detectedPath
        });
        return true; // Permissive: allow if version check fails
      }

      const meetsRequirement = this.compareVersions(actualVersion, this.config.minVersion);
      if (!meetsRequirement) {
        logger.warn('Provider version too old', {
          provider: this.config.name,
          actualVersion,
          minVersion: this.config.minVersion
        });
        return false;
      }

      logger.debug('Provider version meets requirement', {
        provider: this.config.name,
        actualVersion,
        minVersion: this.config.minVersion
      });
    }

    return true;
  }

  /**
   * Check if a file path exists and is accessible.
   * Validates path to prevent path traversal attacks.
   *
   * @param path File path to check
   * @returns true if path exists and is valid
   */
  private checkPathExists(path: string): boolean {
    try {
      // Security: Reject suspicious path patterns
      if (path.includes('..')) {
        logger.warn('Path traversal pattern detected (..)', { path });
        return false;
      }

      if (path.startsWith('~') || path.includes('~')) {
        logger.warn('Home directory shortcut detected (~)', { path });
        return false;
      }

      // Check if path exists
      return existsSync(path);
    } catch (error) {
      logger.debug(`Error checking path existence`, {
        path,
        error: (error as Error).message
      });
      return false;
    }
  }

  /**
   * Parse semantic version string into comparable parts.
   * Supports formats: "1.2.3", "v1.2.3", "1.2", "1"
   *
   * @param versionStr Version string to parse
   * @returns Parsed version parts [major, minor, patch] or null if invalid
   */
  private parseVersion(versionStr: string): number[] | null {
    try {
      // Remove 'v' prefix if present
      const cleaned = versionStr.trim().replace(/^v/i, '');

      // Extract version numbers (handle formats like "1.2.3-beta" -> "1.2.3")
      const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
      if (!match) {
        return null;
      }

      const major = parseInt(match[1] || '0', 10);
      const minor = parseInt(match[2] || '0', 10);
      const patch = parseInt(match[3] || '0', 10);

      return [major, minor, patch];
    } catch (error) {
      logger.debug('Failed to parse version', { versionStr, error });
      return null;
    }
  }

  /**
   * Compare two semantic versions.
   *
   * @param version Version to check
   * @param minVersion Minimum required version
   * @returns true if version >= minVersion
   */
  private compareVersions(version: string, minVersion: string): boolean {
    const v1 = this.parseVersion(version);
    const v2 = this.parseVersion(minVersion);

    if (!v1 || !v2) {
      // If parsing fails, allow the version (permissive)
      logger.debug('Version parsing failed, allowing by default', { version, minVersion });
      return true;
    }

    // Compare major.minor.patch
    for (let i = 0; i < 3; i++) {
      if ((v1[i] ?? 0) > (v2[i] ?? 0)) return true;
      if ((v1[i] ?? 0) < (v2[i] ?? 0)) return false;
    }

    return true; // Versions are equal
  }

  /**
   * Get CLI version by executing --version command.
   *
   * @param command CLI command to check
   * @returns Version string or null if detection fails
   */
  private async getProviderVersion(command: string): Promise<string | null> {
    try {
      const { spawnSync } = await import('child_process');

      const result = spawnSync(command, ['--version'], {
        encoding: 'utf8',
        timeout: 5000,
        stdio: 'pipe'
      });

      if (result.status === 0 && result.stdout) {
        // Extract version from output (usually first line)
        const output = result.stdout.trim();
        const match = output.match(/\d+\.\d+\.\d+/);
        return match ? match[0] : (output.split('\n')[0] || null);
      }

      return null;
    } catch (error) {
      logger.debug('Failed to get provider version', { command, error });
      return null;
    }
  }

  /**
   * Check if the CLI command is available in the system (standard PATH detection)
   * Uses cross-platform detection from cli-provider-detector for Windows compatibility
   */
  private async checkCLIAvailability(): Promise<boolean> {
    try {
      // v5.3.4: Use cross-platform detection logic (Windows: where.exe + PATHEXT, Unix: which)
      const result = findOnPath(this.config.command);

      if (!result.found) {
        logger.warn(`CLI command not found: ${this.config.command}`);
        return false;
      }

      logger.debug(`Provider ${this.config.name} found on PATH`, {
        command: this.config.command,
        path: result.path
      });

      return true;
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
