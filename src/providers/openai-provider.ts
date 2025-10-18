/**
 * OpenAIProvider - OpenAI AI Provider
 *
 * Uses OpenAI API for GPT models
 */

import { BaseProvider } from './base-provider.js';
import { shouldRetryError } from './retry-errors.js';
import type {
  ProviderConfig,
  ProviderCapabilities,
  ExecutionRequest,
  ExecutionResponse,
  EmbeddingOptions,
  Cost,
  StreamingOptions
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
      supportsStreaming: true, // v5.3.0: Native streaming support
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

  protected async generateEmbeddingInternal(_text: string, options?: EmbeddingOptions): Promise<number[]> {
    try {
      // NOTE: Legacy mock implementation for testing purposes only
      // Vector search was removed in v4.11.0 (switched to SQLite FTS5)
      // This method is retained for interface compatibility and test coverage
      // OpenAI supports embeddings via text-embedding models (not implemented in mock)
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
        const chunk = data.toString();
        stdout += chunk;

        // Real-time output if enabled (v5.6.5: UX improvement)
        if (process.env.AUTOMATOSX_SHOW_PROVIDER_OUTPUT === 'true') {
          process.stdout.write(chunk);
        }
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
    // Use centralized retry logic for consistency
    return shouldRetryError(error, 'openai');
  }

  /**
   * Build CLI arguments for OpenAI Codex CLI
   * Supports: maxTokens, temperature, sandbox mode
   */
  protected buildCLIArgs(request: ExecutionRequest): string[] {
    const args: string[] = ['exec'];

    // Add sandbox mode for write access (v5.6.5: Fix read-only sandbox issue)
    // workspace-write allows writing to the workspace while maintaining security
    args.push('--sandbox', 'workspace-write');

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

  /**
   * Check if provider supports streaming
   * OpenAI CLI supports native streaming
   */
  override supportsStreaming(): boolean {
    return true;
  }

  /**
   * Execute with streaming (native streaming support)
   *
   * OpenAI CLI supports --stream flag for real-time token streaming.
   */
  override async executeStreaming(
    request: ExecutionRequest,
    options: StreamingOptions
  ): Promise<ExecutionResponse> {
    const startTime = Date.now();

    try {
      // Build prompt with system prompt if provided
      let fullPrompt = request.prompt;
      if (request.systemPrompt) {
        fullPrompt = `System: ${request.systemPrompt}\n\nUser: ${request.prompt}`;
      }

      // Check if running in mock mode
      const useMock = process.env.AUTOMATOSX_MOCK_PROVIDERS === 'true';

      if (useMock) {
        // Mock streaming simulation
        return this.mockStreamingExecution(fullPrompt, request, options);
      }

      // Real streaming execution
      return this.executeStreamingCLI(fullPrompt, request, options);

    } catch (error) {
      throw new Error(`OpenAI streaming execution failed: ${(error as Error).message}`);
    }
  }

  /**
   * Mock streaming simulation for testing
   */
  private async mockStreamingExecution(
    prompt: string,
    request: ExecutionRequest,
    options: StreamingOptions
  ): Promise<ExecutionResponse> {
    const startTime = Date.now();
    const mockResponse = `[Mock Streaming Response from OpenAI]\n\nTask received: ${prompt.substring(0, 100)}...\n\nThis is a placeholder streaming response.`;
    const tokens = mockResponse.split(' ');
    let fullOutput = '';

    // Simulate token streaming
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i] + (i < tokens.length - 1 ? ' ' : '');
      fullOutput += token;

      if (options.onToken) {
        options.onToken(token);
      }

      if (options.onProgress) {
        const progress = Math.min(100, ((i + 1) / tokens.length) * 100);
        options.onProgress(progress);
      }

      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      content: fullOutput,
      model: request.model || 'openai-default',
      tokensUsed: {
        prompt: this.estimateTokens(prompt),
        completion: this.estimateTokens(fullOutput),
        total: this.estimateTokens(prompt) + this.estimateTokens(fullOutput)
      },
      latencyMs: Date.now() - startTime,
      finishReason: 'stop'
    };
  }

  /**
   * Execute real streaming CLI
   */
  private async executeStreamingCLI(
    prompt: string,
    request: ExecutionRequest,
    options: StreamingOptions
  ): Promise<ExecutionResponse> {
    const { spawn } = await import('child_process');
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      let fullOutput = '';
      let tokenCount = 0;
      let stderr = '';
      let hasTimedOut = false;

      // Build CLI args with streaming enabled
      const args = this.buildCLIArgs(request);
      args.push('--stream'); // Enable streaming in OpenAI CLI
      args.push(prompt);

      // Spawn the CLI process
      const child = spawn(this.config.command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env
      });

      // Handle abort signal
      if (request.signal) {
        request.signal.addEventListener('abort', () => {
          hasTimedOut = true;
          child.kill('SIGTERM');
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
          reject(new Error('Execution aborted by timeout'));
        });
      }

      // Collect stdout with token streaming
      child.stdout?.on('data', (chunk) => {
        const token = chunk.toString();
        fullOutput += token;
        tokenCount++;

        // Real-time output if enabled (v5.6.5: UX improvement)
        if (process.env.AUTOMATOSX_SHOW_PROVIDER_OUTPUT === 'true') {
          process.stdout.write(token);
        }

        // Emit token event
        if (options.onToken) {
          options.onToken(token);
        }

        // Dynamic progress estimation based on prompt length
        // Typical completion is 0.5-2x the prompt length
        // Use adaptive estimation that gets more accurate as tokens are received
        const promptTokens = this.estimateTokens(prompt);
        let estimatedTotal: number;

        if (tokenCount < 50) {
          // Early stage: conservative estimate (1.5x prompt)
          estimatedTotal = Math.max(100, Math.floor(promptTokens * 1.5));
        } else if (tokenCount < 200) {
          // Mid stage: adjust based on current rate
          // If we've already exceeded initial estimate, extend it
          const initialEstimate = Math.floor(promptTokens * 1.5);
          estimatedTotal = Math.max(initialEstimate, Math.floor(tokenCount * 1.2));
        } else {
          // Late stage: use current count + 20% buffer
          estimatedTotal = Math.floor(tokenCount * 1.2);
        }

        const progress = Math.min(95, (tokenCount / estimatedTotal) * 100);
        if (options.onProgress) {
          options.onProgress(progress);
        }
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
          // Emit final progress
          if (options.onProgress) {
            options.onProgress(100);
          }

          resolve({
            content: fullOutput.trim(),
            model: request.model || 'openai-default',
            tokensUsed: {
              prompt: this.estimateTokens(prompt),
              completion: this.estimateTokens(fullOutput),
              total: this.estimateTokens(prompt) + this.estimateTokens(fullOutput)
            },
            latencyMs: Date.now() - startTime,
            finishReason: 'stop'
          });
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

        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 1000);

        reject(new Error(`OpenAI CLI streaming timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      child.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }
}
