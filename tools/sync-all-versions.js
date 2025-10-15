#!/usr/bin/env node
/**
 * Comprehensive Version Sync Script
 *
 * Syncs version numbers across all project files:
 * - package.json, version.json
 * - README.md (status line)
 * - CLAUDE.md (version header and notes)
 *
 * Usage:
 *   npm run sync:all-versions              # Use package.json version
 *   node tools/sync-all-versions.js 5.2.3  # Specify version
 *
 * Run this before:
 *   - Creating GitHub releases
 *   - Publishing to npm
 *   - Major version bumps
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Get month name from date
 */
function getMonthYear(date) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Update version.json
 */
function updateVersionJson(version, releaseDate) {
  const versionPath = join(rootDir, 'version.json');
  const versionData = JSON.parse(readFileSync(versionPath, 'utf8'));

  versionData.version = version;
  versionData.releaseDate = releaseDate;

  writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n');
  console.log(`${colors.green}✓${colors.reset} Updated version.json`);
}

/**
 * Update package.json
 */
function updatePackageJson(version) {
  const packagePath = join(rootDir, 'package.json');
  const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));

  packageData.version = version;

  writeFileSync(packagePath, JSON.stringify(packageData, null, 2) + '\n');
  console.log(`${colors.green}✓${colors.reset} Updated package.json`);
}

/**
 * Update README.md status line
 */
function updateReadme(version, monthYear) {
  const readmePath = join(rootDir, 'README.md');
  let content = readFileSync(readmePath, 'utf8');

  // Update status line (e.g., **Status**: ✅ Production Ready · v5.2.0 · October 2025)
  const statusPattern = /\*\*Status\*\*: ✅ Production Ready · v\d+\.\d+\.\d+ · \w+ \d{4}/;
  const newStatus = `**Status**: ✅ Production Ready · v${version} · ${monthYear}`;

  if (statusPattern.test(content)) {
    content = content.replace(statusPattern, newStatus);
    writeFileSync(readmePath, content);
    console.log(`${colors.green}✓${colors.reset} Updated README.md status line`);
  } else {
    console.log(`${colors.yellow}⚠${colors.reset} Could not find status line pattern in README.md`);
  }
}

/**
 * Update CLAUDE.md version references
 */
function updateClaudeMd(version, monthYear) {
  const claudePath = join(rootDir, 'CLAUDE.md');
  let content = readFileSync(claudePath, 'utf8');
  let updated = false;

  // Update **Current Version**: v5.2.2 (October 2025)
  const versionPattern = /\*\*Current Version\*\*: v\d+\.\d+\.\d+ \(\w+ \d{4}\)/;
  if (versionPattern.test(content)) {
    content = content.replace(
      versionPattern,
      `**Current Version**: v${version} (${monthYear})`
    );
    updated = true;
  }

  // Update ## Critical Development Notes (v5.2.2)
  const notesPattern = /## Critical Development Notes \(v\d+\.\d+\.\d+\)/;
  if (notesPattern.test(content)) {
    content = content.replace(
      notesPattern,
      `## Critical Development Notes (v${version})`
    );
    updated = true;
  }

  if (updated) {
    writeFileSync(claudePath, content);
    console.log(`${colors.green}✓${colors.reset} Updated CLAUDE.md version references`);
  } else {
    console.log(`${colors.yellow}⚠${colors.reset} Could not find version patterns in CLAUDE.md`);
  }
}

/**
 * Check if CHANGELOG.md needs update
 */
function checkChangelog(version) {
  const changelogPath = join(rootDir, 'CHANGELOG.md');
  const content = readFileSync(changelogPath, 'utf8');

  // Check if this version exists in CHANGELOG
  const versionHeader = `## [${version}]`;
  if (!content.includes(versionHeader)) {
    console.log(`${colors.yellow}⚠${colors.reset} CHANGELOG.md does not have entry for v${version}`);
    console.log(`  ${colors.cyan}→${colors.reset} Please add release notes to CHANGELOG.md`);
  } else {
    console.log(`${colors.green}✓${colors.reset} CHANGELOG.md has entry for v${version}`);
  }
}

/**
 * Get test count from npm test output
 */
function getTestCount() {
  try {
    console.log(`${colors.cyan}Running tests to get count...${colors.reset}`);
    const output = execSync('npm run test:all 2>&1', {
      cwd: rootDir,
      encoding: 'utf8',
      timeout: 300000 // 5 minutes timeout
    });

    // Parse output for test count: "Tests  1845 passed | 7 skipped (1852)"
    const testMatch = output.match(/Tests\s+(\d+)\s+passed/);
    if (testMatch) {
      const testCount = parseInt(testMatch[1], 10);
      console.log(`${colors.green}✓${colors.reset} Found ${testCount} passing tests`);
      return testCount;
    }

    console.log(`${colors.yellow}⚠${colors.reset} Could not parse test count from output`);
    return null;
  } catch (error) {
    console.log(`${colors.yellow}⚠${colors.reset} Could not run tests: ${error.message}`);
    return null;
  }
}

