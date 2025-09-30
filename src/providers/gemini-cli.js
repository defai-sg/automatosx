/**
 * Gemini CLI Provider (Optional)
 * Uses Google's Gemini CLI instead of API - user manages authentication
 * Only available if explicitly enabled in configuration
 */

import { execSync } from 'child_process';
import chalk from 'chalk';

export class GeminiCLIProvider {
    constructor(config = {}) {
        this.name = 'gemini-cli';
        this.enabled = config.enabled || false;
        this.available = this.enabled ? this.checkAvailability() : false;
    }

    checkAvailability() {
        if (!this.enabled) return false;

        try {
            // Check if Gemini CLI is installed (assuming 'gemini' command exists)
            execSync('gemini --version', { stdio: 'ignore' });
            return true;
        } catch (error) {
            console.warn(chalk.yellow('Gemini CLI not found. Please install Google\'s Gemini CLI'));
            return false;
        }
    }

    async execute(prompt, options = {}) {
        if (!this.enabled) {
            throw new Error('Gemini CLI provider is disabled in configuration');
        }

        if (!this.available) {
            throw new Error('Gemini CLI not available');
        }

        const { model = '2.5-pro', maxTokens = 2000, temperature = 0.3 } = options;

        try {
            // Use Gemini CLI command (format may vary based on actual CLI)
            const command = `gemini generate --model gemini-${model} --max-tokens ${maxTokens} --temperature ${temperature}`;

            console.log(chalk.magenta(`🤖 Executing with Gemini CLI: ${model}`));

            const result = execSync(command, {
                input: prompt,
                encoding: 'utf8',
                timeout: 45000,  // 45 second timeout
                maxBuffer: 1024 * 1024 // 1MB buffer
            });

            return result.trim();

        } catch (error) {
            throw new Error(`Gemini CLI execution failed: ${error.message}`);
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
            throw new Error('Gemini CLI provider is disabled');
        }

        if (!this.available) {
            throw new Error('Gemini CLI not available');
        }

        try {
            const version = execSync('gemini --version', { encoding: 'utf8' }).trim();
            return { status: 'available', version };
        } catch (error) {
            throw new Error(`Gemini CLI connection test failed: ${error.message}`);
        }
    }

    async getStatus() {
        if (!this.enabled) {
            return { status: 'disabled', message: 'Gemini CLI provider disabled in configuration' };
        }

        if (!this.available) {
            return { status: 'unavailable', message: 'Gemini CLI not installed' };
        }

        try {
            const version = execSync('gemini --version', { encoding: 'utf8' }).trim();
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