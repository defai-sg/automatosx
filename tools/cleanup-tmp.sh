#!/bin/bash

###############################################################################
# tmp/ Directory Cleanup Script
#
# Moves completed task files to archive, keeping only essential final reports
#
# Usage:
#   ./tools/cleanup-tmp.sh
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMP_DIR="$PROJECT_ROOT/tmp"
# Generate dynamic archive directory based on current date
ARCHIVE_DATE=$(date +%Y-%m)
ARCHIVE_DIR="$TMP_DIR/archive-$ARCHIVE_DATE"

cd "$PROJECT_ROOT"

echo "📁 Creating archive directory..."
mkdir -p "$ARCHIVE_DIR"

echo ""
echo "📋 Files to keep:"
cat << 'EOF'
AUTOMATOSX-IMPROVEMENT-PLAN.md
V5.2.0-RELEASE-GUIDE.md
V5.2.0-GITHUB-RELEASE-NOTES.md
V5.2.0-FINAL-COMPLETION-REPORT.md
test-fix-v5.2.2-final-report.md
test-fix-final-report.md
MCP-MIGRATION-PRD.md
WORKSPACE-REWORK-PLAN.md
BUG-FIXES-2025-10-13.md
CODE-QUALITY-FIX-FINAL-REPORT.md
CLEANUP-PLAN.md
EOF

echo ""
echo "🗑️  Moving files to archive..."

# Count files before
TOTAL_BEFORE=$(find "$TMP_DIR" -maxdepth 1 -type f | wc -l | tr -d ' ')
echo "Files before: $TOTAL_BEFORE"

# Move all non-essential files
find "$TMP_DIR" -maxdepth 1 -type f \
  ! -name "AUTOMATOSX-IMPROVEMENT-PLAN.md" \
  ! -name "V5.2.0-RELEASE-GUIDE.md" \
  ! -name "V5.2.0-GITHUB-RELEASE-NOTES.md" \
  ! -name "V5.2.0-FINAL-COMPLETION-REPORT.md" \
  ! -name "test-fix-v5.2.2-final-report.md" \
  ! -name "test-fix-final-report.md" \
  ! -name "MCP-MIGRATION-PRD.md" \
  ! -name "WORKSPACE-REWORK-PLAN.md" \
  ! -name "BUG-FIXES-2025-10-13.md" \
  ! -name "CODE-QUALITY-FIX-FINAL-REPORT.md" \
  ! -name "CLEANUP-PLAN.md" \
  -exec mv {} "$ARCHIVE_DIR/" \;

# Move phase0-prototypes if exists
if [ -d "$TMP_DIR/phase0-prototypes" ]; then
  mv "$TMP_DIR/phase0-prototypes" "$ARCHIVE_DIR/"
fi

# Count files after
TOTAL_AFTER=$(find "$TMP_DIR" -maxdepth 1 -type f | wc -l | tr -d ' ')
ARCHIVED=$(find "$ARCHIVE_DIR" -type f | wc -l | tr -d ' ')

echo ""
echo "✅ Cleanup complete!"
echo "Files remaining: $TOTAL_AFTER"
echo "Files archived: $ARCHIVED"
echo ""
echo "📂 Remaining files:"
ls -1 "$TMP_DIR" | grep -v "^archive-$ARCHIVE_DATE$"
