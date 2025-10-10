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
}
