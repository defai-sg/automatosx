/**
 * ClaudeProvider - Anthropic Claude AI Provider
 *
 * Uses Anthropic SDK for Claude models
 */

import { BaseProvider } from './base-provider.js';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ExecutionRequest,
  ExecutionResponse,
  EmbeddingOptions,
  Cost
} from '../types/provider.js';

export class ClaudeProvider extends BaseProvider {
  private readonly DEFAULT_MODEL = 'claude-3-5-sonnet-20241022';

  constructor(config: ProviderConfig) {
    super(config);
  }

  get name(): string {
    return 'claude';
  }

  get version(): string {
    return '1.0.0';
  }

  get capabilities(): ProviderCapabilities {
    return {
      supportsStreaming: true,
      supportsEmbedding: false, // Claude doesn't provide embeddings directly
      supportsVision: true,
      maxContextTokens: 200000,
      supportedModels: [
        'claude-3-5-sonnet-20241022',
        'claude-3-5-haiku-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ]
    };
  }

  protected async executeRequest(request: ExecutionRequest): Promise<ExecutionResponse> {
    // For Phase 1, we use CLI-based execution (Claude Code CLI)
    // In future phases, we'll use the official Anthropic SDK

    const startTime = Date.now();
    const model = request.model || this.DEFAULT_MODEL;

    try {
      // Build prompt with system prompt if provided
      let fullPrompt = request.prompt;
      if (request.systemPrompt) {
        fullPrompt = `System: ${request.systemPrompt}\n\nUser: ${request.prompt}`;
      }

      // Execute via CLI (placeholder - actual implementation will use SDK)
      const response = await this.executeCLI(fullPrompt, model, request);

      const latency = Date.now() - startTime;

      return {
        content: response.content,
        model: model,
        tokensUsed: {
          prompt: this.estimateTokens(fullPrompt),
          completion: this.estimateTokens(response.content),
          total: this.estimateTokens(fullPrompt) + this.estimateTokens(response.content)
        },
        latencyMs: latency,
        finishReason: 'stop'
      };
    } catch (error) {
      throw new Error(`Claude execution failed: ${(error as Error).message}`);
    }
  }

  protected async *streamRequest(request: ExecutionRequest): AsyncGenerator<string> {
    // Streaming implementation (placeholder for Phase 1)
    // Will be implemented with Anthropic SDK in future phases

    const response = await this.executeRequest(request);
    yield response.content;
  }

  protected async generateEmbeddingInternal(text: string, options?: EmbeddingOptions): Promise<number[]> {
    throw new Error('Claude does not support embeddings directly. Use OpenAI or Voyage AI for embeddings.');
  }

  override async estimateCost(request: ExecutionRequest): Promise<Cost> {
    const model = request.model || this.DEFAULT_MODEL;

    // Claude pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },  // per 1M tokens
      'claude-3-5-haiku-20241022': { input: 0.80, output: 4.00 },
      'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
      'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 }
    };

    const modelPricing = pricing[model] ?? pricing[this.DEFAULT_MODEL];
    if (!modelPricing) {
      throw new Error(`Unknown model: ${model}`);
    }

    const inputTokens = this.estimateTokens(request.prompt);
    const outputTokens = request.maxTokens ?? 4096;

    const inputCost = (inputTokens / 1_000_000) * modelPricing.input;
    const outputCost = (outputTokens / 1_000_000) * modelPricing.output;

    return {
      estimatedUsd: inputCost + outputCost,
      tokensUsed: inputTokens + outputTokens
    };
  }

  // CLI execution helper (Phase 1 implementation)
  private async executeCLI(prompt: string, model: string, request: ExecutionRequest): Promise<{ content: string }> {
    // Check if running in production mode (real CLI) or test mode (mock)
    const useMock = process.env.AUTOMATOSX_MOCK_PROVIDERS === 'true';

    if (useMock) {
      // Mock mode for testing
      return Promise.resolve({
        content: `[Mock Response from Claude ${model}]\n\nTask received: ${prompt.substring(0, 100)}...\n\nThis is a placeholder response. Set AUTOMATOSX_MOCK_PROVIDERS=false to use real CLI.`
      });
    }

    // Real CLI execution
    return this.executeRealCLI(prompt, model, request);
  }

  /**
   * Execute real CLI command via spawn
   *
   * Claude Code CLI syntax: echo "prompt" | claude
   * or: claude (with prompt via stdin)
   */
  private async executeRealCLI(prompt: string, model: string, request: ExecutionRequest): Promise<{ content: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';

      // Claude Code CLI accepts input via stdin
      // No 'chat' subcommand needed
      const child = spawn(this.config.command, [], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // Pass model and other options via environment if supported
          CLAUDE_MODEL: model
        }
      });

      // Send prompt via stdin
      if (child.stdin) {
        child.stdin.write(prompt);
        child.stdin.end();
      }

      // Collect stdout
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      // Collect stderr
      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      // Handle process exit
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr || 'No error message'}`));
        } else {
          resolve({ content: stdout.trim() });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        reject(new Error(`Failed to spawn Claude CLI: ${error.message}`));
      });

      // Set timeout
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Claude CLI execution timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  override shouldRetry(error: Error): boolean {
    // Claude-specific retry logic
    const claudeRetryableErrors = [
      'overloaded_error',
      'rate_limit_error',
      'timeout',
      'connection_error',
      'internal_server_error'
    ];

    const message = error.message.toLowerCase();
    return claudeRetryableErrors.some(err => message.includes(err)) || super.shouldRetry(error);
  }
}
