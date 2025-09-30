#!/usr/bin/env node

/**
 * AutomatosX Security Utilities
 * Bob's rock-solid security implementations
 *
 * Copyright 2025 DEFAI Team
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import path from 'path';
import crypto from 'crypto';

/**
 * DefaiError - Unified error handling class
 */
export class DefaiError extends Error {
    constructor(message, code = 'AUTOMATOSX_ERROR', context = {}) {
        super(message);
        this.name = 'DefaiError';
        this.code = code;
        this.context = context;
        this.timestamp = new Date().toISOString();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}

/**
 * Input validation and sanitization utilities
 */
export class InputValidator {
    /**
     * Validate and sanitize task input
     * @param {string} task - Task description
     * @returns {string} - Sanitized task
     */
    static validateTask(task) {
        if (typeof task !== 'string') {
            throw new DefaiError('Task must be a string', 'INVALID_TASK_TYPE');
        }

        if (task.length === 0) {
            throw new DefaiError('Task cannot be empty', 'EMPTY_TASK');
        }

        if (task.length > 2000) {
            throw new DefaiError('Task description too long (max 2000 characters)', 'TASK_TOO_LONG');
        }

        // Basic XSS protection - remove potentially dangerous characters
        const sanitized = task
            .replace(/[<>]/g, '') // Remove angle brackets
            .replace(/javascript:/gi, '') // Remove javascript protocol
            .replace(/on\w+=/gi, '') // Remove event handlers
            .trim();

        if (sanitized.length === 0) {
            throw new DefaiError('Task becomes empty after sanitization', 'INVALID_TASK_CONTENT');
        }

        return sanitized;
    }

    /**
     * Validate agent name
     * @param {string} agentName - Agent name to validate
     * @returns {string} - Validated agent name
     */
    static validateAgentName(agentName) {
        if (typeof agentName !== 'string') {
            throw new DefaiError('Agent name must be a string', 'INVALID_AGENT_TYPE');
        }

        const sanitized = agentName.toLowerCase().trim();

        // Only allow alphanumeric characters and specific safe characters
        if (!/^[a-z0-9_-]+$/.test(sanitized)) {
            throw new DefaiError('Agent name contains invalid characters', 'INVALID_AGENT_NAME');
        }

        if (sanitized.length === 0 || sanitized.length > 50) {
            throw new DefaiError('Agent name must be 1-50 characters', 'INVALID_AGENT_LENGTH');
        }

        return sanitized;
    }

    /**
     * Validate file path to prevent path traversal
     * @param {string} filePath - File path to validate
     * @param {string} baseDir - Base directory to restrict to
     * @returns {string} - Sanitized absolute path
     */
    static validatePath(filePath, baseDir = process.cwd()) {
        if (typeof filePath !== 'string') {
            throw new DefaiError('File path must be a string', 'INVALID_PATH_TYPE');
        }

        // Resolve and normalize the path
        const resolvedPath = path.resolve(baseDir, filePath);
        const normalizedBase = path.resolve(baseDir);

        // Ensure the resolved path is within the base directory
        if (!resolvedPath.startsWith(normalizedBase)) {
            throw new DefaiError('Path traversal attempt detected', 'PATH_TRAVERSAL_DETECTED', {
                requestedPath: filePath,
                resolvedPath,
                baseDir: normalizedBase
            });
        }

        return resolvedPath;
    }
}

/**
 * Command execution security utilities
 */
export class CommandSecurity {
    // Whitelist of allowed commands for different contexts
    static ALLOWED_COMMANDS = {
        version_check: [
            'claude --version',
            'gcloud --version',
            'openai --version',
            'node --version',
            'npm --version'
        ],
        test_commands: [
            'npm test',
            'npm run test',
            'node src/index.js validate',
            'node src/scripts/validate-architecture.js'
        ]
    };

