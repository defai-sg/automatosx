/**
 * Advanced Security Input Validator for AutomatosX
 * Comprehensive input validation and sanitization system
 * Implements Bob's security enhancement recommendations
 */

import chalk from 'chalk';
import crypto from 'crypto';

export class SecurityValidator {
    constructor(options = {}) {
        this.config = {
            maxPromptLength: options.maxPromptLength || 50000,
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            allowedFileTypes: options.allowedFileTypes || ['.txt', '.md', '.json', '.yaml', '.yml'],
            rateLimitWindow: options.rateLimitWindow || 60000, // 1 minute
            maxRequestsPerWindow: options.maxRequestsPerWindow || 30,
            enableContentFiltering: options.enableContentFiltering !== false,
            enableThreatDetection: options.enableThreatDetection !== false,
            aiConversationMode: options.aiConversationMode !== false, // New: AI conversation context
            relaxedValidation: options.relaxedValidation !== false, // New: Relaxed mode for dev tasks
            localTrustedEnvironment: options.localTrustedEnvironment !== false || process.env.NODE_ENV === 'development', // Disable SQL injection checking for local/trusted environments
            enableSQLInjectionChecking: options.enableSQLInjectionChecking !== false && !options.localTrustedEnvironment // Allow disabling SQL injection checks
        };

        this.requestHistory = new Map();
        this.blockedPatterns = this.loadBlockedPatterns();
        this.threatDatabase = this.loadThreatDatabase();

        console.log(chalk.blue('🛡️  Security validator initialized with comprehensive protection'));
    }

    /**
     * Comprehensive input validation
     */
    async validateInput(input, context = {}) {
        const validationResult = {
            isValid: true,
            sanitizedInput: input,
            warnings: [],
            errors: [],
            securityScore: 1.0,
            flags: []
        };

        try {
            // Step 1: Basic type and structure validation
            this.validateBasicStructure(input, validationResult);

            // Step 2: Length and size validation
            this.validateLength(input, validationResult);

            // Step 3: Rate limiting check
            await this.validateRateLimit(context, validationResult);

            // Step 4: Content safety validation
            if (this.config.enableContentFiltering) {
                await this.validateContentSafety(input, validationResult);
            }

            // Step 5: Threat detection
            if (this.config.enableThreatDetection) {
                await this.detectThreats(input, validationResult);
            }

            // Step 6: Shell injection protection
            this.validateShellSafety(input, validationResult);

            // Step 7: File path traversal protection
            this.validatePathSafety(input, validationResult);

            // Step 8: SQL injection protection (disabled for local trusted environment)
            if (this.config.enableSQLInjectionChecking) {
                this.validateSQLSafety(input, validationResult);
            }

            // Step 9: Cross-site scripting protection
            this.validateXSSSafety(input, validationResult);

            // Step 10: Apply sanitization
            validationResult.sanitizedInput = this.sanitizeInput(input, validationResult);

            // Calculate final security score
            validationResult.securityScore = this.calculateSecurityScore(validationResult);

            // Log validation results
            this.logValidationResult(validationResult, context);

            return validationResult;

        } catch (error) {
            console.error(chalk.red(`❌ Validation error: ${error.message}`));
            validationResult.isValid = false;
            validationResult.errors.push(`Validation failed: ${error.message}`);
            return validationResult;
        }
    }

    /**
     * Validate basic input structure
     */
    validateBasicStructure(input, result) {
        if (input === null || input === undefined) {
            result.errors.push('Input cannot be null or undefined');
            result.isValid = false;
            return;
        }

        if (typeof input !== 'string') {
            result.warnings.push('Input was converted to string');
            input = String(input);
        }

        if (input.trim().length === 0) {
            result.errors.push('Input cannot be empty');
            result.isValid = false;
            return;
        }
    }

    /**
     * Validate input length and size
     */
    validateLength(input, result) {
        if (input.length > this.config.maxPromptLength) {
            result.errors.push(`Input too long: ${input.length} > ${this.config.maxPromptLength} characters`);
            result.isValid = false;
            result.flags.push('OVERSIZED_INPUT');
        }

        // Check for suspiciously long lines (potential attack)
        const lines = input.split('\n');
        const maxLineLength = 2000;
        const longLines = lines.filter(line => line.length > maxLineLength);

        if (longLines.length > 0) {
            result.warnings.push(`${longLines.length} lines exceed ${maxLineLength} characters`);
            result.flags.push('LONG_LINES');
        }
    }

