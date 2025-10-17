/**
 * Provider Types - AI Provider Interface Definitions
 */

export interface ProviderConfig {
  name: string;
  enabled: boolean;
  priority: number;
  timeout: number;
  command: string;
  rateLimits?: RateLimitConfig;
  retryPolicy?: RetryConfig;

  // Phase 2 (v5.4.0): Enhanced CLI detection
  /** Custom CLI path override (takes precedence over PATH detection) */
  customPath?: string;
  /** Custom version check argument (default: --version) */
  versionArg?: string;
  /** Minimum required version (semantic versioning) */
  minVersion?: string;
}

export interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxTokensPerMinute: number;
  maxConcurrentRequests: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface ProviderCapabilities {
  supportsStreaming: boolean;
  supportsEmbedding: boolean;
  supportsVision: boolean;
  maxContextTokens: number;
  supportedModels: string[];
}

export interface HealthStatus {
  available: boolean;
  latencyMs: number;
  errorRate: number;
  lastError?: Error;
  consecutiveFailures: number;
  lastCheckTime?: number; // Phase 3: Timestamp of last health check
}

export interface RateLimitStatus {
  hasCapacity: boolean;
  requestsRemaining: number;
  tokensRemaining: number;
  resetAtMs: number;
}

export interface ExecutionRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  context?: Record<string, any>;
  signal?: AbortSignal;  // v5.0.7: Support for execution cancellation
}

export interface ExecutionResponse {
  content: string;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  finishReason: 'stop' | 'length' | 'error';
  cached?: boolean; // Indicates if response came from cache (v5.5.3)
}

export interface Cost {
  estimatedUsd: number;
  tokensUsed: number;
}

export interface UsageStats {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  averageLatencyMs: number;
  errorCount: number;
}

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

/**
 * Streaming Options (v5.3.0)
 *
 * Configuration for streaming execution.
 */
export interface StreamingOptions {
  /** Enable streaming mode */
  enabled: boolean;
  /** Callback for each token received */
  onToken?: (token: string) => void;
  /** Callback for progress updates (0-100) */
  onProgress?: (progress: number) => void;
}

/**
 * Production-ready provider interface
 * Supports rate limiting, cost estimation, health checks
 */
export interface Provider {
  // Metadata
  readonly name: string;
  readonly version: string;
  readonly priority: number;
  readonly capabilities: ProviderCapabilities;

  // Health & Availability
  isAvailable(): Promise<boolean>;
  getHealth(): Promise<HealthStatus>;

  // Execution
  execute(request: ExecutionRequest): Promise<ExecutionResponse>;

  // Streaming (v5.3.0)
  supportsStreaming(): boolean;
  executeStreaming?(
    request: ExecutionRequest,
    options: StreamingOptions
  ): Promise<ExecutionResponse>;

  // Embeddings
  generateEmbedding(text: string, options?: EmbeddingOptions): Promise<number[]>;

  // Rate Limiting
  checkRateLimit(): Promise<RateLimitStatus>;
  waitForCapacity(): Promise<void>;

  // Cost Management
  estimateCost(request: ExecutionRequest): Promise<Cost>;
  getUsageStats(): Promise<UsageStats>;

  // Error Handling
  shouldRetry(error: Error): boolean;
  getRetryDelay(attempt: number): number;

  // Phase 3 (v5.6.3): Cache Observability
  getCacheMetrics(): {
    availability: {
      hits: number;
      misses: number;
      hitRate: number;
      avgAge: number;
      maxAge: number;
      lastHit?: number;
      lastMiss?: number;
    };
    version: {
      hits: number;
      misses: number;
      hitRate: number;
      size: number;
      avgAge: number;
      maxAge: number;
    };
    health: {
      consecutiveFailures: number;
      consecutiveSuccesses: number;
      lastCheckTime?: number;
      lastCheckDuration: number;
      uptime: number;
    };
  };
  clearCaches(): void;
}
