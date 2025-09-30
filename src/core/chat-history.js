/**
 * Enhanced Chat History System for AutomatosX
 * Practical approach: Fast search + reliable storage + optional semantic search
 * Focuses on what users actually need: finding and organizing conversations
 */

import fs from 'fs-extra';
import path from 'path';
import { PracticalMemorySystem } from '../memory/practical-memory-system.js';
import { getMilvusInstance } from '../memory/milvus-embedded.js';

export class ChatHistoryManager {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.historyPath = path.join(projectPath, '.defai/chat-history');

        // New practical memory system
        this.practicalMemory = new PracticalMemorySystem(projectPath);

        // Legacy support for backward compatibility - will use singleton
        this.vectorDB = null;
        this.initialized = false;
        this.sessionId = this.generateSessionId();
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await fs.ensureDir(this.historyPath);

            // Initialize practical memory system (primary)
            await this.practicalMemory.initialize();

            // Initialize legacy vector DB using singleton (optional)
            try {
                this.vectorDB = await getMilvusInstance(this.projectPath);
            } catch (error) {
                console.warn('⚠️  Vector DB unavailable, using practical memory only:', error.message);
            }

            this.initialized = true;
            console.log('✅ Enhanced chat history system initialized');
        } catch (error) {
            console.warn('⚠️  Chat history initialization failed:', error.message);
            this.initialized = true;
        }
    }

    /**
     * Record a conversation between user and agent
     * @param {string} agentRole - The agent role (backend, frontend, ceo, etc.)
     * @param {string} userMessage - User's input/task
     * @param {string} agentResponse - Agent's response
     * @param {Object} metadata - Additional metadata
     */
    async recordConversation(agentRole, userMessage, agentResponse, metadata = {}) {
        await this.initialize();

        const conversationRecord = {
            id: this.generateMessageId(),
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            agentRole: agentRole,
            userMessage: userMessage,
            agentResponse: agentResponse,
            metadata: {
                provider: metadata.provider || 'unknown',
                model: metadata.model || 'unknown',
                responseTime: metadata.responseTime || 0,
                tokensUsed: metadata.tokensUsed || 0,
                ...metadata
            }
        };

        try {
            // Primary storage: Practical memory system
            await this.practicalMemory.storeConversation(conversationRecord);

            // Legacy storage: Vector DB and file backup
            await this.saveToLocalFile(conversationRecord);

            // Optional: Vector DB storage
            try {
                await this.vectorDB.storeMemory(
                    conversationRecord.id,
                    `Role: ${agentRole}. User: ${userMessage}`,
                    agentResponse,
                    {
                        sessionId: this.sessionId,
                        agentRole: agentRole,
                        timestamp: conversationRecord.timestamp,
                        provider: conversationRecord.metadata.provider,
                        model: conversationRecord.metadata.model
                    }
                );
            } catch (error) {
                console.warn('⚠️  Vector DB storage failed:', error.message);
            }

        } catch (error) {
            console.warn('⚠️  Conversation recording failed:', error.message);
        }

        return conversationRecord.id;
    }

    /**
     * Search chat history by content
     * @param {string} query - Search query
     * @param {string} agentRole - Optional: filter by agent role
     * @param {number} limit - Number of results to return
     */
    async searchHistory(query, agentRole = null, limit = 10) {
        await this.initialize();

        try {
            // Primary search: Practical memory system (fast + semantic)
            const results = await this.practicalMemory.search(query, {
                agentRole: agentRole,
                limit: limit
            });

            // Convert to legacy format for backward compatibility
            return results.map(result => ({
                id: result.id,
                agentRole: result.agentRole,
                userMessage: result.content || this.extractUserMessage(result.preview || ''),
                agentResponse: result.response || result.preview || '',
                timestamp: result.timestamp,
                relevanceScore: result.score || 0.5,
                category: result.category,
                tags: result.tags,
                sources: result.sources
            }));

        } catch (error) {
            console.warn('⚠️  Practical search failed, using legacy fallback:', error.message);

            // Fallback to legacy methods
            try {
                const vectorResults = await this.vectorDB.searchMemory(query, { agentRole }, limit);
                if (vectorResults && vectorResults.length > 0) {
                    return vectorResults.map(result => ({
                        id: result.id,
                        agentRole: result.metadata?.agentRole || 'unknown',
                        userMessage: this.extractUserMessage(result.content),
                        agentResponse: result.content,
                        timestamp: result.metadata?.timestamp,
                        relevanceScore: result.score || result.distance
                    }));
                }
            } catch (vectorError) {
                console.warn('⚠️  Vector search also failed, using file search:', vectorError.message);
            }

            // Final fallback to file-based search
            return await this.searchLocalFiles(query, agentRole, limit);
        }
    }

    /**
     * Get conversation history for a specific session
     * @param {string} sessionId - Session ID (defaults to current session)
     * @param {number} limit - Number of conversations to retrieve
     */
    async getSessionHistory(sessionId = null, limit = 50) {
        const targetSessionId = sessionId || this.sessionId;
        const historyFile = path.join(this.historyPath, `${targetSessionId}.jsonl`);

        if (!await fs.pathExists(historyFile)) {
            return [];
        }

        const content = await fs.readFile(historyFile, 'utf8');
        const lines = content.trim().split('\n').filter(line => line.trim());

        return lines.slice(-limit).map(line => {
            try {
                return JSON.parse(line);
            } catch (error) {
                return null;
            }
        }).filter(Boolean);
    }

    /**
     * Get conversation thread (related conversations)
     */
    async getConversationThread(conversationId, depth = 3) {
        try {
            return await this.practicalMemory.getConversationThread(conversationId, depth);
        } catch (error) {
            console.warn('⚠️  Failed to get conversation thread:', error.message);
            return [];
        }
    }

    /**
     * Get conversation history for a specific agent
     */
    async getAgentHistory(agentRole, options = {}) {
        try {
            return await this.practicalMemory.getAgentHistory(agentRole, options);
        } catch (error) {
            console.warn('⚠️  Failed to get agent history:', error.message);
            return [];
        }
    }

    /**
     * Get recent conversations across all agents
     */
    async getRecentConversations(limit = 10) {
        try {
            return await this.practicalMemory.getRecentConversations(limit);
        } catch (error) {
            console.warn('⚠️  Failed to get recent conversations:', error.message);
            return [];
        }
    }

    /**
     * Search conversations with enhanced features
     */
    async enhancedSearch(query, options = {}) {
        try {
            const results = await this.practicalMemory.search(query, options);

            // Add conversation threads for context
            if (options.includeThreads) {
                for (const result of results) {
                    try {
                        result.thread = await this.practicalMemory.getConversationThread(result.id, 2);
                    } catch (error) {
                        result.thread = [];
                    }
                }
            }

            return results;
        } catch (error) {
            console.warn('⚠️  Enhanced search failed, falling back to basic search:', error.message);
            return await this.searchHistory(query, options.agentRole, options.limit);
        }
    }

    /**
     * Summarize conversations
     */
    async summarizeConversations(conversationIds) {
        try {
            return await this.practicalMemory.summarizeConversations(conversationIds);
        } catch (error) {
            console.warn('⚠️  Failed to summarize conversations:', error.message);
            return { count: 0, summary: 'Summarization unavailable' };
        }
    }

    /**
     * Get enhanced agent conversation statistics
     */
    async getAgentStats() {
        try {
            // Try enhanced statistics from practical memory system
            const enhancedStats = await this.practicalMemory.getStatistics();

            return {
                // Enhanced stats
                ...enhancedStats,

                // Legacy format compatibility
                totalConversations: enhancedStats.totalConversations,
                agentUsage: enhancedStats.agentBreakdown,
                recentActivity: enhancedStats.recentActivity,
                topTopics: enhancedStats.topTopics,

                // System health
                systemStatus: {
                    practicalMemory: true,
                    vectorDatabase: this.vectorDB?.initialized || false,
                    lastUpdated: new Date().toISOString()
                }
            };

        } catch (error) {
            console.warn('⚠️  Enhanced stats failed, using legacy method:', error.message);

            // Fallback to legacy stats calculation
            const stats = {
                totalConversations: 0,
                agentUsage: {},
                providerUsage: {},
                averageResponseTime: 0,
                totalTokensUsed: 0
            };

            try {
                const historyFiles = await fs.readdir(this.historyPath);

                for (const file of historyFiles) {
                    if (!file.endsWith('.jsonl')) continue;

                    const filePath = path.join(this.historyPath, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const lines = content.trim().split('\n').filter(line => line.trim());

                    lines.forEach(line => {
                        try {
                            const record = JSON.parse(line);
                            stats.totalConversations++;

                            // Agent usage stats
                            stats.agentUsage[record.agentRole] = (stats.agentUsage[record.agentRole] || 0) + 1;

                            // Provider usage stats
                            const provider = record.metadata?.provider || 'unknown';
                            stats.providerUsage[provider] = (stats.providerUsage[provider] || 0) + 1;

                            // Token and response time stats
                            stats.totalTokensUsed += record.metadata?.tokensUsed || 0;

                        } catch (error) {
                            // Skip malformed records
                        }
                    });
                }
            } catch (legacyError) {
                console.warn('⚠️  Legacy stats calculation also failed:', legacyError.message);
            }

            return stats;
        }
    }

    async saveToLocalFile(record) {
        const historyFile = path.join(this.historyPath, `${this.sessionId}.jsonl`);
        await fs.appendFile(historyFile, JSON.stringify(record) + '\n');
    }

    async searchLocalFiles(query, agentRole = null, limit = 10) {
        const results = [];
        const queryLower = query.toLowerCase();

        try {
            const historyFiles = await fs.readdir(this.historyPath);

            for (const file of historyFiles) {
                if (!file.endsWith('.jsonl')) continue;

                const filePath = path.join(this.historyPath, file);
                const content = await fs.readFile(filePath, 'utf8');
                const lines = content.trim().split('\n').filter(line => line.trim());

                for (const line of lines.reverse()) {
                    try {
                        const record = JSON.parse(line);

                        // Filter by agent role if specified
                        if (agentRole && record.agentRole !== agentRole) continue;

                        // Simple text matching
                        const userMatch = record.userMessage.toLowerCase().includes(queryLower);
                        const agentMatch = record.agentResponse.toLowerCase().includes(queryLower);

                        if (userMatch || agentMatch) {
                            results.push({
                                id: record.id,
                                agentRole: record.agentRole,
                                userMessage: record.userMessage,
                                agentResponse: record.agentResponse.substring(0, 500) + '...',
                                timestamp: record.timestamp,
                                relevanceScore: userMatch ? 0.8 : 0.6
                            });
                        }

                        if (results.length >= limit) break;
                    } catch (error) {
                        continue;
                    }
                }

                if (results.length >= limit) break;
            }
        } catch (error) {
            console.warn('⚠️  File search failed:', error.message);
        }

        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    extractUserMessage(content) {
        // Extract user message from stored content format "Role: X. User: Y"
        const match = content.match(/User: (.+?)$/);
        return match ? match[1] : 'N/A';
    }

    generateSessionId() {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
        return `session-${dateStr}-${timeStr}-${Math.random().toString(36).substr(2, 4)}`;
    }

    generateMessageId() {
        // Use high-resolution time + process hrtime for microsecond precision
        const hrTime = process.hrtime.bigint();
        const randomPart = Math.random().toString(36).substr(2, 12); // Longer random part
        const timestamp = Date.now();

        // Combine timestamp, high-resolution time, and longer random component
        return `msg-${timestamp}-${hrTime.toString(36).slice(-8)}-${randomPart}`;
    }

    getCurrentSessionId() {
        return this.sessionId;
    }

    /**
     * Start a new session (useful for different work sessions)
     */
    startNewSession() {
        this.sessionId = this.generateSessionId();
        console.log(`📝 Started new chat session: ${this.sessionId}`);
        return this.sessionId;
    }
}