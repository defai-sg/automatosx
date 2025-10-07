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
    // Real streaming implementation using Claude Code CLI
    const { spawn } = await import('child_process');

    // Build prompt with system prompt if provided
    let fullPrompt = request.prompt;
    if (request.systemPrompt) {
      fullPrompt = `System: ${request.systemPrompt}\n\nUser: ${request.prompt}`;
    }

    const model = request.model || this.DEFAULT_MODEL;

    // Build CLI arguments with streaming
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',  // Required for stream-json
      '--include-partial-messages',  // Enable real streaming with deltas
      fullPrompt
    ];

    // Add model if specified and different from default
    if (model && model !== this.DEFAULT_MODEL) {
      args.unshift('--model', model);
    }

    const child = spawn(this.config.command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env
    });

    let buffer = '';
    let hasYieldedContent = false; // Track if we've already yielded content

    // Create a promise to handle errors
    const errorPromise = new Promise<never>((_, reject) => {
      child.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') {
          reject(new Error(
            `Claude CLI not found. Please ensure Claude Code is installed and '${this.config.command}' is in your PATH.\n` +
            `Install from: https://claude.ai/download`
          ));
        } else {
          reject(new Error(`Failed to execute Claude CLI: ${error.message}`));
        }
      });

      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Claude CLI exited with code ${code}`));
        }
      });
    });

    try {
      // Process stdout line by line
      for await (const chunk of child.stdout!) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // Parse JSON streaming format
            const data = JSON.parse(line);

            // Extract content based on Claude Code CLI streaming format
            if (data.type === 'stream_event' && data.event) {
              const event = data.event;

              // Real-time streaming deltas
              if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
                yield event.delta.text;
                hasYieldedContent = true;
              }
            }
            // Fallback: if no deltas received, use complete message
            else if (!hasYieldedContent && data.type === 'assistant' && data.message?.content) {
              const content = data.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    yield block.text;
                    hasYieldedContent = true;
                  }
                }
              }
            }
            // Skip system and result messages
          } catch (e) {
            // Not JSON, might be plain text fallback
            if (line.trim() && !line.startsWith('{')) {
              yield line;
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.type === 'content' && data.content) {
            yield data.content;
          }
        } catch (e) {
          // Plain text
          yield buffer;
        }
      }
    } catch (error) {
      // Check if it's from the error promise
      await Promise.race([Promise.resolve(), errorPromise]);
      throw error;
    }
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
   * Claude Code CLI syntax: claude -p "prompt"
   * Uses --print flag for non-interactive output
   */
  private async executeRealCLI(prompt: string, model: string, request: ExecutionRequest): Promise<{ content: string }> {
    const { spawn } = await import('child_process');

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let hasTimedOut = false;

      // Build CLI arguments
      // Use --print for non-interactive mode
      const args = ['--print', prompt];

      // Add model if specified and different from default
      if (model && model !== this.DEFAULT_MODEL) {
        args.unshift('--model', model);
      }

      let child: ReturnType<typeof spawn>;

      try {
        child = spawn(this.config.command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          env: process.env
        });
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          reject(new Error(
            `Claude CLI not found. Please ensure Claude Code is installed and '${this.config.command}' is in your PATH.\n` +
            `Install from: https://claude.ai/download`
          ));
        } else {
          reject(new Error(`Failed to start Claude CLI: ${err.message}`));
        }
        return;
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
          return; // Timeout already handled
        }

        if (code !== 0) {
          const errorMsg = stderr || 'No error message';

          // Parse common error patterns
          if (errorMsg.toLowerCase().includes('network') ||
              errorMsg.toLowerCase().includes('connection') ||
              errorMsg.toLowerCase().includes('econnrefused') ||
              errorMsg.toLowerCase().includes('enotfound')) {
            reject(new Error(
              `Network connection error: Unable to reach Claude API.\n` +
              `Please check your internet connection and try again.\n` +
              `Details: ${errorMsg}`
            ));
          } else if (errorMsg.toLowerCase().includes('authentication') ||
                     errorMsg.toLowerCase().includes('unauthorized') ||
                     errorMsg.toLowerCase().includes('api key')) {
            reject(new Error(
              `Authentication failed: Please check your Claude API credentials.\n` +
              `Details: ${errorMsg}`
            ));
          } else if (errorMsg.toLowerCase().includes('rate limit') ||
                     errorMsg.toLowerCase().includes('quota')) {
            reject(new Error(
              `Rate limit exceeded: Please wait a moment and try again.\n` +
              `Details: ${errorMsg}`
            ));
          } else {
            reject(new Error(`Claude CLI exited with code ${code}: ${errorMsg}`));
          }
        } else {
          if (!stdout.trim()) {
            reject(new Error('Claude CLI returned empty response'));
          } else {
            resolve({ content: stdout.trim() });
          }
        }
      });

      // Handle process errors
      child.on('error', (error) => {
        const err = error as NodeJS.ErrnoException;

        if (err.code === 'ENOENT') {
          reject(new Error(
            `Claude CLI command '${this.config.command}' not found.\n` +
            `Please install Claude Code from https://claude.ai/download`
          ));
        } else if (err.code === 'EACCES') {
          reject(new Error(
            `Permission denied: Cannot execute '${this.config.command}'.\n` +
            `Please check file permissions.`
          ));
        } else {
          reject(new Error(`Failed to execute Claude CLI: ${err.message}`));
        }
      });

      // Set timeout
      const timeout = setTimeout(() => {
        hasTimedOut = true;
        child.kill('SIGTERM');

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (child.killed === false) {
            child.kill('SIGKILL');
          }
        }, 5000);

        reject(new Error(
          `Request timeout after ${this.config.timeout / 1000} seconds.\n` +
          `This may be due to:\n` +
          `- Slow network connection\n` +
          `- Large request requiring more processing time\n` +
          `- Claude API being overloaded\n` +
          `Try again or use --timeout option to increase the limit.`
        ));
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
      'internal_server_error',
      'network connection error',
      'econnrefused',
      'econnreset',
      'etimedout',
      'enotfound'
    ];

    const message = error.message.toLowerCase();
    const isRetryable = claudeRetryableErrors.some(err => message.includes(err)) || super.shouldRetry(error);

    // Don't retry authentication errors or missing CLI
    if (message.includes('authentication') ||
        message.includes('api key') ||
        message.includes('not found') ||
        message.includes('permission denied')) {
      return false;
    }

    return isRetryable;
  }
}
