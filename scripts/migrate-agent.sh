#!/bin/bash
# AutomatosX Agent Migration Tool
# Migrates agents between teams with automatic configuration updates
# Version: 2.0
# Created: 2025-10-09

set -e  # Exit on error

# ═══════════════════════════════════════════════════
# Configuration & Constants
# ═══════════════════════════════════════════════════

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="2.0"

# Colors (using $'...' for proper escape sequence expansion)
RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
BLUE=$'\033[0;34m'
NC=$'\033[0m' # No Color

# Default values
AGENT=""
FROM_TEAM=""
TO_TEAM=""
SILENT_MODE=false
DRY_RUN=false
BACKUP_DIR=""
VERBOSE=false

# ═══════════════════════════════════════════════════
# Helper Functions
# ═══════════════════════════════════════════════════

show_help() {
  cat << EOF
${BLUE}AutomatosX Agent Migration Tool v${VERSION}${NC}

${BLUE}USAGE:${NC}
  $(basename "$0") [OPTIONS]

${BLUE}OPTIONS:${NC}
  --agent <name>        Agent name to migrate (required)
  --from <team>         Source team (optional, auto-detected)
  --to <team>           Destination team (required)
  --yes, -y             Skip confirmations (silent mode)
  --dry-run             Show what would be done without making changes
  --backup-dir <path>   Custom backup directory (default: tmp/migration-backup-TIMESTAMP)
  --verbose, -v         Verbose output
  --help, -h            Show this help message

${BLUE}EXAMPLES:${NC}
  # Interactive mode (with confirmations)
  $(basename "$0") --agent product --to design

  # Silent mode (no confirmations)
  $(basename "$0") --agent product --to design --yes

  # Dry run (preview changes)
  $(basename "$0") --agent product --to design --dry-run

  # Specify source team explicitly
  $(basename "$0") --agent product --from business --to design --yes

${BLUE}DESCRIPTION:${NC}
  This tool migrates an agent from one team to another by updating:
  - Agent configuration (adds team field)
  - Team configurations (workspace permissions and delegation references)
  - Creates automatic backups before making changes

EOF
}

log() {
  echo "$@"
}

log_verbose() {
  if [[ "$VERBOSE" == true ]]; then
    echo "${BLUE}[VERBOSE]${NC} $@"
  fi
}

log_success() {
  echo "${GREEN}✓${NC} $@"
}

log_warning() {
  echo "${YELLOW}⚠${NC} $@"
}

log_error() {
  echo "${RED}✗${NC} $@" >&2
}

confirm() {
  local prompt="$1"

  if [[ "$SILENT_MODE" == true ]] || [[ "$DRY_RUN" == true ]]; then
    log_verbose "Auto-confirmed: $prompt"
    return 0
  fi

  read -p "$prompt (y/N): " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

execute_or_preview() {
  local description="$1"
  local command="$2"

  if [[ "$DRY_RUN" == true ]]; then
    echo "   ${BLUE}Would:${NC} $description"
  else
    log_verbose "Executing: $description"
    eval "$command"
    log_success "$description"
  fi
}

# ═══════════════════════════════════════════════════
# Argument Parsing
# ═══════════════════════════════════════════════════

while [[ $# -gt 0 ]]; do
  case $1 in
    --agent)
      AGENT="$2"
      shift 2
      ;;
    --from)
      FROM_TEAM="$2"
      shift 2
      ;;
    --to)
      TO_TEAM="$2"
      shift 2
      ;;
    --yes|-y)
      SILENT_MODE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --backup-dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --verbose|-v)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      show_help
      exit 0
      ;;
    *)
      log_error "Unknown option: $1"
      echo ""
      show_help
      exit 1
      ;;
  esac
done

# ═══════════════════════════════════════════════════
# Validation
# ═══════════════════════════════════════════════════

# Change to project root
cd "$PROJECT_ROOT"

if [[ -z "$AGENT" ]]; then
  log_error "Agent name is required (--agent)"
  echo ""
  show_help
  exit 1
fi

if [[ -z "$TO_TEAM" ]]; then
  log_error "Destination team is required (--to)"
  echo ""
  show_help
  exit 1
fi

# Set default backup directory if not specified
if [[ -z "$BACKUP_DIR" ]]; then
  BACKUP_DIR="tmp/migration-backup-$(date +%Y%m%d-%H%M%S)"
fi

# ═══════════════════════════════════════════════════
# Pre-flight Checks
# ═══════════════════════════════════════════════════

AGENT_FILE=".automatosx/agents/${AGENT}.yaml"
TO_TEAM_FILE=".automatosx/teams/${TO_TEAM}.yaml"

