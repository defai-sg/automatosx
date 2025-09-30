/**
 * OpenAI Codex CLI Provider (Optional)
 * Uses the official Codex CLI (codex-cli)
 * Provides command-line interface to OpenAI Codex API
 * Only available if explicitly enabled in configuration
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

export class OpenAICLIProvider {
    constructor(config = {}) {
        this.name = 'codex-cli';
        this.enabled = config.enabled || false;
        this.available = this.enabled ? this.checkAvailability() : false;
    }

    checkAvailability() {
        if (!this.enabled) return false;

        try {
            // Check if Codex CLI is installed
            execSync('codex --version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            console.warn(chalk.yellow('Codex CLI not found. Install with: npm install -g codex-cli'));
            return false;
        }
    }

    async execute(prompt, options = {}) {
        if (!this.enabled) {
            throw new Error('Codex CLI provider is disabled in configuration');
        }

        if (!this.available) {
            throw new Error('Codex CLI not available');
        }

        const { model = 'gpt-5-codex', maxTokens = 2000, temperature = 0.3 } = options;

        try {
            // Use Codex CLI exec command for non-interactive execution
            console.log(chalk.green(`🤖 Executing with Codex CLI: ${model}`));

            // Use Codex exec command with prompt (secure approach using spawn)
            const { spawn } = await import('child_process');
            const child = spawn('codex', ['exec'], {
                timeout: 60000,
                env: { ...process.env, CODEX_MODEL: model },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Write prompt securely to stdin
            child.stdin.write(prompt);
            child.stdin.end();

            // Collect output
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data;
            });

            child.stderr.on('data', (data) => {
                stderr += data;
            });

            const result = await new Promise((resolve, reject) => {
                child.on('close', (code) => {
                    if (code === 0) {
                        resolve(stdout);
                    } else {
                        reject(new Error(`Codex process failed with code ${code}: ${stderr}`));
                    }
                });

                child.on('error', (error) => {
                    reject(new Error(`Failed to start codex process: ${error.message}`));
                });
            });

            // Codex CLI returns formatted output, extract the actual response
            const lines = result.split('\n');

            // Find the actual response after the "[timestamp] codex" line
            const codexLineIndex = lines.findIndex(line => line.includes('] codex'));
            if (codexLineIndex !== -1) {
                // Extract everything after the codex line, excluding token usage
                const responseLines = lines.slice(codexLineIndex + 1);
                const tokensLineIndex = responseLines.findIndex(line => line.includes('tokens used:'));
                const actualResponse = tokensLineIndex !== -1
                    ? responseLines.slice(0, tokensLineIndex)
                    : responseLines;
                return actualResponse.join('\n').trim();
            }

            // Fallback: return the whole result if we can't parse it
            return result.trim();

        } catch (error) {
            throw new Error(`Codex CLI execution failed: ${error.message}`);
        }
    }

    /**
     * Enhanced router compatible call method
     */
    async call({ model, prompt, context = {} }) {
        const result = await this.execute(prompt, { model });
        return {
            content: result,
            tokensUsed: 0 // Token count not easily available from CLI
        };
    }

    /**
     * Test connection method for enhanced router
     */
    async testConnection() {
        if (!this.enabled) {
            throw new Error('Codex CLI provider is disabled');
        }

        if (!this.available) {
            throw new Error('Codex CLI not available');
        }

        try {
            const version = execSync('codex --version', { encoding: 'utf8' }).trim();
            return { status: 'available', version };
        } catch (error) {
            throw new Error(`Codex CLI connection test failed: ${error.message}`);
        }
    }

    async getStatus() {
        if (!this.enabled) {
            return { status: 'disabled', message: 'Codex CLI provider disabled in configuration' };
        }

        if (!this.available) {
            return { status: 'unavailable', message: 'Codex CLI not installed' };
        }

        try {
            const version = execSync('codex --version', { encoding: 'utf8' }).trim();
            return {
                status: 'available',
                version: version,
                cost: 'varies',
                authenticated: 'cli-managed'
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}