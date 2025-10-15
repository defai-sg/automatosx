# Version Synchronization Tool Guide

**Created**: 2025-10-14
**Version**: v1.0
**Purpose**: Automate version updates across all project files

---

## 📦 Overview

The `sync-all-versions.js` tool synchronizes version numbers across the entire AutomatosX project, ensuring consistency before GitHub releases and npm publishing.

### What It Updates

✅ **Automatically Updated Files**:
1. `package.json` - Main version field
2. `version.json` - Version and release date
3. `README.md` - Status line (e.g., "v5.2.2 · October 2025")
4. `CLAUDE.md` - Version header and Critical Development Notes header

⚠️ **Manual Updates Required**:
1. `CHANGELOG.md` - Release notes (content-specific)
2. Test count badges - Requires running tests first

---

## 🚀 Usage

### Basic Usage

```bash
# Use current package.json version
npm run sync:all-versions

# Or specify version explicitly
node tools/sync-all-versions.js 5.2.3
```

### Before Publishing to npm

```bash
# Complete pre-release workflow
npm run prerelease

# This runs:
# 1. npm run sync:all-versions  ← Syncs all version numbers
# 2. npm run typecheck          ← TypeScript validation
# 3. npm run test:all           ← Run all 1,538 tests
```

### When Bumping Versions

```bash
# Automatic version bump with sync
npm run version:patch   # 5.2.2 → 5.2.3
npm run version:minor   # 5.2.2 → 5.3.0
npm run version:major   # 5.2.2 → 6.0.0

# Then sync documentation
npm run sync:all-versions
```

---

## 📋 Complete Release Workflow

### Step-by-Step Process

```bash
# 1. Bump version (creates commit + tag)
npm run version:patch   # or minor/major

# 2. Sync all version references
npm run sync:all-versions

# 3. Review changes
git diff

# 4. Update CHANGELOG.md (manual)
# Add release notes for the new version

# 5. Update test count badges (manual)
npm run test:all
# Note the test count (e.g., "1538 tests")
# Update README.md line 10: [![Tests](https://img.shields.io/badge/tests-1,538%20passing-brightgreen.svg)](#)
# Update README.md line 581: ✅ **1,538 tests passing** (100% pass rate)
# Update README.md line 593: Test Coverage: ~56% (1,538 tests passing, 100% pass rate)
# Update CLAUDE.md line 11: **Quality**: 1,538 tests (100% pass), 0 TypeScript errors, ~56% coverage
# Update CLAUDE.md line 173: npm run test:all           # All test suites (1,538 tests passing)
# Update CLAUDE.md line 587: - **Total**: 1,538 tests passing (100% pass rate as of 2025-10-14)

# 6. Commit all changes
git add .
git commit -m "chore: prepare release v5.2.3"

# 7. Push with tags
git push && git push --tags

# 8. Publish to npm
npm publish
```

---

## 🎯 Files Updated by Tool

### version.json
```json
{
  "version": "5.2.3",
  "releaseDate": "2025-10-14",
  "codename": "...",
  "phase": "..."
}
```

### package.json
```json
{
  "version": "5.2.3"
}
```

### README.md
```markdown
**Status**: ✅ Production Ready · v5.2.3 · October 2025
```

### CLAUDE.md
```markdown
**Current Version**: v5.2.3 (October 2025)

## Critical Development Notes (v5.2.3)
```

---

## 🔍 Verification Checklist

After running the tool, verify these changes:

```bash
# 1. Check git diff
git diff

# You should see changes in:
#   M package.json
#   M version.json
#   M README.md
#   M CLAUDE.md

# 2. Verify version consistency
grep -r "5.2.3" package.json version.json README.md CLAUDE.md

# 3. Check CHANGELOG.md has entry
grep "## \[5.2.3\]" CHANGELOG.md
# If not found, add release notes manually

# 4. Run tests
npm run test:all
# Verify all tests pass

# 5. Check TypeScript
npm run typecheck
# Should show 0 errors
```

---

## ❌ Known Limitations

### Manual Updates Required

1. **CHANGELOG.md**
   - Tool checks if version exists but doesn't create entries
   - You must manually write release notes

2. **Test Count Badges**
   - Tool doesn't run tests or update test counts
   - Update manually after `npm run test:all`
   - Files to update:
     - `README.md` (lines 10, 581, 593)
     - `CLAUDE.md` (lines 11, 173, 587)

3. **Coverage Percentage**
   - Tool doesn't calculate coverage
   - Update manually after `npm run test:coverage`

---

## 🛠️ Tool Configuration

### npm Scripts

