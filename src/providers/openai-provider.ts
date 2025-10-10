/**
 * OpenAIProvider - OpenAI AI Provider
 *
 * Uses OpenAI API for GPT models
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

export class OpenAIProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config);
  }

  get version(): string {
    return '1.0.0';
  }

  get capabilities(): ProviderCapabilities {
    return {
      supportsStreaming: false,
      supportsEmbedding: true,
      supportsVision: true,
      maxContextTokens: 128000, // GPT-4 Turbo/GPT-4o has 128k context
      supportedModels: [
        'gpt-4o',
        'gpt-4o-mini',
        'gpt-4-turbo',
        'gpt-4',
        'gpt-3.5-turbo',
        'o1-preview',
        'o1-mini'
      ]
    };
  }

  protected async executeRequest(request: ExecutionRequest): Promise<ExecutionResponse> {
    const startTime = Date.now();

    try {
      // Build prompt with system prompt if provided
      let fullPrompt = request.prompt;
      if (request.systemPrompt) {
        fullPrompt = `System: ${request.systemPrompt}\n\nUser: ${request.prompt}`;
      }

      // Execute via CLI - let CLI use its own default model
      const response = await this.executeCLI(fullPrompt, request);

      const latency = Date.now() - startTime;

      return {
        content: response.content,
        model: request.model || 'openai-default', // CLI decides actual model
        tokensUsed: {
          prompt: this.estimateTokens(fullPrompt),
          completion: this.estimateTokens(response.content),
          total: this.estimateTokens(fullPrompt) + this.estimateTokens(response.content)
        },
        latencyMs: latency,
        finishReason: 'stop'
      };
    } catch (error) {
      throw new Error(`OpenAI execution failed: ${(error as Error).message}`);
    }
  }

  protected async generateEmbeddingInternal(text: string, options?: EmbeddingOptions): Promise<number[]> {
    // OpenAI supports embeddings via text-embedding models
    const model = options?.model || 'text-embedding-3-small';

    try {
      // TODO: Implement actual embedding generation with OpenAI SDK
      // For now, return mock embedding
      const dimensions = options?.dimensions || 1536;
      return Array(dimensions).fill(0).map(() => Math.random());
    } catch (error) {
      throw new Error(`OpenAI embedding generation failed: ${(error as Error).message}`);
    }
  }

  override async estimateCost(request: ExecutionRequest): Promise<Cost> {
    // OpenAI pricing (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 2.50, output: 10.00 },  // per 1M tokens
      'gpt-4o-mini': { input: 0.15, output: 0.60 },
      'gpt-4-turbo': { input: 10.00, output: 30.00 },
      'gpt-4': { input: 30.00, output: 60.00 },
      'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
      'o1-preview': { input: 15.00, output: 60.00 },
      'o1-mini': { input: 3.00, output: 12.00 }
    };

    // Use gpt-4o pricing as default estimate when model not specified
    const defaultPricing = { input: 2.50, output: 10.00 };
    const modelPricing = request.model ? (pricing[request.model] ?? defaultPricing) : defaultPricing;

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
  private async executeCLI(prompt: string, request: ExecutionRequest): Promise<{ content: string }> {
    // Check if running in production mode (real CLI) or test mode (mock)
    const useMock = process.env.AUTOMATOSX_MOCK_PROVIDERS === 'true';

    if (useMock) {
      // Mock mode for testing
      return Promise.resolve({
        content: `[Mock Response from OpenAI]\n\nTask received: ${prompt.substring(0, 100)}...\n\nThis is a placeholder response. Set AUTOMATOSX_MOCK_PROVIDERS=false to use real CLI.`
      });
    }

    // Real CLI execution
    return this.executeRealCLI(prompt, request);
  }

  /**
   * Execute real CLI command via spawn
   *
   * Codex CLI syntax: codex exec [OPTIONS] [PROMPT]
   * Model and other parameters are passed via -c (config override) or specific flags
   */
  private async executeRealCLI(prompt: string, request: ExecutionRequest): Promise<{ content: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let hasTimedOut = false;

      // Build CLI arguments using the new buildCLIArgs method
      const args = this.buildCLIArgs(request);

      // Add prompt as last argument
      args.push(prompt);

      // Spawn the CLI process
      const child = spawn(this.config.command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      // v5.0.7: Handle abort signal for proper timeout cancellation
      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          hasTimedOut = true;
          child.kill('SIGTERM');
          // Force kill after 5 seconds if SIGTERM doesn't work
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
          reject(new Error('Execution aborted by timeout'));
        });
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
        if (hasTimedOut) {
          return; // Already rejected by timeout
        }

        if (code !== 0) {
          reject(new Error(`OpenAI CLI exited with code ${code}: ${stderr}`));
        } else {
          resolve({ content: stdout.trim() });
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        if (!hasTimedOut) {
          reject(new Error(`Failed to spawn OpenAI CLI: ${error.message}`));
        }
      });

      // Set timeout
      const timeout = setTimeout(() => {
        hasTimedOut = true;
        child.kill('SIGTERM');

        // Give it a moment to terminate gracefully
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 1000);

        reject(new Error(`OpenAI CLI execution timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  override shouldRetry(error: Error): boolean {
    // OpenAI-specific retry logic
    const openaiRetryableErrors = [
      'rate_limit',
      'server_error',
      'timeout',
      'connection_error',
      'service_unavailable',
      'internal_error'
    ];

    const message = error.message.toLowerCase();
    return openaiRetryableErrors.some(err => message.includes(err)) || super.shouldRetry(error);
  }

  /**
   * Build CLI arguments for OpenAI Codex CLI
   * Supports: maxTokens, temperature
   */
  protected buildCLIArgs(request: ExecutionRequest): string[] {
    const args: string[] = ['exec'];

    // Add model if specified
    if (request.model) {
      args.push('-m', request.model);
    }

    // Add temperature via config override if specified
    if (request.temperature !== undefined) {
      args.push('-c', `temperature=${request.temperature}`);
    }

    // Add max tokens via config override if specified
    if (request.maxTokens !== undefined) {
      args.push('-c', `max_tokens=${request.maxTokens}`);
    }

    return args;
  }

  /**
   * Check if OpenAI provider supports a specific parameter
   * OpenAI Codex CLI supports maxTokens and temperature via -c flags
   */
  protected supportsParameter(
    param: 'maxTokens' | 'temperature' | 'topP'
  ): boolean {
    // OpenAI Codex CLI supports maxTokens and temperature
    return param === 'maxTokens' || param === 'temperature';
  }
}