    /**
     * Rate limiting validation
     */
    async validateRateLimit(context, result) {
        const clientId = context.clientId || context.ip || 'default';
        const now = Date.now();
        const windowStart = now - this.config.rateLimitWindow;

        if (!this.requestHistory.has(clientId)) {
            this.requestHistory.set(clientId, []);
        }

        const clientHistory = this.requestHistory.get(clientId);

        // Clean old requests
        const recentRequests = clientHistory.filter(timestamp => timestamp > windowStart);
        this.requestHistory.set(clientId, recentRequests);

        // Check rate limit
        if (recentRequests.length >= this.config.maxRequestsPerWindow) {
            result.errors.push(`Rate limit exceeded: ${recentRequests.length}/${this.config.maxRequestsPerWindow} requests in ${this.config.rateLimitWindow}ms`);
            result.isValid = false;
            result.flags.push('RATE_LIMITED');
            return;
        }

        // Record this request
        recentRequests.push(now);
    }

    /**
     * Content safety validation
     */
    async validateContentSafety(input, result) {
        const lowerInput = input.toLowerCase();

        // Check for explicit content
        const explicitPatterns = [
            /\b(porn|xxx|explicit|adult)\b/gi,
            /\b(violence|murder|kill|attack)\b/gi,
            /\b(drugs|cocaine|heroin|illegal)\b/gi
        ];

        for (const pattern of explicitPatterns) {
            if (pattern.test(input)) {
                result.warnings.push('Potentially inappropriate content detected');
                result.flags.push('CONTENT_WARNING');
                break;
            }
        }

        // Check for hate speech patterns
        const hateSpeechPatterns = [
            /\b(hate|racist|discriminat)\w*\b/gi,
            /\b(nazi|fascist|supremacist)\b/gi
        ];

        for (const pattern of hateSpeechPatterns) {
            if (pattern.test(input)) {
                result.errors.push('Hate speech content detected');
                result.isValid = false;
                result.flags.push('HATE_SPEECH');
                break;
            }
        }

        // Check for personal information
        this.detectPersonalInformation(input, result);
    }

    /**
     * Detect personal information
     */
    detectPersonalInformation(input, result) {
        const patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
            ssn: /\b(?!000|666)[0-8][0-9]{2}-(?!00)[0-9]{2}-(?!0000)[0-9]{4}\b/g,
            creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g
        };

