#!/usr/bin/env node

/**
 * Fix Model Configuration Script
 * Adds stage-specific model configurations to all agent profiles
 * Fixes the 239 model configuration warnings
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import { glob } from 'glob';

const DEFAULT_MODELS = {
    primary: {
        provider: 'claude-code',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.2,
        max_tokens: 4096
    },
    fallback: {
        provider: 'claude-code',
        model: 'claude-3-5-haiku-20241022',
        temperature: 0.3,
        max_tokens: 3072
    }
};

async function fixProfileModels() {
    console.log('🔧 Starting model configuration fix...');

    try {
        // Find all profile files
        const profileFiles = await glob('src/agents/*/profile.yaml');
        console.log(`📂 Found ${profileFiles.length} profile files`);

        let totalStagesFixed = 0;

        for (const profileFile of profileFiles) {
            console.log(`\n📝 Processing ${profileFile}...`);

            const content = await fs.readFile(profileFile, 'utf8');
            const profile = yaml.parse(content);

            if (!profile.stages) {
                console.log(`   ⚠️  No stages found in ${profileFile}, skipping`);
                continue;
            }

            // Ensure models section exists
            if (!profile.models) {
                profile.models = { ...DEFAULT_MODELS };
            }

            // Add stage-specific model configurations
            let stagesFixed = 0;
            profile.stages.forEach(stage => {
                // Add primary model for stage
                if (!profile.models[stage]) {
                    profile.models[stage] = {
                        provider: 'claude-code',
                        model: 'claude-3-5-sonnet-20241022',
                        temperature: 0.2,
                        max_tokens: 4096
                    };
                    stagesFixed++;
                }

                // Add fallback model for stage
                const fallbackKey = `${stage}_fallback`;
                if (!profile.models[fallbackKey]) {
                    profile.models[fallbackKey] = {
                        provider: 'claude-code',
                        model: 'claude-3-5-haiku-20241022',
                        temperature: 0.3,
                        max_tokens: 3072
                    };
                    stagesFixed++;
                }
            });

            if (stagesFixed > 0) {
                // Write back the updated profile
                const updatedYaml = yaml.stringify(profile, {
                    lineWidth: 0,
                    indent: 2
                });

                await fs.writeFile(profileFile, updatedYaml);
                console.log(`   ✅ Fixed ${stagesFixed} model configurations in ${path.basename(profileFile)}`);
                totalStagesFixed += stagesFixed;
            } else {
                console.log(`   ℹ️  ${path.basename(profileFile)} already has complete model configurations`);
            }
        }

        console.log(`\n🎉 Successfully fixed ${totalStagesFixed} model configurations across ${profileFiles.length} profiles`);
        console.log('🔍 Running validation to verify fixes...');

        // Run validation to check results
        const { spawn } = await import('child_process');
        const validation = spawn('npm', ['run', 'validate'], { stdio: 'pipe' });

        let validationOutput = '';
        validation.stdout.on('data', (data) => {
            validationOutput += data.toString();
        });

        validation.stderr.on('data', (data) => {
            validationOutput += data.toString();
        });

        validation.on('close', (code) => {
            const warnings = (validationOutput.match(/Warning:/g) || []).length;
            console.log(`\n📊 Validation Results:`);
            console.log(`   Warnings: ${warnings} (reduced from 239)`);
            if (warnings === 0) {
                console.log('   🎉 All model configuration warnings resolved!');
            } else {
                console.log(`   ⚠️  ${warnings} warnings remaining`);
            }
        });

    } catch (error) {
        console.error('❌ Error fixing model configurations:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixProfileModels();
