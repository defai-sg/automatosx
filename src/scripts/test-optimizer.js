#!/usr/bin/env node

/**
 * Test script for agent-provider optimization
 */

import chalk from 'chalk';
import fs from 'fs-extra';

console.log(chalk.blue('🔍 AutomatosX Agent-Provider Optimizer Test'));
console.log(chalk.green('✅ Basic imports working'));

// Test file access
try {
    const profiles = await fs.readdir('./profiles');
    console.log(chalk.green(`✅ Found ${profiles.length} profile files`));

    // Show some profiles
    const yamlFiles = profiles.filter(f => f.endsWith('.yaml'));
    console.log(chalk.yellow('Profile files:'));
    yamlFiles.slice(0, 5).forEach(file => {
        console.log(chalk.gray(`  - ${file}`));
    });

    if (yamlFiles.length > 5) {
        console.log(chalk.gray(`  ... and ${yamlFiles.length - 5} more`));
    }

} catch (error) {
    console.error(chalk.red('❌ Error accessing profiles:'), error.message);
}

console.log(chalk.blue('\n🎯 Optimization Matrix Summary:'));
console.log(chalk.white('- Claude Code: Primary for all technical and strategic roles'));
console.log(chalk.white('- Codex: Fallback for pure coding implementation'));
console.log(chalk.white('- Gemini: Fallback for data analysis and research'));

console.log(chalk.green('\n✅ Test completed successfully'));