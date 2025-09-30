/**
 * Provider Manager
 * Manages CLI-only providers with zero API key management
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { ClaudeCodeProvider } from './claude-code.js';
import { OpenAICLIProvider } from './openai-cli.js';
import { GeminiCLIProvider } from './gemini-cli.js';

export class ProviderManager {
    constructor(config = {}) {
        this.config = config;
        this.configPath = path.join(process.cwd(), 'src/config/providers.json');
        this.providers = {};
        this.initialized = false;
    }

    async initialize() {
        if (!this.initialized) {
            this.providers = await this.initializeProviders();
            this.initialized = true;
        }
        return this.providers;
    }

    async loadProviderConfig() {
        try {
            if (await fs.pathExists(this.configPath)) {
                const configData = await fs.readJson(this.configPath);
                return configData;
            }
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Could not load provider config, using defaults'));
        }
        return {};
    }

    async initializeProviders() {
        const providers = {};
        const providerConfig = await this.loadProviderConfig();

        // Claude Code - Always enabled as fallback
        if (providerConfig.claude?.enabled !== false) {
            providers['claude'] = new ClaudeCodeProvider();
        }

        // OpenAI CLI - Optional, user-configurable
        if (providerConfig.openai?.enabled === true) {
            providers['openai'] = new OpenAICLIProvider();
        }

        // Gemini CLI - Optional, user-configurable
        if (providerConfig.gemini?.enabled === true) {
            providers['gemini'] = new GeminiCLIProvider();
        }

        return providers;
    }

    async refreshProviders() {
        this.providers = await this.initializeProviders();
        return this.providers;
    }

    async checkAllProviders() {
        console.log(chalk.blue('🔍 Checking provider availability...'));

        const results = {};
        const startTime = Date.now();

        // Use cached results if available and recent (within 30 seconds)
        const cacheKey = 'provider_status_cache';
        const now = Date.now();

        if (this._statusCache && this._statusCache.timestamp &&
            (now - this._statusCache.timestamp) < 30000) {
            console.log(chalk.gray('📋 Using cached provider status'));
            const elapsed = now - this._statusCache.timestamp;
            console.log(chalk.green(`⚡ Provider checks completed in ${elapsed}ms (cached)`));
            return this._statusCache.results;
        }

        // Parallel provider checking for better performance
        const providerChecks = Object.entries(this.providers).map(async ([name, provider]) => {
            try {
                const status = await provider.getStatus();
                return { name, status, error: null };
            } catch (error) {
                return { name, status: { status: 'error', message: error.message }, error };
            }
        });

        const checkResults = await Promise.allSettled(providerChecks);

        // Process results and display
        for (const result of checkResults) {
            if (result.status === 'fulfilled') {
                const { name, status } = result.value;
                results[name] = status;

                if (status.status === 'available') {
                    console.log(chalk.green(`✅ ${name}: Available (${status.version || 'unknown version'})`));
                } else if (status.status === 'disabled') {
                    console.log(chalk.yellow(`⚠️  ${name}: Disabled in configuration`));
                } else {
                    console.log(chalk.red(`❌ ${name}: ${status.message}`));
                }
            } else {
                console.log(chalk.red(`❌ Provider check failed: ${result.reason}`));
            }
        }

        const duration = Date.now() - startTime;
        console.log(chalk.gray(`⚡ Provider checks completed in ${duration}ms`));

        // Cache the results for 30 seconds
        this._statusCache = {
            timestamp: now,
            results: results
        };

        return results;
    }

    getAvailableProviders() {
        return Object.entries(this.providers)
            .filter(([, provider]) => provider.available)
            .map(([name]) => name);
    }

    getProvider(name) {
        return this.providers[name];
    }

    isProviderEnabled(name) {
        if (name === 'claude-code') return true; // Always enabled

        const configKey = name.replace('-cli', '');
        return this.config[configKey] && this.config[configKey].enabled;
    }

    generateRecommendations() {
        const recommendations = [];
        const available = this.getAvailableProviders();

        // Check Claude Code (required)
        if (!available.includes('claude-code')) {
            recommendations.push({
                priority: 'critical',
                message: 'Claude Code CLI is required but not available',
                action: 'Install Claude Code from https://claude.ai/code and run: claude auth login'
            });
        }

        // Check optional providers
        if (this.config.openai?.enabled && !available.includes('openai-cli')) {
            recommendations.push({
                priority: 'medium',
                message: 'OpenAI CLI is enabled but not available',
                action: 'Install with: pip install openai-cli or disable in config'
            });
        }

        if (this.config.gemini?.enabled && !available.includes('gemini-cli')) {
            recommendations.push({
                priority: 'medium',
                message: 'Gemini CLI is enabled but not available',
                action: 'Install Google\'s Gemini CLI or disable in config'
            });
        }

        // Suggest enabling providers if only Claude Code is available
        if (available.length === 1 && available[0] === 'claude-code') {
            recommendations.push({
                priority: 'low',
                message: 'Only Claude Code is available',
                action: 'Consider enabling OpenAI CLI or Gemini CLI for fallback options'
            });
        }

        return recommendations;
    }
}