#!/usr/bin/env node

import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

async function validateArchitecture() {
    console.log('🔍 Architecture Alignment Validation\n');

    try {
        // Get all roles from each layer
        const agentsDir = join(projectRoot, 'src/agents');
        const userAgentsDir = join(projectRoot, '.defai/agents');
        const abilitiesRoot = agentsDir;

        const profileRoles = await collectRoles([userAgentsDir, agentsDir]);

        const agentEntries = await readdir(agentsDir);
        const agentRoles = [];
        for (const entry of agentEntries) {
            if (entry.startsWith('_') || entry.endsWith('.js')) continue;
            const entryPath = join(agentsDir, entry);
            try {
                const entryStats = await stat(entryPath);
                if (entryStats.isDirectory() && entry !== 'global') {
                    agentRoles.push(entry);
                }
            } catch (error) {
                // ignore
            }
        }
        agentRoles.sort();

        const abilityEntries = await readdir(abilitiesRoot);
        const abilityRoles = [];
        for (const entry of abilityEntries) {
            if (entry.startsWith('_') || entry.endsWith('.js')) continue;
            const entryPath = join(abilitiesRoot, entry);
            try {
                const entryStats = await stat(entryPath);
                if (!entryStats.isDirectory()) continue;
                const abilitiesPath = join(entryPath, 'abilities');
                const abilitiesStats = await stat(abilitiesPath);
                if (abilitiesStats.isDirectory()) {
                    if (entry !== 'global') {
                        abilityRoles.push(entry);
                    }
                }
            } catch (error) {
                // Ignore missing abilities directories
            }
        }
        abilityRoles.sort();

        // Expected roles mirror profile roles for alignment
        const expectedRoles = profileRoles;

        // Validation results
        console.log('📊 Layer Comparison:');
        console.log(`Expected Roles (15): ${expectedRoles.join(', ')}`);
        console.log(`Profiles Layer (${profileRoles.length}): ${profileRoles.join(', ')}`);
        console.log(`Agents Layer (${agentRoles.length}): ${agentRoles.join(', ')}`);
        console.log(`Abilities Layer (${abilityRoles.length}): ${abilityRoles.join(', ')}\n`);

        // Check alignment
        const profilesMatch = JSON.stringify(profileRoles) === JSON.stringify(expectedRoles);
        const agentsMatch = JSON.stringify(agentRoles) === JSON.stringify(expectedRoles);
        const abilitiesMatch = JSON.stringify(abilityRoles) === JSON.stringify(expectedRoles);

        console.log('✅ Alignment Status:');
        console.log(`Profiles Layer: ${profilesMatch ? '✅ ALIGNED' : '❌ MISALIGNED'}`);
        console.log(`Agents Layer: ${agentsMatch ? '✅ ALIGNED' : '❌ MISALIGNED'}`);
        console.log(`Abilities Layer: ${abilitiesMatch ? '✅ ALIGNED' : '❌ MISALIGNED'}`);

        const fullAlignment = profilesMatch && agentsMatch && abilitiesMatch;
        console.log(`\n🎯 Overall Architecture: ${fullAlignment ? '✅ FULLY ALIGNED' : '❌ NEEDS ATTENTION'}`);

        // Detailed misalignments
        if (!fullAlignment) {
            console.log('\n🔧 Misalignment Details:');

            if (!profilesMatch) {
                const missing = expectedRoles.filter(role => !profileRoles.includes(role));
                const extra = profileRoles.filter(role => !expectedRoles.includes(role));
                if (missing.length) console.log(`Profiles Missing: ${missing.join(', ')}`);
                if (extra.length) console.log(`Profiles Extra: ${extra.join(', ')}`);
            }

            if (!agentsMatch) {
                const missing = expectedRoles.filter(role => !agentRoles.includes(role));
                const extra = agentRoles.filter(role => !expectedRoles.includes(role));
                if (missing.length) console.log(`Agents Missing: ${missing.join(', ')}`);
                if (extra.length) console.log(`Agents Extra: ${extra.join(', ')}`);
            }

            if (!abilitiesMatch) {
                const missing = expectedRoles.filter(role => !abilityRoles.includes(role));
                const extra = abilityRoles.filter(role => !expectedRoles.includes(role));
                if (missing.length) console.log(`Abilities Missing: ${missing.join(', ')}`);
                if (extra.length) console.log(`Abilities Extra: ${extra.join(', ')}`);
            }
        }

        return fullAlignment;

    } catch (error) {
        console.error('❌ Validation Error:', error.message);
        return false;
    }
}

async function collectRoles(rootPaths) {
    const roles = new Set();

    for (const rootPath of rootPaths) {
        try {
            const entries = await readdir(rootPath);
            for (const entry of entries) {
                if (entry.startsWith('_') || entry.endsWith('.js')) continue;
                const entryPath = join(rootPath, entry);
                try {
                    const stats = await stat(entryPath);
                    if (!stats.isDirectory()) continue;
                    const profilePath = join(entryPath, 'profile.yaml');
                    try {
                        const profileStats = await stat(profilePath);
                        if (profileStats.isFile()) {
                            roles.add(entry);
                        }
                    } catch (error) {
                        // ignore missing profile
                    }
                } catch (error) {
                    // ignore inaccessible entries
                }
            }
        } catch (error) {
            // ignore missing roots
        }
    }

    return Array.from(roles).filter(role => role !== 'global').sort();
}

// Run validation
validateArchitecture().then(success => {
    process.exit(success ? 0 : 1);
});
