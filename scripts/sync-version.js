#!/usr/bin/env node
/**
 * Version Sync Script
 *
 * Keeps version.json and package.json in sync.
 * Run this script when bumping version:
 *
 * Usage:
 *   node scripts/sync-version.js <version>
 *   node scripts/sync-version.js 5.0.6
 *
 * Or use npm version commands which will auto-trigger this via hook.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Read current files
const versionPath = join(rootDir, 'version.json');
const packagePath = join(rootDir, 'package.json');

const versionData = JSON.parse(readFileSync(versionPath, 'utf8'));
const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));

// Get version from command line or use package.json (npm version already updated it)
const newVersion = process.argv[2] || packageData.version;

console.log(`\n📦 Syncing version to: ${newVersion}\n`);

// Update version.json
versionData.version = newVersion;
versionData.releaseDate = new Date().toISOString().split('T')[0];
writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');
console.log(`✅ Updated version.json`);

// Update package.json
packageData.version = newVersion;
writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
console.log(`✅ Updated package.json`);

console.log(`\n✨ Version synced successfully: ${newVersion}\n`);
