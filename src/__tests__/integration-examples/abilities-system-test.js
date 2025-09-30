/**
 * AutomatosX Abilities System Demo
 * Shows how abilities (MD files) work separately from chat history (Milvus)
 */

import chalk from 'chalk';
import fs from 'fs-extra';
import path from 'path';
import { EnhancedAutomatosXRouter } from '../../core/enhanced-router.js';

// System requirements check
async function checkSystemRequirements() {
    const requirements = {
        agentsDirectory: 'src/agents',
        abilities: 'src/agents/backend/abilities',
        agentProfiles: 'src/agents/agent-profiles.js'
    };

    console.log(chalk.yellow('🔍 Checking system requirements...'));

    for (const [name, path] of Object.entries(requirements)) {
        try {
            const exists = await fs.pathExists(path);
            if (exists) {
                console.log(chalk.green(`   ✅ ${name}: ${path}`));
            } else {
                console.log(chalk.red(`   ❌ ${name}: ${path} (missing)`));
                return false;
            }
        } catch (error) {
            console.log(chalk.red(`   ❌ ${name}: Error checking ${path}`));
            return false;
        }
    }

    console.log(chalk.green('✅ All requirements satisfied\n'));
    return true;
}

async function demonstrateAbilitiesSystem() {
    console.log(chalk.blue.bold('🎯 AutomatosX Abilities System Demonstration\n'));

    // Check system requirements first
    const requirementsMet = await checkSystemRequirements();
    if (!requirementsMet) {
        console.log(chalk.red('❌ System requirements not met. Please ensure AutomatosX is properly set up.'));
        console.log(chalk.yellow('💡 Run: npm run validate'));
        process.exit(1);
    }

    let router;
    try {
        console.log(chalk.yellow('🚀 Initializing Enhanced AutomatosX Router...'));
        router = new EnhancedAutomatosXRouter();
        await router.initialize();
        console.log(chalk.green('✅ Router initialized successfully\n'));
    } catch (error) {
        console.error(chalk.red('❌ Failed to initialize router:'), error.message);
        console.log(chalk.yellow('💡 This might be due to missing dependencies (Milvus, etc.)'));
        console.log(chalk.yellow('   The system will fall back to file-based storage automatically.'));
        return;
    }

    console.log(chalk.yellow('1. ABILITIES SYSTEM (MD files - user-modifiable)'));
    console.log(chalk.gray('   These are role-specific knowledge files that users can edit\n'));

    // Show abilities search
    console.log(chalk.cyan('🔍 Searching for "API testing" abilities...'));
    const apiTestingAbilities = await router.searchAbilities('API testing', ['backend', 'quality'], 3);

    apiTestingAbilities.forEach((ability, index) => {
        console.log(chalk.green(`   ${index + 1}. ${ability.filename} (${ability.role})`));
        console.log(chalk.gray(`      Relevance: ${Math.round(ability.relevance * 100)}%`));
        console.log(chalk.gray(`      Preview: ${ability.preview.substring(0, 100)}...`));
    });

    console.log('\n' + chalk.yellow('2. CHAT HISTORY SYSTEM (Milvus - automatic)'));
    console.log(chalk.gray('   This stores conversation history for semantic search\n'));

    // Simulate a task that would use abilities
    console.log(chalk.cyan('🤖 Simulating task routing with abilities...'));

    try {
        // This would normally call the AI provider, but we'll just show the prompt building
        const testRole = 'backend';
        const testTask = 'Design a REST API for user authentication';

        // Get relevant abilities
        console.log(chalk.cyan('📚 Getting relevant abilities...'));
        const relevantAbilities = await router.getRelevantAbilities(testRole, testTask);

        console.log(chalk.green(`   Found ${relevantAbilities.length} relevant abilities:`));
        relevantAbilities.forEach((ability, index) => {
            console.log(chalk.gray(`   - ${ability.filename} (${Math.round(ability.relevance * 100)}% relevant)`));
        });

        // Show how the prompt would be enhanced
        console.log(chalk.cyan('\n🔧 Building enhanced prompt with abilities...'));
        const enhancedPrompt = router.profileManager.buildAgentPrompt(
            testRole,
            testTask,
            'You are a helpful assistant.',
            relevantAbilities
        );

        console.log(chalk.green('✅ Prompt built successfully with abilities integration'));
        console.log(chalk.gray(`   Total prompt length: ${enhancedPrompt.length} characters`));

        // Show a snippet of the prompt
        const promptSnippet = enhancedPrompt.substring(0, 300) + '...';
        console.log(chalk.gray('\n   Prompt preview:'));
        console.log(chalk.gray(`   "${promptSnippet}"`));

    } catch (error) {
        console.error(chalk.red('❌ Error in demo:'), error.message);
    }

    console.log(chalk.blue.bold('\n🎯 Key Differences:'));
    console.log(chalk.yellow('   • ABILITIES: MD files users can edit to customize agent knowledge'));
    console.log(chalk.yellow('   • CHAT HISTORY: Automatic Milvus storage for conversation context'));
    console.log(chalk.yellow('   • Both work together to provide comprehensive agent memory'));

    console.log(chalk.green('\n✅ Abilities system demonstration complete!'));
}

// Run the demonstration with comprehensive error handling
async function main() {
    try {
        await demonstrateAbilitiesSystem();
    } catch (error) {
        console.error(chalk.red('\n❌ Example failed with error:'));
        console.error(chalk.red(`   ${error.message}`));

        console.log(chalk.yellow('\n🔧 Troubleshooting suggestions:'));
        console.log(chalk.yellow('   1. Ensure you are running from the project root directory'));
        console.log(chalk.yellow('   2. Run: npm install'));
        console.log(chalk.yellow('   3. Run: npm run validate'));
        console.log(chalk.yellow('   4. Check that all required files exist'));

        console.log(chalk.blue('\n📚 For more help, see:'));
        console.log(chalk.blue('   • examples/README.md'));
        console.log(chalk.blue('   • CLAUDE.md (troubleshooting section)'));

        process.exit(1);
    }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