if [[ ! -f "$AGENT_FILE" ]]; then
  log_error "Agent not found: $AGENT_FILE"
  exit 1
fi

if [[ ! -f "$TO_TEAM_FILE" ]]; then
  log_error "Destination team not found: $TO_TEAM_FILE"
  exit 1
fi

# Auto-detect FROM_TEAM if not specified
if [[ -z "$FROM_TEAM" ]]; then
  log "🔍 Auto-detecting source team for '${AGENT}'..."

  if grep -q "^team:" "$AGENT_FILE"; then
    FROM_TEAM=$(grep "^team:" "$AGENT_FILE" | awk '{print $2}')
    log "   Source team: ${FROM_TEAM}"
  else
    log_warning "   Agent has no team assignment (will be assigned to ${TO_TEAM})"
    FROM_TEAM="(none)"
  fi
fi

# Check if FROM_TEAM file exists (if FROM_TEAM is not "(none)")
if [[ "$FROM_TEAM" != "(none)" ]]; then
  FROM_TEAM_FILE=".automatosx/teams/${FROM_TEAM}.yaml"

  if [[ ! -f "$FROM_TEAM_FILE" ]]; then
    log_error "Source team not found: $FROM_TEAM_FILE"
    exit 1
  fi
fi

# Get agent display name
DISPLAY_NAME=$(grep "^displayName:" "$AGENT_FILE" | cut -d':' -f2- | xargs)

# ═══════════════════════════════════════════════════
# Display Migration Plan
# ═══════════════════════════════════════════════════

echo ""
if [[ "$DRY_RUN" == true ]]; then
  echo "${BLUE}═══════════════════════════════════════════════════${NC}"
  echo "${BLUE}  DRY RUN MODE - No changes will be made${NC}"
  echo "${BLUE}═══════════════════════════════════════════════════${NC}"
else
  echo "${BLUE}═══════════════════════════════════════════════════${NC}"
  echo "${BLUE}  AutomatosX Agent Migration Tool v${VERSION}${NC}"
  echo "${BLUE}═══════════════════════════════════════════════════${NC}"
fi
echo ""

echo "📋 Migration Plan:"
echo "   Agent:        ${AGENT} (${DISPLAY_NAME})"
echo "   From team:    ${FROM_TEAM} → ${TO_TEAM}"
echo ""

# List files that will be modified
echo "⚠️  Files to be modified:"
echo "   • ${AGENT_FILE}"
if [[ "$FROM_TEAM" != "(none)" ]]; then
  echo "   • ${FROM_TEAM_FILE}"
fi
echo "   • ${TO_TEAM_FILE}"

# Check for delegation references
DELEGATION_COUNT=$(grep -r "→ ${AGENT} (${FROM_TEAM} team)" .automatosx/teams/*.yaml 2>/dev/null | wc -l | xargs)
if [[ "$DELEGATION_COUNT" -gt 0 ]]; then
  echo "   • ${DELEGATION_COUNT} delegation reference(s) in other teams"
fi

echo ""

if [[ "$DRY_RUN" == true ]]; then
  log "${BLUE}This is a dry run - showing what would be done:${NC}"
  echo ""
fi

# ═══════════════════════════════════════════════════
# Confirmation
# ═══════════════════════════════════════════════════

if ! confirm "Continue with migration?"; then
  log_warning "Migration cancelled by user"
  exit 0
fi

echo ""

# ═══════════════════════════════════════════════════
# Phase 1: Backup
# ═══════════════════════════════════════════════════

if [[ "$DRY_RUN" == false ]]; then
  log "${BLUE}════ Phase 1: Creating Backup ════${NC}"
  echo ""

  if [[ -d "$BACKUP_DIR" ]]; then
    log_error "Backup directory already exists: $BACKUP_DIR"
    exit 1
  fi

  mkdir -p "$BACKUP_DIR"
  log_success "Backup directory created: $BACKUP_DIR"

  # Backup agent file
  cp "$AGENT_FILE" "$BACKUP_DIR/"
  log_success "Backed up $AGENT_FILE"

  # Backup team files
  if [[ "$FROM_TEAM" != "(none)" ]]; then
    cp "$FROM_TEAM_FILE" "$BACKUP_DIR/"
    log_success "Backed up $FROM_TEAM_FILE"
  fi

  cp "$TO_TEAM_FILE" "$BACKUP_DIR/"
  log_success "Backed up $TO_TEAM_FILE"

  # Backup other team files that might have delegation references
  for team_file in .automatosx/teams/*.yaml; do
    team_name=$(basename "$team_file" .yaml)
    if [[ "$team_name" != "$FROM_TEAM" && "$team_name" != "$TO_TEAM" ]]; then
      if grep -q "→ ${AGENT} (${FROM_TEAM} team)" "$team_file" 2>/dev/null; then
        cp "$team_file" "$BACKUP_DIR/"
        log_success "Backed up $team_file"
      fi
    fi
  done

  # Create backup metadata
  cat > "$BACKUP_DIR/metadata.txt" << EOF
Migration Backup
Created: $(date)
Agent: $AGENT ($DISPLAY_NAME)
From: $FROM_TEAM
To: $TO_TEAM
Tool: $(basename "$0") v${VERSION}
EOF

  echo ""
fi

# ═══════════════════════════════════════════════════
# Phase 2: Migration
# ═══════════════════════════════════════════════════

log "${BLUE}════ Phase 2: Executing Migration ════${NC}"
echo ""

# Step 1: Update agent configuration
execute_or_preview "Update ${AGENT}.yaml (add team: ${TO_TEAM})" "
  if grep -q '^team:' '$AGENT_FILE'; then
    sed -i.bak 's/^team:.*/team: $TO_TEAM/' '$AGENT_FILE'
  else
    sed -i.bak '/^name: $AGENT/a\\
team: $TO_TEAM
' '$AGENT_FILE'
  fi
  rm -f '${AGENT_FILE}.bak'
"

# Step 2: Update FROM_TEAM (if not "(none)")
if [[ "$FROM_TEAM" != "(none)" ]]; then
  execute_or_preview "Update ${FROM_TEAM}.yaml (remove ${AGENT})" "
    sed -i.bak '/canReadWorkspaces:/,/^[[:space:]]*$/{
      /- $AGENT/d
    }' '$FROM_TEAM_FILE'
    rm -f '${FROM_TEAM_FILE}.bak'
  "
