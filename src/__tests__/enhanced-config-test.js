#!/usr/bin/env node

/**
 * Enhanced Configuration Test Suite for AutomatosX v3.1.1
 * Comprehensive testing of refactored profile, memory, and abilities systems
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';
import { AGENT_PROFILES, getAgentByRole, buildEnhancedAgentPrompt } from '../agents/agent-profiles.js';
import { EnhancedMemoryConfig } from '../memory/enhanced-memory-config.js';
import { EnhancedAbilitiesManager } from '../core/enhanced-abilities-manager.js';

class EnhancedConfigTester {
    constructor() {
        this.projectPath = process.cwd();
        this.testResults = {
            profiles: { passed: 0, failed: 0, tests: [] },
            memory: { passed: 0, failed: 0, tests: [] },
            abilities: { passed: 0, failed: 0, tests: [] },
            integration: { passed: 0, failed: 0, tests: [] }
        };
        this.memoryConfig = new EnhancedMemoryConfig();
        this.abilitiesManager = new EnhancedAbilitiesManager(this.projectPath);
    }

    async runAllTests() {
        console.log('🧪 Starting Enhanced Configuration Test Suite...\n');

        try {
            await this.testProfileStructure();
            await this.testMemoryConfiguration();
            await this.testAbilitiesSystem();
            await this.testIntegration();

            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            process.exit(1);
        }
    }

    /**
     * Test YAML profile structure and validation
     */
    async testProfileStructure() {
        console.log('📋 Testing Profile Structure...');

        // Test 1: Validate all YAML profiles exist and are parseable
        await this.runTest('profiles', 'YAML Profile Validation', async () => {
            const expectedRoles = Array.from(
                new Set(Object.values(AGENT_PROFILES).map(profile => profile.role))
            ).sort();

            for (const role of expectedRoles) {
                const profilePath = await this.getProfilePath(role);

                if (!profilePath) {
                    throw new Error(`Profile ${role} not found in src/agents or .defai/agents`);
                }

                const content = await fs.readFile(profilePath, 'utf8');
                const profile = yaml.load(content);

                // Validate required fields
                const requiredFields = ['role', 'name', 'title', 'description', 'personality', 'stages', 'memory'];
                for (const field of requiredFields) {
                    if (!profile[field]) {
                        throw new Error(`Required field '${field}' missing in ${role}.yaml`);
                    }
                }

                // Validate enhanced structure
                if (!profile.personality.traits || !profile.personality.specializations) {
                    throw new Error(`Enhanced personality structure missing in ${role}.yaml`);
                }

                // Validate that no deprecated model fields exist
                if (profile.models) {
                    console.warn(`⚠️  Deprecated 'models' field found in ${role}.yaml - should use provider-based configuration`);
                }
            }

            return `Validated ${expectedRoles.length} YAML profiles`;
        });

        // Test 2: Validate agent profiles match YAML configurations
        await this.runTest('profiles', 'Agent Profile Consistency', async () => {
            const inconsistencies = [];

            for (const [agentName, agent] of Object.entries(AGENT_PROFILES)) {
                const yamlAgent = await this.loadYamlProfile(agent.role);

                if (yamlAgent.name !== agent.name) {
                    inconsistencies.push(`Name mismatch: ${agent.role} - YAML: ${yamlAgent.name}, JS: ${agent.name}`);
                }

                if (yamlAgent.title !== agent.title) {
                    inconsistencies.push(`Title mismatch: ${agent.role} - YAML: ${yamlAgent.title}, JS: ${agent.title}`);
                }
            }

            if (inconsistencies.length > 0) {
                throw new Error(`Profile inconsistencies found: ${inconsistencies.join(', ')}`);
            }

            return `Validated consistency across ${Object.keys(AGENT_PROFILES).length} agent profiles`;
        });

        // Test 3: Validate provider configurations (model-agnostic approach)
        await this.runTest('profiles', 'Provider Configuration', async () => {
            const profiles = await this.loadAllYamlProfiles();

            for (const [role, profile] of Object.entries(profiles)) {
                if (!profile.stages) continue;

                // Check if profile has provider configuration
                if (profile.providers) {
                    for (const stage of profile.stages) {
                        const stageProviders = profile.providers[stage];

                        if (stageProviders) {
                            if (!stageProviders.primary) {
                                throw new Error(`Missing primary provider for ${role}:${stage}`);
                            }

                            if (!stageProviders.fallback) {
                                throw new Error(`Missing fallback provider for ${role}:${stage}`);
                            }
                        }
                    }
                }
            }

            return `Validated provider configurations for ${Object.keys(profiles).length} profiles`;
        });

        console.log('✅ Profile structure tests completed\n');
    }

    /**
     * Test memory configuration system
     */
    async testMemoryConfiguration() {
        console.log('🧠 Testing Memory Configuration...');

        // Test 1: Validate memory config generation
        await this.runTest('memory', 'Memory Config Generation', async () => {
            const testRoles = ['backend', 'frontend', 'security', 'architect'];

            for (const role of testRoles) {
                const config = this.memoryConfig.getRoleConfig(role);

                // Validate required fields
                const requiredFields = ['scopes', 'retrieval_limit', 'context_window', 'semantic_search'];
                for (const field of requiredFields) {
                    if (config[field] === undefined) {
                        throw new Error(`Missing memory config field '${field}' for role ${role}`);
                    }
                }

                // Validate scope inheritance
                if (!config.scopes.includes('global')) {
                    throw new Error(`Global scope missing for role ${role}`);
                }

                if (!config.scopes.includes(role)) {
                    throw new Error(`Role-specific scope missing for role ${role}`);
                }
            }

            return `Generated and validated memory configs for ${testRoles.length} roles`;
        });

        // Test 2: Test collaborative memory scopes
        await this.runTest('memory', 'Collaborative Memory Scopes', async () => {
            const collaborativeScopes = this.memoryConfig.getCollaborativeScopes('backend', ['security', 'devops']);

            const expectedScopes = ['global', 'backend', 'security', 'architecture', 'devops', 'infrastructure'];
            const missingScopes = expectedScopes.filter(scope => !collaborativeScopes.includes(scope));

            if (missingScopes.length > 0) {
                throw new Error(`Missing collaborative scopes: ${missingScopes.join(', ')}`);
            }

            return `Validated collaborative scopes: ${collaborativeScopes.length} total scopes`;
        });

        // Test 3: Test memory optimization configurations
        await this.runTest('memory', 'Memory Optimization Configs', async () => {
            const optimizationTypes = ['high-performance', 'low-latency', 'comprehensive', 'standard'];

            for (const type of optimizationTypes) {
                const config = this.memoryConfig.createOptimizedConfig('backend', type);

                this.memoryConfig.validateConfig(config);

                if (config.optimization !== type) {
                    throw new Error(`Optimization type not set correctly for ${type}`);
                }
            }

            return `Validated ${optimizationTypes.length} optimization configurations`;
        });

        console.log('✅ Memory configuration tests completed\n');
    }

    /**
     * Test abilities system
     */
    async testAbilitiesSystem() {
        console.log('🎯 Testing Abilities System...');

        // Test 1: Initialize abilities manager
        await this.runTest('abilities', 'Abilities Manager Initialization', async () => {
            await this.abilitiesManager.initialize();

            if (!this.abilitiesManager.initialized) {
                throw new Error('Abilities manager failed to initialize');
            }

            return 'Abilities manager initialized successfully';
        });

        // Test 2: Load role abilities
        await this.runTest('abilities', 'Role Abilities Loading', async () => {
            const testRoles = ['backend', 'frontend', 'security'];
            const loadedAbilities = [];

            for (const role of testRoles) {
                const abilities = await this.abilitiesManager.loadRoleAbilities(role);

                if (!abilities || !abilities.role) {
                    throw new Error(`Failed to load abilities for role ${role}`);
                }

                if (abilities.role !== role) {
                    throw new Error(`Role mismatch: expected ${role}, got ${abilities.role}`);
                }

                loadedAbilities.push(role);
            }

            return `Loaded abilities for ${loadedAbilities.length} roles: ${loadedAbilities.join(', ')}`;
        });

        // Test 3: Test abilities search functionality
        await this.runTest('abilities', 'Abilities Search', async () => {
            const searchQueries = [
                { query: 'API design', expectedRoles: ['backend'] },
                { query: 'React development', expectedRoles: ['frontend'] },
                { query: 'security', expectedRoles: ['security', 'backend'] }
            ];

            for (const { query, expectedRoles } of searchQueries) {
                const results = await this.abilitiesManager.searchAbilities(query, expectedRoles, { max_results: 5 });

                if (results.length === 0) {
                    throw new Error(`No search results for query: ${query}`);
                }

                const foundRoles = [...new Set(results.map(r => r.role))];
                const missingRoles = expectedRoles.filter(role => !foundRoles.includes(role));

                if (missingRoles.length > 0) {
                    console.warn(`⚠️  Missing expected roles for "${query}": ${missingRoles.join(', ')}`);
                }
            }

            return `Validated search for ${searchQueries.length} queries`;
        });

        console.log('✅ Abilities system tests completed\n');
    }

    /**
     * Test system integration
     */
    async testIntegration() {
        console.log('🔗 Testing System Integration...');

        // Test 1: Agent prompt building
        await this.runTest('integration', 'Agent Prompt Building', async () => {
            const testCases = [
                { agent: 'Bob', task: 'Design a REST API', options: { verbose: true } },
                { agent: 'Frank', task: 'Create responsive navbar', options: { includeCollaboration: true } },
                { agent: 'Steve', task: 'Security audit', options: { includeDecisionMaking: true } }
            ];

            for (const { agent, task, options } of testCases) {
                const prompt = buildEnhancedAgentPrompt(agent, task, 'Base prompt content', options);

                if (!prompt.includes(agent)) {
                    throw new Error(`Agent name ${agent} not found in prompt`);
                }

                if (!prompt.includes(task)) {
                    throw new Error(`Task "${task}" not found in prompt`);
                }

                const agentProfile = AGENT_PROFILES[agent];
                if (!prompt.includes(agentProfile.catchphrase)) {
                    throw new Error(`Catchphrase not found in prompt for ${agent}`);
                }
            }

            return `Built and validated prompts for ${testCases.length} test cases`;
        });

        // Test 2: Role-based agent lookup
        await this.runTest('integration', 'Role-Based Agent Lookup', async () => {
            const roleMappings = [
                { role: 'backend', expectedAgent: 'Bob' },
                { role: 'frontend', expectedAgent: 'Frank' },
                { role: 'security', expectedAgent: 'Steve' },
                { role: 'devops', expectedAgent: 'Oliver' }
            ];

            for (const { role, expectedAgent } of roleMappings) {
                const agent = getAgentByRole(role);

                if (!agent) {
                    throw new Error(`No agent found for role ${role}`);
                }

                if (agent.name !== expectedAgent) {
                    throw new Error(`Expected agent ${expectedAgent} for role ${role}, got ${agent.name}`);
                }
            }

            return `Validated ${roleMappings.length} role-to-agent mappings`;
        });

        // Test 3: Configuration consistency
        await this.runTest('integration', 'Configuration Consistency', async () => {
            const allRoles = Object.values(AGENT_PROFILES).map(agent => agent.role);
            const inconsistencies = [];

            for (const role of allRoles) {
                // Check YAML profile exists
                const yamlPath = path.join(this.projectPath, 'profiles', `${role}.yaml`);
                if (!await fs.pathExists(yamlPath)) {
                    inconsistencies.push(`Missing YAML profile for role ${role}`);
                    continue;
                }

                // Check memory config
                try {
                    const memoryConfig = this.memoryConfig.getRoleConfig(role);
                    if (!memoryConfig.scopes.includes(role)) {
                        inconsistencies.push(`Memory config missing role scope for ${role}`);
                    }
                } catch (error) {
                    inconsistencies.push(`Memory config error for role ${role}: ${error.message}`);
                }

                // Check abilities path exists
                const abilitiesPath = path.join(this.projectPath, 'src/agents', role, 'abilities');
                if (!await fs.pathExists(abilitiesPath)) {
                    inconsistencies.push(`Missing abilities directory for role ${role}`);
                }
            }

            if (inconsistencies.length > 0) {
                throw new Error(`Configuration inconsistencies: ${inconsistencies.join('; ')}`);
            }

            return `Validated configuration consistency for ${allRoles.length} roles`;
        });

        console.log('✅ System integration tests completed\n');
    }

    /**
     * Run individual test with error handling
     */
    async runTest(category, testName, testFunction) {
        try {
            const result = await testFunction();
            this.testResults[category].passed++;
            this.testResults[category].tests.push({ name: testName, status: 'PASSED', message: result });
            console.log(`  ✅ ${testName}: ${result}`);
        } catch (error) {
            this.testResults[category].failed++;
            this.testResults[category].tests.push({ name: testName, status: 'FAILED', message: error.message });
            console.log(`  ❌ ${testName}: ${error.message}`);
        }
    }

    /**
     * Load YAML profile for a role
     */
    async loadYamlProfile(roleId) {
        const profilePath = await this.getProfilePath(roleId);
        if (!profilePath) {
            throw new Error(`Profile not found for role ${roleId}`);
        }

        const content = await fs.readFile(profilePath, 'utf8');
        return yaml.load(content);
    }

    /**
     * Load all YAML profiles
     */
    async loadAllYamlProfiles() {
        const profiles = {};

        const roles = Array.from(
            new Set(Object.values(AGENT_PROFILES).map(profile => profile.role))
        );

        for (const roleId of roles) {
            profiles[roleId] = await this.loadYamlProfile(roleId);
        }

        return profiles;
    }

    async getProfilePath(roleId) {
        const userPath = path.join(this.projectPath, '.defai/agents', roleId, 'profile.yaml');
        if (await fs.pathExists(userPath)) {
            return userPath;
        }

        const basePath = path.join(this.projectPath, 'src/agents', roleId, 'profile.yaml');
        if (await fs.pathExists(basePath)) {
            return basePath;
        }

        return null;
    }

    /**
     * Print comprehensive test results
     */
    printResults() {
        console.log('📊 Test Results Summary:');
        console.log('========================\n');

        let totalPassed = 0;
        let totalFailed = 0;

        for (const [category, results] of Object.entries(this.testResults)) {
            const categoryPassed = results.passed;
            const categoryFailed = results.failed;
            const categoryTotal = categoryPassed + categoryFailed;

            totalPassed += categoryPassed;
            totalFailed += categoryFailed;

            const status = categoryFailed === 0 ? '✅' : '❌';
            console.log(`${status} ${category.toUpperCase()}: ${categoryPassed}/${categoryTotal} tests passed`);

            if (categoryFailed > 0) {
                results.tests.filter(test => test.status === 'FAILED').forEach(test => {
                    console.log(`    ❌ ${test.name}: ${test.message}`);
                });
            }
        }

        const overallTotal = totalPassed + totalFailed;
        const successRate = overallTotal > 0 ? Math.round((totalPassed / overallTotal) * 100) : 0;

        console.log(`\n🎯 Overall: ${totalPassed}/${overallTotal} tests passed (${successRate}%)`);

        if (totalFailed > 0) {
            console.log(`\n⚠️  ${totalFailed} tests failed. Please review the issues above.`);
            process.exit(1);
        } else {
            console.log('\n🎉 All tests passed! Enhanced configuration system is working correctly.');
        }
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new EnhancedConfigTester();
    tester.runAllTests().catch(console.error);
}

export { EnhancedConfigTester };