    /**
     * Validate command against whitelist
     * @param {string} command - Command to validate
     * @param {string} context - Context for command validation
     * @returns {boolean} - Whether command is allowed
     */
    static validateCommand(command, context = 'general') {
        if (typeof command !== 'string') {
            throw new DefaiError('Command must be a string', 'INVALID_COMMAND_TYPE');
        }

        const trimmedCommand = command.trim();

        if (context in this.ALLOWED_COMMANDS) {
            const allowedCommands = this.ALLOWED_COMMANDS[context];
            const isAllowed = allowedCommands.some(allowed =>
                trimmedCommand === allowed || trimmedCommand.startsWith(allowed + ' ')
            );

            if (!isAllowed) {
                throw new DefaiError(
                    `Command not allowed in context: ${context}`,
                    'COMMAND_NOT_ALLOWED',
                    { command: trimmedCommand, context, allowedCommands }
                );
            }
        }

        // General security checks
        const dangerousPatterns = [
            /[;&|`$()]/,  // Shell metacharacters
            /rm\s+-rf/,   // Dangerous rm commands
            /curl.*\|/,   // Piped curl commands
            /wget.*\|/,   // Piped wget commands
            /eval\s*\(/,  // Eval calls
            /exec\s*\(/   // Exec calls
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(trimmedCommand)) {
                throw new DefaiError(
                    'Command contains potentially dangerous patterns',
                    'DANGEROUS_COMMAND_PATTERN',
                    { command: trimmedCommand, pattern: pattern.toString() }
                );
            }
        }

        return true;
    }

    /**
     * Generate secure task slug for file naming
     * @param {string} task - Original task description
     * @returns {string} - Secure slug
     */
    static generateSecureSlug(task) {
        const validated = InputValidator.validateTask(task);

        // Create a secure slug with length limit
        const slug = validated
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Keep only alphanumeric and spaces
            .replace(/\s+/g, '_') // Replace spaces with underscores
            .substring(0, 50); // Limit length

        // Add hash suffix for uniqueness
        const hash = crypto.createHash('md5').update(validated).digest('hex').substring(0, 8);

        return `${slug}_${hash}`;
    }
}

/**
 * File system security utilities
 */
export class FileSecurity {
    /**
     * Ensure directory is safe and create if needed
     * @param {string} dirPath - Directory path
     * @param {string} baseDir - Base directory restriction
     * @returns {string} - Validated directory path
     */
    static async ensureSecureDir(dirPath, baseDir = process.cwd()) {
        const validatedPath = InputValidator.validatePath(dirPath, baseDir);

        // Additional checks for directory names
        const dirName = path.basename(validatedPath);
        if (dirName.startsWith('.') && dirName !== '.claude') {
            throw new DefaiError('Hidden directories not allowed', 'HIDDEN_DIR_NOT_ALLOWED');
        }

        return validatedPath;
    }

    /**
     * Validate file extension against allowed types
     * @param {string} filePath - File path
     * @param {string[]} allowedExtensions - Allowed file extensions
     * @returns {boolean} - Whether extension is allowed
     */
    static validateFileExtension(filePath, allowedExtensions = ['.md', '.json', '.js', '.log']) {
        const ext = path.extname(filePath).toLowerCase();

        if (!allowedExtensions.includes(ext)) {
            throw new DefaiError(
                `File extension not allowed: ${ext}`,
                'INVALID_FILE_EXTENSION',
                { filePath, allowedExtensions }
            );
        }

        return true;
    }
}

/**
 * Rate limiting utilities
 */
export class RateLimiter {
    constructor(maxRequests = 100, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
    }

    /**
     * Check if request is within rate limits
     * @param {string} identifier - Client identifier
     * @returns {boolean} - Whether request is allowed
     */
    isAllowed(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;

        // Clean old entries
        if (this.requests.has(identifier)) {
            const userRequests = this.requests.get(identifier).filter(
                timestamp => timestamp > windowStart
            );
            this.requests.set(identifier, userRequests);
        }

        const currentRequests = this.requests.get(identifier) || [];

        if (currentRequests.length >= this.maxRequests) {
            throw new DefaiError(
                'Rate limit exceeded',
                'RATE_LIMIT_EXCEEDED',
                { identifier, maxRequests: this.maxRequests, windowMs: this.windowMs }
            );
        }

        currentRequests.push(now);
        this.requests.set(identifier, currentRequests);

        return true;
    }
}

export default {
    DefaiError,
    InputValidator,
    CommandSecurity,
    FileSecurity,
    RateLimiter
};