fi

# Step 3: Update TO_TEAM
execute_or_preview "Update ${TO_TEAM}.yaml (add ${AGENT})" "
  if ! grep -A 10 'canReadWorkspaces:' '$TO_TEAM_FILE' | grep -q '$AGENT'; then
    sed -i.bak '/canReadWorkspaces:/a\\
    - $AGENT
' '$TO_TEAM_FILE'
    rm -f '${TO_TEAM_FILE}.bak'
  fi
"

execute_or_preview "Update ${TO_TEAM}.yaml delegation references" "
  sed -i.bak 's/→ $AGENT ($FROM_TEAM team)/→ $AGENT ($TO_TEAM team)/g' '$TO_TEAM_FILE'
  rm -f '${TO_TEAM_FILE}.bak'
"

# Step 4: Update delegation references in other teams
for team_file in .automatosx/teams/*.yaml; do
  team_name=$(basename "$team_file" .yaml)

  if [[ "$team_name" != "$FROM_TEAM" && "$team_name" != "$TO_TEAM" ]]; then
    if grep -q "→ ${AGENT} (${FROM_TEAM} team)" "$team_file" 2>/dev/null; then
      execute_or_preview "Update ${team_name}.yaml delegation references" "
        sed -i.bak 's/→ $AGENT ($FROM_TEAM team)/→ $AGENT ($TO_TEAM team)/g' '$team_file'
        rm -f '${team_file}.bak'
      "
    fi
  fi
done

echo ""

# ═══════════════════════════════════════════════════
# Phase 3: Verification
# ═══════════════════════════════════════════════════

if [[ "$DRY_RUN" == false ]]; then
  log "${BLUE}════ Phase 3: Verification ════${NC}"
  echo ""

  # Rebuild project
  if command -v npm &> /dev/null; then
    log "🔨 Rebuilding project..."
    npm run build > /dev/null 2>&1 && log_success "Build successful" || log_warning "Build had issues"
  fi

  # Test agent
  if command -v ax &> /dev/null || [[ -f "./dist/index.js" ]]; then
    log "🧪 Testing ${AGENT} agent..."

    AX_CMD="./dist/index.js"
    if command -v ax &> /dev/null; then
      AX_CMD="ax"
    fi

    if $AX_CMD agent show "$AGENT" 2>&1 | grep -q "Team:.*${TO_TEAM}"; then
      log_success "Agent successfully assigned to ${TO_TEAM} team"
    else
      log_warning "Could not verify team assignment"
    fi
  fi

  echo ""
fi

# ═══════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════

if [[ "$DRY_RUN" == true ]]; then
  echo "${BLUE}✓ Dry run completed - no changes made${NC}"
else
  echo "${GREEN}✅ Migration completed successfully!${NC}"
  echo ""
  echo "Backup location: ${BACKUP_DIR}"
  echo ""
  echo "To rollback, run:"
  echo "  cp ${BACKUP_DIR}/* .automatosx/agents/ && cp ${BACKUP_DIR}/* .automatosx/teams/"
fi
echo ""