        for (const [type, pattern] of Object.entries(patterns)) {
            const matches = input.match(pattern);
            if (matches && matches.length > 0) {
                result.warnings.push(`Potential ${type} detected: ${matches.length} occurrences`);
                result.flags.push(`PII_${type.toUpperCase()}`);
            }
        }
    }

    /**
     * Advanced threat detection
     */
    async detectThreats(input, result) {
        // Check against threat database
        for (const threat of this.threatDatabase) {
            if (threat.pattern.test(input)) {
                result.errors.push(`Security threat detected: ${threat.description}`);
                result.isValid = false;
                result.flags.push(`THREAT_${threat.category}`);
            }
        }

        // Check for suspicious patterns
        this.detectSuspiciousPatterns(input, result);

        // Check for code injection attempts
        this.detectCodeInjection(input, result);
    }

    /**
     * Detect suspicious patterns
     */
    detectSuspiciousPatterns(input, result) {
        const suspiciousPatterns = [
            {
                pattern: /\b(exploit|vulnerability|0day|zero-day)\b/gi,
                description: 'Security exploit terminology',
                severity: 'medium'
            },
            {
                pattern: /\b(buffer overflow|stack smashing|heap spray)\b/gi,
                description: 'Memory exploitation techniques',
                severity: 'high'
            },
            {
                pattern: /\b(rootkit|backdoor|trojan|malware)\b/gi,
                description: 'Malicious software terminology',
                severity: 'high'
            },
            {
                pattern: /\b(ddos|botnet|zombie)\b/gi,
                description: 'Network attack terminology',
                severity: 'medium'
            }
        ];

        for (const suspicious of suspiciousPatterns) {
            if (suspicious.pattern.test(input)) {
                if (suspicious.severity === 'high') {
                    result.errors.push(`High-risk content: ${suspicious.description}`);
                    result.isValid = false;
                } else {
                    result.warnings.push(`Suspicious content: ${suspicious.description}`);
                }
                result.flags.push(`SUSPICIOUS_${suspicious.description.toUpperCase().replace(/\s+/g, '_')}`);
            }
        }
    }

    /**
     * Detect code injection attempts
     */
    detectCodeInjection(input, result) {
        // Skip Node.js keyword detection in AI conversation mode
        if (this.config.aiConversationMode && this.isLikelyTechnicalDiscussion(input)) {
            return;
        }

        const injectionPatterns = [
            {
                name: 'JavaScript injection',
                pattern: /<script|javascript:|on\w+\s*=/gi
            },
            {
                name: 'Python injection',
                pattern: /\b(exec|eval|__import__|compile)\s*\(/gi
            },
            {
                name: 'Command injection',
                pattern: /\b(system|exec|shell_exec|passthru|popen)\s*\(/gi
            }
        ];

        // Only check Node.js patterns if not in relaxed mode or if input looks suspicious
        if (!this.config.relaxedValidation || this.hasSuspiciousCodePatterns(input)) {
            injectionPatterns.push({
                name: 'Node.js injection',
                pattern: /\b(require|process|global|fs\.|child_process)\s*\(/gi // Require function call syntax
            });
        }

        for (const injection of injectionPatterns) {
            if (injection.pattern.test(input)) {
                if (this.config.relaxedValidation && injection.name === 'Node.js injection') {
                    result.warnings.push(`Potential ${injection.name} (relaxed mode)`);
                    result.flags.push('CODE_INJECTION_WARNING');
                } else {
                    result.errors.push(`Code injection attempt detected: ${injection.name}`);
                    result.isValid = false;
                    result.flags.push('CODE_INJECTION');
                }
            }
        }
    }

    /**
     * Shell injection protection
     */
    validateShellSafety(input, result) {
        // More relaxed approach for AI conversations
        const criticalShellPatterns = [
            /\|\s*sh\b/gi,   // Pipe to shell
            /\|\s*bash\b/gi, // Pipe to bash
            /\|\s*nc\b/gi,   // Netcat
            /\|\s*curl.*\|/gi, // Curl pipe chains
            /rm\s+-rf/gi,    // Dangerous file operations
            /sudo\s+/gi      // Privilege escalation
        ];

        const minorShellPatterns = [
            /[;&|`$]/g,      // Shell metacharacters (reduced from original)
            /[<>]/g          // Redirection operators
        ];

        let criticalThreats = 0;
        let minorThreats = 0;

        // Check critical patterns first
        for (const pattern of criticalShellPatterns) {
            const matches = input.match(pattern);
            if (matches) {
                criticalThreats += matches.length;
            }
        }

        // Check minor patterns only if not in AI conversation mode
        if (!this.config.aiConversationMode || !this.isLikelyTechnicalDiscussion(input)) {
            for (const pattern of minorShellPatterns) {
                const matches = input.match(pattern);
                if (matches) {
                    minorThreats += matches.length;
                }
            }
        }

        // Adjusted thresholds for better balance
        if (criticalThreats > 0) {
            result.errors.push(`Critical shell injection patterns detected: ${criticalThreats}`);
            result.isValid = false;
            result.flags.push('SHELL_INJECTION');
        } else if (minorThreats > 8) { // Increased threshold from 3 to 8
            if (this.config.relaxedValidation) {
                result.warnings.push(`Multiple shell characters detected: ${minorThreats} (relaxed mode)`);
            } else {
                result.errors.push(`Multiple shell injection patterns detected: ${minorThreats}`);
                result.isValid = false;
            }
            result.flags.push('SHELL_INJECTION');
        } else if (minorThreats > 0) {
            result.warnings.push(`Potential shell characters detected: ${minorThreats}`);
        }
    }

    /**
     * Path traversal protection
     */
    validatePathSafety(input, result) {
        const pathTraversalPatterns = [
            /\.\.[\/\\]/g,     // Directory traversal
            /\/etc\/passwd/gi, // System file access
            /\/proc\//gi,      // Process information
            /[A-Za-z]:[\/\\]/g, // Windows absolute paths
            /~[\/\\]/g         // Home directory access
        ];

        for (const pattern of pathTraversalPatterns) {
            if (pattern.test(input)) {
                result.warnings.push('Path traversal patterns detected');
                result.flags.push('PATH_TRAVERSAL');
                break;
            }
        }
    }

    /**
     * SQL injection protection
     */
    validateSQLSafety(input, result) {
        const sqlPatterns = [
            /('\s*(or|and)\s*')|('\s*(or|and)\s*\d)/gi,
            /(union\s+select)|(select.*from)|(drop\s+table)/gi,
            /(')|(\\')|(;)|(--)|(\s+(or|and)\s+)/gi
        ];

        for (const pattern of sqlPatterns) {
            if (pattern.test(input)) {
                result.warnings.push('SQL injection patterns detected');
                result.flags.push('SQL_INJECTION');
                break;
            }
        }
    }

    /**
     * Cross-site scripting protection
     */
    validateXSSSafety(input, result) {
        const xssPatterns = [
            /<script[^>]*>.*?<\/script>/gi,
            /javascript\s*:/gi,
            /on\w+\s*=\s*["\'][^"\']*["\']/gi,
            /<iframe[^>]*>.*?<\/iframe>/gi
        ];

        for (const pattern of xssPatterns) {
            if (pattern.test(input)) {
                result.warnings.push('XSS patterns detected');
                result.flags.push('XSS');
                break;
            }
        }
    }

    /**
     * Sanitize input based on validation results
     */
    sanitizeInput(input, validationResult) {
        let sanitized = input;

        // Remove null bytes
        sanitized = sanitized.replace(/\x00/g, '');

        // If shell injection detected, remove dangerous characters
        if (validationResult.flags.includes('SHELL_INJECTION')) {
            sanitized = sanitized.replace(/[;&|`$()<>]/g, '');
        }

        // If XSS detected, escape HTML
        if (validationResult.flags.includes('XSS')) {
            sanitized = sanitized
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;');
        }

        // Trim excessive whitespace
        sanitized = sanitized.replace(/\s+/g, ' ').trim();

        // Limit length if needed
        if (sanitized.length > this.config.maxPromptLength) {
            sanitized = sanitized.substring(0, this.config.maxPromptLength);
            validationResult.warnings.push('Input truncated due to length');
        }

        return sanitized;
    }

    /**
     * Calculate security score
     */
    calculateSecurityScore(validationResult) {
        let score = 1.0;

        // Deduct for errors (critical issues)
        score -= validationResult.errors.length * 0.3;

        // Deduct for warnings (minor issues)
        score -= validationResult.warnings.length * 0.1;

        // Deduct for flags (security concerns)
        score -= validationResult.flags.length * 0.05;

        return Math.max(0, Math.min(1, score));
    }

    /**
     * Load blocked patterns database
     */
    loadBlockedPatterns() {
        return [
            {
                category: 'MALWARE',
                pattern: /\b(virus|trojan|worm|ransomware|spyware)\b/gi,
                action: 'block'
            },
            {
                category: 'HACKING',
                pattern: /\b(crack|hack|exploit|breach|penetration)\b/gi,
                action: 'warn'
            },
            {
                category: 'ILLEGAL',
                pattern: /\b(illegal|criminal|fraud|scam|phishing)\b/gi,
                action: 'warn'
            }
        ];
    }

    /**
     * Load threat detection database
     */
    loadThreatDatabase() {
        return [
            {
                category: 'COMMAND_INJECTION',
                pattern: /rm\s+-rf\s+[\/\\]/gi,
                description: 'Dangerous file deletion command',
                severity: 'critical'
            },
            {
                category: 'PRIVILEGE_ESCALATION',
                pattern: /sudo\s+(su|passwd|chmod\s+777)/gi,
                description: 'Privilege escalation attempt',
                severity: 'critical'
            },
            {
                category: 'NETWORK_SCANNING',
                pattern: /nmap\s+(-s[STAU]|--scan)/gi,
                description: 'Network scanning tool usage',
                severity: 'high'
            },
            {
                category: 'CREDENTIAL_THEFT',
                pattern: /\b(password|credential|token)\s*(harvest|steal|dump)/gi,
                description: 'Credential theft terminology',
                severity: 'high'
            }
        ];
    }

    /**
     * Log validation results
     */
    logValidationResult(result, context) {
        const level = result.isValid ?
            (result.warnings.length > 0 ? 'warn' : 'info') : 'error';

        const logColor = level === 'error' ? chalk.red :
                        level === 'warn' ? chalk.yellow : chalk.green;

        const status = result.isValid ? '✅ PASSED' : '❌ FAILED';
        console.log(logColor(`🛡️  Security validation ${status} (score: ${(result.securityScore * 100).toFixed(1)}%)`));

        if (result.errors.length > 0) {
            console.log(chalk.red(`   Errors: ${result.errors.join(', ')}`));
        }

        if (result.warnings.length > 0) {
            console.log(chalk.yellow(`   Warnings: ${result.warnings.join(', ')}`));
        }

        if (result.flags.length > 0) {
            console.log(chalk.gray(`   Flags: ${result.flags.join(', ')}`));
        }
    }

    /**
     * Generate security report
     */
    generateSecurityReport(timeWindow = 3600000) {
        const now = Date.now();
        const cutoff = now - timeWindow;

        const report = {
            timeWindow: timeWindow,
            totalValidations: 0,
            passedValidations: 0,
            failedValidations: 0,
            commonThreats: new Map(),
            rateLimitViolations: 0,
            averageSecurityScore: 0
        };

        // This would be populated from actual validation history
        // For now, return basic structure

        return report;
    }

    /**
     * Clean up old request history
     */
    cleanup() {
        const cutoff = Date.now() - this.config.rateLimitWindow;

        for (const [clientId, requests] of this.requestHistory.entries()) {
            const recentRequests = requests.filter(timestamp => timestamp > cutoff);
            if (recentRequests.length > 0) {
                this.requestHistory.set(clientId, recentRequests);
            } else {
                this.requestHistory.delete(clientId);
            }
        }
    }

    /**
     * Check if input is likely a technical discussion rather than code execution
     */
    isLikelyTechnicalDiscussion(input) {
        const discussionKeywords = [
            'please', 'help', 'check', 'review', 'analyze', 'explain', 'implement',
            'create', 'design', 'optimize', 'fix', 'debug', 'test', 'build',
            'problem', 'issue', 'bug', 'feature', 'solution', 'approach'
        ];

        const lowerInput = input.toLowerCase();
        const keywordMatches = discussionKeywords.filter(keyword =>
            lowerInput.includes(keyword)
        ).length;

        // If input contains discussion keywords and is reasonably long, likely a conversation
        return keywordMatches >= 2 && input.length > 20;
    }

    /**
     * Check for suspicious code execution patterns
     */
    hasSuspiciousCodePatterns(input) {
        const suspiciousPatterns = [
            /require\s*\(\s*['"]child_process['"]\s*\)/gi,
            /require\s*\(\s*['"]fs['"]\s*\).*writeFile/gi,
            /process\.exit\s*\(/gi,
            /eval\s*\(/gi,
            /Function\s*\(/gi
        ];

        return suspiciousPatterns.some(pattern => pattern.test(input));
    }
}

/**
 * File Validator for secure file handling
 */
export class FileValidator {
    static validateFile(filePath, content = null) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            sanitizedPath: filePath
        };

        // Path traversal protection
        if (filePath.includes('..') || filePath.includes('~')) {
            validation.errors.push('Path traversal detected');
            validation.isValid = false;
        }

        // File extension validation
        const allowedExtensions = ['.txt', '.md', '.json', '.yaml', '.yml', '.js', '.py'];
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));

        if (!allowedExtensions.includes(ext)) {
            validation.warnings.push(`File extension ${ext} not in whitelist`);
        }

        // Content validation if provided
        if (content) {
            if (content.length > 10 * 1024 * 1024) { // 10MB
                validation.errors.push('File too large');
                validation.isValid = false;
            }
        }

        return validation;
    }
}