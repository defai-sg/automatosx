/**
 * AutomatosX Unified Agent Management Demo
 * Shows how profiles, abilities, and personalities work together
 */

import chalk from 'chalk';
import { getAgentManager } from '../../core/agent-manager.js';

async function demonstrateAgentManagement() {
    console.log(chalk.blue.bold('🤖 AutomatosX Unified Agent Management Demo\n'));

    const manager = await getAgentManager();

    // 1. Show system overview
    console.log(chalk.yellow.bold('1. SYSTEM OVERVIEW'));
    console.log(chalk.gray('   Integrated management of profiles, abilities, and personalities\n'));

    const agents = await manager.listAgents();
    const statusCounts = {
        complete: agents.filter(a => a.status === 'complete').length,
        ready: agents.filter(a => a.status === 'ready').length,
        partial: agents.filter(a => a.status === 'partial').length,
        missing: agents.filter(a => a.status === 'missing').length
    };

    console.log(chalk.green(`✅ Total Agents: ${agents.length}`));
    console.log(chalk.green(`   Complete: ${statusCounts.complete}`));
    console.log(chalk.blue(`   Ready: ${statusCounts.ready}`));
    console.log(chalk.yellow(`   Partial: ${statusCounts.partial}`));
    console.log(chalk.red(`   Missing: ${statusCounts.missing}`));

    // 2. Show detailed agent information
    console.log(chalk.yellow.bold('\n2. DETAILED AGENT INFORMATION'));
    console.log(chalk.gray('   Complete integration of all configuration layers\n'));

    const backendInfo = await manager.getAgentInfo('backend');

    console.log(chalk.cyan(`🤖 ${backendInfo.role.toUpperCase()} Agent:`));

    if (backendInfo.personality) {
        console.log(chalk.cyan('   Personality:'));
        console.log(`     Name: ${backendInfo.personality.name}`);
        console.log(`     Title: ${backendInfo.personality.title}`);
        console.log(`     Style: ${backendInfo.personality.personality}`);
    }

    if (backendInfo.profile) {
        console.log(chalk.cyan('   Profile:'));
        console.log(`     Workflow: ${backendInfo.profile.stages?.join(' → ') || 'N/A'}`);
        console.log(`     Description: ${backendInfo.profile.description.substring(0, 80)}...`);
    }

    console.log(chalk.cyan('   Abilities:'));
    backendInfo.abilities.forEach((ability, index) => {
        console.log(`     ${index + 1}. ${ability.filename} (${Math.round(ability.size / 1024)}KB)`);
    });

    // 3. Show search capabilities
    console.log(chalk.yellow.bold('\n3. SEARCH CAPABILITIES'));
    console.log(chalk.gray('   Find agents by skills and specializations\n'));

    console.log(chalk.cyan('🔍 Searching for "database design" expertise...'));
    const searchResults = await manager.searchAgents('database design', true);

    searchResults.slice(0, 3).forEach((result, index) => {
        console.log(chalk.green(`   ${index + 1}. ${result.role.toUpperCase()}`));
        console.log(chalk.gray(`      Relevance: ${Math.round(result.relevance * 100)}%`));
        console.log(chalk.gray(`      Matches: ${result.matches.join(', ')}`));
    });

    // 4. Show file organization
    console.log(chalk.yellow.bold('\n4. DIRECT FILE ACCESS'));
    console.log(chalk.gray('   Simple, direct editing of configuration files\n'));

    console.log(chalk.cyan('📁 File organization for backend agent:'));
    console.log(chalk.green('   Profile: src/agents/backend/profile.yaml'));
    console.log(chalk.green('   Abilities: src/agents/backend/abilities/*.md'));
    console.log(chalk.green('   Personality: src/agents/agent-profiles.js'));

    // 5. Show configuration validation
    console.log(chalk.yellow.bold('\n5. CONFIGURATION VALIDATION'));
    console.log(chalk.gray('   Ensure agent configurations are complete and valid\n'));

    const validation = await manager.validateAgent('backend');
    console.log(chalk.cyan(`🔍 Validating ${validation.role} agent...`));

    const statusColors = {
        complete: chalk.green,
        ready: chalk.blue,
        partial: chalk.yellow,
        missing: chalk.red
    };

    const statusColor = statusColors[validation.status];
    console.log(statusColor(`   Status: ${validation.status.toUpperCase()}`));

    if (validation.issues.length > 0) {
        console.log(chalk.red('   Issues:'));
        validation.issues.forEach(issue => {
            console.log(chalk.red(`     ❌ ${issue}`));
        });
    } else {
        console.log(chalk.green('   ✅ No issues found'));
    }

    if (validation.suggestions.length > 0) {
        console.log(chalk.yellow('   Suggestions:'));
        validation.suggestions.forEach(suggestion => {
            console.log(chalk.yellow(`     💡 ${suggestion}`));
        });
    }

    // 6. Show usage commands
    console.log(chalk.yellow.bold('\n6. QUICK USAGE COMMANDS'));
    console.log(chalk.gray('   Essential commands for day-to-day agent management\n'));

    const commands = [
        'List all agents: node -e "import(\'./src/commands/agent.js\').then(m => m.agentCommands.list())"',
        'Show agent details: node -e "import(\'./src/commands/agent.js\').then(m => m.agentCommands.show(\'backend\'))"',
        'Show file locations: node -e "import(\'./src/commands/agent.js\').then(m => m.agentCommands.files(\'backend\'))"',
        'Search agents: node -e "import(\'./src/commands/agent.js\').then(m => m.agentCommands.search(\'API design\'))"',
        'Validate config: node -e "import(\'./src/commands/agent.js\').then(m => m.agentCommands.validate())"'
    ];

    commands.forEach((cmd, index) => {
        console.log(chalk.cyan(`   ${index + 1}. ${cmd.split(':')[0]}:`));
        console.log(chalk.gray(`      ${cmd.split(':')[1]}`));
    });

    console.log(chalk.blue.bold('\n🎯 Key Benefits:'));
    console.log(chalk.yellow('   • Unified management of all agent configurations'));
    console.log(chalk.yellow('   • Simple, direct file editing - no complex workflows'));
    console.log(chalk.yellow('   • Clear separation: profiles, abilities, personalities'));
    console.log(chalk.yellow('   • Comprehensive search and validation tools'));
    console.log(chalk.yellow('   • Changes take effect immediately'));

    console.log(chalk.green('\n✅ Agent management system demonstration complete!'));
    console.log(chalk.gray('   Use the commands above to start managing your agents.'));
}

// Run the demonstration
demonstrateAgentManagement().catch(console.error);
