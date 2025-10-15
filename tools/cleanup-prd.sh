#!/bin/bash

###############################################################################
# PRD/ Directory Cleanup Script
#
# Archives completed v4.0 Phase 0 planning documents
#
# Usage:
#   ./tools/cleanup-prd.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PRD_DIR="$PROJECT_ROOT/PRD"
WORKSPACE_PRD="$PROJECT_ROOT/automatosx/PRD"
# Generate dynamic archive directory based on current date
ARCHIVE_DATE=$(date +%Y-%m)
ARCHIVE_DIR="$PRD_DIR/archive-$ARCHIVE_DATE"
V4_ARCHIVE="$ARCHIVE_DIR/v4.0-revamp"
FUTURE_PLANS="$ARCHIVE_DIR/future-plans"

cd "$PROJECT_ROOT"

echo "📁 Creating archive directories..."
mkdir -p "$V4_ARCHIVE"
mkdir -p "$FUTURE_PLANS"

echo ""
echo "📊 PRD/ Directory Status:"
TOTAL_PRD=$(find "$PRD_DIR" -maxdepth 1 -type f | wc -l | tr -d ' ')
echo "Files before: $TOTAL_PRD"

echo ""
echo "🗑️  Moving v4.0 PRD documents to archive..."

# Move all files except CLEANUP-PLAN.md
find "$PRD_DIR" -maxdepth 1 -type f \
  ! -name "CLEANUP-PLAN.md" \
  ! -name "CLEANUP-COMPLETE-REPORT.md" \
  -exec mv {} "$V4_ARCHIVE/" \;

echo ""
echo "📝 Creating new README.md..."

cat > "$PRD_DIR/README.md" << 'EOFREADME'
# Product Requirements Documentation

## Current Status

**Version**: v5.2.2
**Date**: 2025-10-14

This directory contains Product Requirements Documentation (PRD) for AutomatosX.

## Active Documents

Currently no active PRD documents. All planning is done in:
- Issue tracking: GitHub Issues
- Development plans: `tmp/` directory (temporary)
- Architecture decisions: `docs/` directory

## Archived Documents

Historical PRD documents have been archived:

### v4.0 Revamp (Phase 0-4)
- **Location**: `archive-$ARCHIVE_DATE/v4.0-revamp/`
- **Period**: 2025-03 to 2025-10
- **Status**: ✅ Completed (all phases finished, v5.2.2 released)
- **Contents**: 39 planning documents including:
  - Executive summaries and project analysis
  - Technical specifications and implementation plans
  - Security, testing, and release strategies
  - Phase kickoff and completion reports

### Future Plans
- **Location**: `archive-$ARCHIVE_DATE/future-plans/`
- **Status**: Deferred/Cancelled features

## Project Documentation

For current project information, see:
- **User Documentation**: `README.md` (project root)
- **Developer Guide**: `CLAUDE.md` (project root)
- **API Documentation**: `docs/` directory
- **Change Log**: `CHANGELOG.md` (project root)

## Notes

- This directory is excluded from git (`.gitignore`)
- PRD documents are for internal planning only
- For feature requests, use GitHub Issues
EOFREADME

echo ""
echo "📦 Checking automatosx/PRD/ (CLARITY-CORE documents)..."
if [ -d "$WORKSPACE_PRD" ] && [ "$(ls -A "$WORKSPACE_PRD" 2>/dev/null)" ]; then
  CLARITY_COUNT=$(find "$WORKSPACE_PRD" -type f | wc -l | tr -d ' ')
  echo "Found $CLARITY_COUNT CLARITY-CORE documents"
  echo "Moving to future-plans archive..."
  find "$WORKSPACE_PRD" -type f -exec mv {} "$FUTURE_PLANS/" \;
  echo "✅ CLARITY-CORE documents archived"
else
  echo "✅ automatosx/PRD/ already clean"
fi

# Count results
ARCHIVED=$(find "$ARCHIVE_DIR" -type f | wc -l | tr -d ' ')
REMAINING=$(find "$PRD_DIR" -maxdepth 1 -type f | wc -l | tr -d ' ')

echo ""
echo "✅ Cleanup complete!"
echo "Files remaining in PRD/: $REMAINING"
echo "Files archived: $ARCHIVED"
echo ""
echo "📂 Remaining files:"
ls -1 "$PRD_DIR" | grep -v "^archive-$ARCHIVE_DATE$" || echo "(none)"

echo ""
echo "📁 Archive structure:"
echo "PRD/archive-$ARCHIVE_DATE/"
echo "├── v4.0-revamp/        ($ARCHIVED files)"
echo "└── future-plans/       (CLARITY-CORE documents)"