/**
 * Update test counts in README.md
 */
function updateTestCounts(testCount) {
  if (!testCount) {
    console.log(`${colors.yellow}⚠${colors.reset} Skipping test count update (no count available)`);
    return;
  }

  const readmePath = join(rootDir, 'README.md');
  let content = readFileSync(readmePath, 'utf8');
  let updated = false;

  // Format test count with comma (e.g., 1845 -> 1,845)
  const formattedCount = testCount.toLocaleString('en-US');

  // Update badge: [![Tests](https://img.shields.io/badge/tests-1,845%20passing-brightgreen.svg)](#)
  const badgePattern = /\[!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/tests-[\d,]+%20passing-brightgreen\.svg\)\]/;
  if (badgePattern.test(content)) {
    content = content.replace(
      badgePattern,
      `[![Tests](https://img.shields.io/badge/tests-${formattedCount}%20passing-brightgreen.svg)]`
    );
    updated = true;
  }

  // Update "X tests passing" references
  const testPassingPattern = /✅ \*\*[\d,]+ tests passing\*\*/g;
  if (testPassingPattern.test(content)) {
    content = content.replace(
      testPassingPattern,
      `✅ **${formattedCount} tests passing**`
    );
    updated = true;
  }

  // Update "Test Coverage: ~56% (X tests passing, 100% pass rate)"
  const coveragePattern = /Test Coverage: ~\d+% \([\d,]+ tests passing, 100% pass rate\)/g;
  if (coveragePattern.test(content)) {
    content = content.replace(
      coveragePattern,
      `Test Coverage: ~56% (${formattedCount} tests passing, 100% pass rate)`
    );
    updated = true;
  }

  if (updated) {
    writeFileSync(readmePath, content);
    console.log(`${colors.green}✓${colors.reset} Updated test counts in README.md (${formattedCount} tests)`);
  } else {
    console.log(`${colors.yellow}⚠${colors.reset} Could not find test count patterns in README.md`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log(`\n${colors.blue}📦 AutomatosX Version Sync Tool${colors.reset}\n`);

  // Read current package.json
  const packagePath = join(rootDir, 'package.json');
  const packageData = JSON.parse(readFileSync(packagePath, 'utf8'));

  // Get version from command line or use package.json
  const newVersion = process.argv[2] || packageData.version;
  const releaseDate = new Date().toISOString().split('T')[0];
  const monthYear = getMonthYear(new Date());

  console.log(`${colors.cyan}Target Version:${colors.reset} v${newVersion}`);
  console.log(`${colors.cyan}Release Date:${colors.reset} ${releaseDate} (${monthYear})`);
  console.log();

  try {
    // Update all files
    updateVersionJson(newVersion, releaseDate);
    updatePackageJson(newVersion);
    updateReadme(newVersion, monthYear);
    updateClaudeMd(newVersion, monthYear);

    console.log();

    // Update test counts (optional - skip if tests fail)
    const testCount = getTestCount();
    if (testCount) {
      updateTestCounts(testCount);
      console.log();
    }

    // Check CHANGELOG
    checkChangelog(newVersion);

    console.log();
    console.log(`${colors.green}✨ Version sync completed successfully!${colors.reset}\n`);

    // Summary
    console.log(`${colors.cyan}Files updated:${colors.reset}`);
    console.log(`  • package.json → ${newVersion}`);
    console.log(`  • version.json → ${newVersion} (${releaseDate})`);
    console.log(`  • README.md → v${newVersion} · ${monthYear}`);
    console.log(`  • CLAUDE.md → v${newVersion} (${monthYear})`);
    if (testCount) {
      console.log(`  • README.md test counts → ${testCount.toLocaleString('en-US')} tests`);
    }
    console.log();

    // Next steps
    console.log(`${colors.cyan}Next steps:${colors.reset}`);
    console.log(`  1. Review changes: ${colors.yellow}git diff${colors.reset}`);
    console.log(`  2. Update CHANGELOG.md with release notes (if needed)`);
    console.log(`  3. Run tests: ${colors.yellow}npm test${colors.reset}`);
    console.log(`  4. Commit: ${colors.yellow}git add . && git commit -m "chore: bump version to ${newVersion}"${colors.reset}`);
    console.log(`  5. Tag: ${colors.yellow}git tag v${newVersion}${colors.reset}`);
    console.log(`  6. Push: ${colors.yellow}git push && git push --tags${colors.reset}`);
    console.log();

  } catch (error) {
    console.error(`${colors.yellow}✗${colors.reset} Error syncing versions:`, error.message);
    process.exit(1);
  }
}

main();
