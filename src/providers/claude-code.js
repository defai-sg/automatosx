/**
 * Claude Code CLI Provider
 * Primary provider using existing Claude Code authentication
 * No API keys required - leverages user's Claude Code subscription
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

export class ClaudeCodeProvider {
    constructor() {
        this.name = 'claude-code';
        this.available = this.checkAvailability();
    }

    async sanitizeInput(input) {
        // Enhanced security validation using SecurityValidator
        const { SecurityValidator } = await import('../core/security-validator.js');
        const validator = new SecurityValidator({
            localTrustedEnvironment: true // Disable SQL injection checking for AutomatosX local usage
        });

        const validation = await validator.validateInput(input, {
            provider: 'claude-code',
            timestamp: Date.now()
        });

        if (!validation.isValid) {
            throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
        }

        if (validation.warnings.length > 0) {
            console.warn(chalk.yellow(`⚠️  Input warnings: ${validation.warnings.join(', ')}`));
        }

        return validation.sanitizedInput;
    }

    // Model validation removed - using CLI default model

    validateNumber(value, min, max, defaultValue) {
        const num = parseFloat(value);

        if (isNaN(num)) {
            console.warn(chalk.yellow(`⚠️  Invalid number '${value}', using default ${defaultValue}`));
            return defaultValue;
        }

        if (num < min || num > max) {
            console.warn(chalk.yellow(`⚠️  Number ${num} out of range [${min}, ${max}], clamping`));
            return Math.max(min, Math.min(max, num));
        }

        return num;
    }

    checkAvailability() {
        try {
            execSync('claude --version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            console.warn(chalk.yellow('Claude Code CLI not found. Please install from https://claude.ai/code'));
            return false;
        }
    }

    async execute(prompt, options = {}) {
        if (!this.available) {
            throw new Error('Claude Code CLI not available');
        }

        try {
            // Enhanced input validation and sanitization
            const sanitizedPrompt = await this.sanitizeInput(prompt);

            console.log(chalk.blue(`🤖 Executing with Claude Code (default model)`));

            // Check prompt length and use file-based approach for large prompts
            const promptLength = sanitizedPrompt.length;

            if (promptLength > 500) {
                console.log(chalk.gray(`📏 Large prompt (${promptLength} chars), using file-based execution`));
                return await this.executeWithFile(sanitizedPrompt);
            } else {
                console.log(chalk.gray(`📏 Small prompt (${promptLength} chars), using stdin execution`));
                return await this.executeWithStdin(sanitizedPrompt);
            }
        } catch (error) {
            throw new Error(`Claude Code execution failed: ${error.message}`);
        }
    }

    async executeWithFile(prompt) {
        const fs = await import('fs');
        const path = await import('path');
        const { execSync } = await import('child_process');

        // Create temporary file for prompt
        const tempDir = '/tmp/claude';
        try {
            await fs.promises.mkdir(tempDir, { recursive: true });
        } catch (mkdirError) {
            // Directory might already exist, ignore error
        }

        const tempFile = path.join(tempDir, `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.txt`);

        try {
            // Write prompt to temporary file
            await fs.promises.writeFile(tempFile, prompt, 'utf8');
            console.log(chalk.gray(`📝 Prompt written to: ${tempFile}`));

            // Execute claude with file input using execSync with timeout
            const result = execSync(`claude < "${tempFile}"`, {
                encoding: 'utf8',
                timeout: 120000, // 2 minute timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });

            return result.trim();
        } finally {
            // Clean up temporary file
            try {
                await fs.promises.unlink(tempFile);
            } catch (cleanupError) {
                console.warn(chalk.yellow(`⚠️  Failed to clean up temp file: ${cleanupError.message}`));
            }
        }
    }

    async executeWithStdin(prompt) {
        const { spawn } = await import('child_process');

        return new Promise((resolve, reject) => {
            const child = spawn('claude', [], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';
            let isResolved = false;

            // Set timeout for small prompts (30 seconds should be enough)
            const timeout = setTimeout(() => {
                if (!isResolved) {
                    console.log(chalk.yellow(`⏰ Claude execution timeout after 30s`));
                    child.kill('SIGTERM');
                    isResolved = true;
                    reject(new Error('Claude Code execution timeout'));
                }
            }, 30000);

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (code) => {
                if (!isResolved) {
                    clearTimeout(timeout);
                    isResolved = true;
                    if (code === 0) {
                        resolve(stdout.trim());
                    } else {
                        reject(new Error(`Claude Code failed with code ${code}: ${stderr}`));
                    }
                }
            });

            child.on('error', (error) => {
                if (!isResolved) {
                    clearTimeout(timeout);
                    isResolved = true;
                    reject(new Error(`Claude Code spawn error: ${error.message}`));
                }
            });

            // Write prompt to stdin
            try {
                child.stdin.write(prompt, 'utf8');
                child.stdin.end();
            } catch (writeError) {
                if (!isResolved) {
                    clearTimeout(timeout);
                    isResolved = true;
                    reject(new Error(`Failed to write to claude process: ${writeError.message}`));
                }
            }
        });
    }

    /**
     * Enhanced router compatible call method
     */
    async call({ model, prompt, context = {} }) {
        const result = await this.execute(prompt, { model });
        return {
            content: result,
            tokensUsed: 0 // Claude Code doesn't provide token count
        };
    }

    /**
     * Test connection method for enhanced router
     */
    async testConnection() {
        if (!this.available) {
            throw new Error('Claude Code CLI not available');
        }

        try {
            const version = execSync('claude --version', { encoding: 'utf8' }).trim();
            return { status: 'available', version };
        } catch (error) {
            throw new Error(`Claude Code connection test failed: ${error.message}`);
        }
    }

    async getStatus() {
        if (!this.available) {
            return { status: 'unavailable', message: 'Claude Code CLI not installed' };
        }

        try {
            const version = execSync('claude --version', { encoding: 'utf8' }).trim();
            return {
                status: 'available',
                version: version,
                cost: 0,
                authenticated: true
            };
        } catch (error) {
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}