```json
{
  "scripts": {
    "sync:version": "node tools/sync-version.js",
    "sync:all-versions": "node tools/sync-all-versions.js",
    "prerelease": "npm run sync:all-versions && npm run typecheck && npm run test:all"
  }
}
```

### Git Hooks (Optional)

You can add a pre-push hook to ensure version sync:

```bash
# .git/hooks/pre-push
#!/bin/bash

echo "🔍 Checking version consistency..."
npm run sync:all-versions --dry-run

if [ $? -ne 0 ]; then
  echo "❌ Version sync check failed"
  exit 1
fi

echo "✅ Version consistency verified"
```

---

## 📊 Version Update Locations

### Primary Sources (Automated)
- [x] package.json (line 3)
- [x] version.json (line 2)
- [x] README.md (line 12)
- [x] CLAUDE.md (lines 10, 46)

### Secondary References (Manual)
- [ ] CHANGELOG.md (release notes)
- [ ] README.md test badges (lines 10, 581, 593)
- [ ] CLAUDE.md test counts (lines 11, 173, 587)
- [ ] docs/reference/cli-commands.md (version examples)
- [ ] TROUBLESHOOTING.md (version-specific troubleshooting)

---

## 🔄 Tool Evolution

### Current Version (v2.0)
- ✅ Sync package.json, version.json
- ✅ Update README.md status line
- ✅ Update CLAUDE.md version headers
- ✅ Check CHANGELOG.md has entry
- ✅ Colorful console output
- ✅ Clear next steps guidance
- ✅ **NEW**: Automatically run tests and update test counts
- ✅ **NEW**: Update README.md test badges automatically

### Future Enhancements (v3.0)
- [ ] Calculate coverage percentage and update badges
- [ ] Interactive mode for CHANGELOG.md entries
- [ ] Dry-run mode for verification
- [ ] Automatic git commit after sync
- [ ] GitHub release notes generation

---

## 💡 Best Practices

### When to Run

1. **Before npm publish** - Always
2. **After version bump** - Recommended
3. **Before git push --tags** - Recommended
4. **After major refactoring** - Optional

### Version Numbering Strategy

- **Patch (x.x.1)**: Bug fixes, documentation updates
- **Minor (x.1.0)**: New features, backward compatible
- **Major (1.0.0)**: Breaking changes, major refactoring

### Commit Messages

```bash
# After version bump
git commit -m "chore: bump version to 5.2.3"

# After version sync
git commit -m "chore: sync version to 5.2.3"

# Combined (recommended)
git commit -m "chore: prepare release v5.2.3"
```

---

## 🐛 Troubleshooting

### "Could not find status line pattern in README.md"

**Cause**: README.md status line format changed
**Fix**: Update regex in `tools/sync-all-versions.js` line ~87

### "Could not find version patterns in CLAUDE.md"

**Cause**: CLAUDE.md header format changed
**Fix**: Update regex patterns in `tools/sync-all-versions.js` lines ~114-120

### "CHANGELOG.md does not have entry"

**Expected**: Tool only checks, doesn't create entries
**Action**: Manually add release notes to CHANGELOG.md

### Test counts are outdated

**Expected**: Tool doesn't update test counts
**Action**:
1. Run `npm run test:all`
2. Note the test count
3. Manually update badges in README.md and CLAUDE.md

---

## 📝 Example Output

```
📦 AutomatosX Version Sync Tool

Target Version: v5.2.3
Release Date: 2025-10-14 (October 2025)

✓ Updated version.json
✓ Updated package.json
✓ Updated README.md status line
✓ Updated CLAUDE.md version references

⚠ CHANGELOG.md does not have entry for v5.2.3
  → Please add release notes to CHANGELOG.md

✨ Version sync completed successfully!

Files updated:
  • package.json → 5.2.3
  • version.json → 5.2.3 (2025-10-14)
  • README.md → v5.2.3 · October 2025
  • CLAUDE.md → v5.2.3 (October 2025)

Next steps:
  1. Review changes: git diff
  2. Update CHANGELOG.md with release notes (if needed)
  3. Run tests: npm test
  4. Commit: git add . && git commit -m "chore: bump version to 5.2.3"
  5. Tag: git tag v5.2.3
  6. Push: git push && git push --tags
```

---

## 🎉 Success Criteria

After running the tool and following next steps:

✅ All tests passing (1,538/1,538)
✅ TypeScript check passing (0 errors)
✅ Version consistent across all files
✅ CHANGELOG.md has release notes
✅ Test count badges updated
✅ Git commit created with clear message
✅ Git tag created (e.g., v5.2.3)
✅ Ready to publish to npm

---

**Tool Location**: `tools/sync-all-versions.js`
**npm Script**: `npm run sync:all-versions`
**Pre-release Script**: `npm run prerelease`
