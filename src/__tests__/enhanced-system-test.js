#!/usr/bin/env node

/**
 * Enhanced System Test Suite for AutomatosX v3.1.1
 * Tests the integration of Agent Platform-style profiles with chat history
 */

import chalk from 'chalk';
import { ProfileManager } from '../core/profile-manager.js';
import { ChatHistoryManager } from '../core/chat-history.js';
import { AGENT_PROFILES } from '../agents/agent-profiles.js';

async function runTestSuite() {
    console.log(chalk.bold.blue('🧪 Enhanced AutomatosX System Test Suite\n'));

    const tests = [
        { name: 'Profile Manager', fn: testProfileManager },
        { name: 'Chat History Manager', fn: testChatHistory },
        { name: 'YAML Structure Validation', fn: testYAMLStructure }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        console.log(chalk.blue(`🧪 Testing ${test.name}...`));
        try {
            const result = await test.fn();
            if (result) {
                passed++;
                console.log(chalk.green(`✅ ${test.name} - PASSED\n`));
            } else {
                failed++;
                console.log(chalk.red(`❌ ${test.name} - FAILED\n`));
            }
        } catch (error) {
            failed++;
            console.log(chalk.red(`❌ ${test.name} - ERROR: ${error.message}\n`));
        }
    }

    console.log(chalk.bold.blue('📊 Test Summary:'));
    console.log(chalk.green(`✅ Passed: ${passed}`));
    console.log(chalk.red(`❌ Failed: ${failed}`));

    return failed === 0;
}

async function testProfileManager() {
    const profileManager = new ProfileManager();
    await profileManager.loadProfiles();

    const roles = profileManager.getAvailableRoles();
    const expectedCount = Object.keys(AGENT_PROFILES).length;
    if (roles.length !== expectedCount) return false;

    const backendProfile = profileManager.getEnhancedProfile('backend');
    if (!backendProfile || !backendProfile.stages) return false;

    const validation = profileManager.validateProfile('backend');
    if (!validation.valid) return false;

    console.log(chalk.green(`✅ Loaded ${roles.length} profiles with validation`));
    return true;
}

async function testChatHistory() {
    const chatHistory = new ChatHistoryManager();
    await chatHistory.initialize();

    const conversationId = await chatHistory.recordConversation(
        'backend',
        'Test conversation',
        'Test response',
{ provider: 'test' }
    );

    if (!conversationId) return false;

    const stats = await chatHistory.getAgentStats();
    if (stats.totalConversations === 0) return false;

    console.log(chalk.green('✅ Chat history recording and stats working'));
    return true;
}

async function testYAMLStructure() {
    const profileManager = new ProfileManager();
    await profileManager.loadProfiles();

    const stats = profileManager.getStats();
    const expectedCount = Object.keys(AGENT_PROFILES).length;
    if (stats.totalProfiles !== expectedCount) return false;
    if (stats.averageStages < 5) return false;
    if (!stats.modelProviders.includes('claude-code')) return false;

    console.log(chalk.green('✅ YAML structure validation passed'));
    return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runTestSuite()
        .then(success => process.exit(success ? 0 : 1))
        .catch(error => {
            console.error(chalk.red('❌ Test suite failed:'), error);
            process.exit(1);
        });
}
