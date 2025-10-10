# Team-Based Configuration

**Introduced in**: v4.10.0
**Status**: Stable

---

## Overview

Team-based configuration is a powerful feature that eliminates configuration duplication by organizing agents into teams with shared settings. Instead of configuring providers, abilities, and orchestration settings for each agent individually, you define them once at the team level.

### Benefits

✅ **No Duplication**: Configure provider settings once per team
✅ **Easy Management**: Change settings for entire team at once
✅ **Shared Abilities**: Team-wide abilities automatically available to all members
✅ **Clear Organization**: 4 built-in teams match common development structures
✅ **Backward Compatible**: Existing agent-level configs still work

---

## Built-in Teams

AutomatosX includes 4 pre-configured teams, each optimized with the best AI provider for their domain:

### 1. **👥 Core Team**
- **Primary Provider**: OpenAI (`openai`)
- **Purpose**: General assistance, code generation, planning, and documentation
- **Agents**: Alex (assistant), Sofia (coder), Ryan (reviewer), Danny (debugger), Wendy (writer)
- **Shared Abilities**: general-knowledge, code-review-checklist, testing, documentation

### 2. **💻 Engineering Team**
- **Primary Provider**: Claude (`claude-code`)
- **Purpose**: Deep technical reasoning for specialized engineering work
- **Agents**: Bob (backend), Frank (frontend), Oliver (devops), Steve (security), Queenie (quality)
- **Shared Abilities**: our-coding-standards, code-generation, refactoring, testing

### 3. **📊 Business Team**
- **Primary Provider**: Gemini (`gemini-cli`)
- **Purpose**: Strategic thinking for executive leadership and product management
- **Agents**: Eric (ceo), Tony (cto), Paris (product), Daisy (data)
- **Shared Abilities**: business-analysis, product-strategy, stakeholder-management

### 4. **🎨 Design Team**
- **Primary Provider**: Gemini (`gemini-cli`)
- **Purpose**: Creative work for UX/UI design and technical writing
- **Agents**: Debbee (design)
- **Shared Abilities**: design-principles, documentation, user-research

---

## Team Configuration File

Teams are defined in YAML files at `.automatosx/teams/*.yaml`.

### Basic Structure

```yaml
# .automatosx/teams/engineering.yaml
name: engineering
displayName: "Engineering Team"
description: Software engineering specialists

# Provider configuration (inherited by all team members)
provider:
  primary: codex                 # Primary provider
  fallbackChain:                 # Ordered fallback list
    - codex
    - gemini
    - claude

# Shared abilities (automatically added to all team agents)
sharedAbilities:
  - our-coding-standards
  - code-generation
  - refactoring
  - testing

# Team-level orchestration defaults
orchestration:
  maxDelegationDepth: 2

# Metadata (optional)
metadata:
  owner: "Engineering Lead"
  created: "2025-10-08"
  updated: "2025-10-09"
```

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Unique team identifier (lowercase) |
| `displayName` | string | ✅ | Human-readable team name |
| `description` | string | ✅ | Team purpose and responsibilities |
| `provider` | object | ✅ | Provider configuration |
| `provider.primary` | string | ✅ | Primary provider (claude, gemini, codex) |
| `provider.fallbackChain` | array | ✅ | Ordered list of fallback providers |
| `sharedAbilities` | array | ❌ | Abilities available to all team members |
| `orchestration` | object | ❌ | Team-level orchestration settings |
| `metadata` | object | ❌ | Team metadata (owner, dates, etc.) |

---

## Agent Team Assignment

Agents join teams by specifying the `team` field in their profile.

### Before v4.10.0 (Deprecated)

```yaml
# .automatosx/agents/backend.yaml
name: backend
role: Senior Backend Engineer

# ❌ Configuration duplicated across all agents
provider: codex
model: gpt-4
temperature: 0.7
maxTokens: 4096

abilities:
  - our-coding-standards    # Repeated in every agent
  - code-generation         # Repeated in every agent
  - backend-development
```

### After v4.10.0 (Recommended)

```yaml
# .automatosx/agents/backend.yaml
name: backend
team: engineering           # ✅ Inherit all team settings
displayName: "Barry"
role: Senior Backend Engineer

# Only agent-specific abilities needed
abilities:
  - backend-development
  - api-design
  - database-optimization

systemPrompt: |
  You are a senior backend engineer...
```

### What Gets Inherited

When an agent joins a team, it automatically inherits:

1. ✅ **Provider Configuration**
   - Primary provider
   - Fallback chain
   - Provider-specific settings

2. ✅ **Shared Abilities**
   - Merged with agent's own abilities
   - No duplicates (automatically deduplicated)

3. ✅ **Orchestration Defaults**
   - Max delegation depth
   - Session settings
   - Workspace permissions (if specified)

---

## Provider Selection Priority

When executing an agent, providers are selected in this order:

```
1. CLI Option (--provider flag)           ← Highest priority
2. Agent's Team Configuration
3. Agent's Direct Configuration (deprecated)
4. Global Router Fallback                 ← Lowest priority
```

### Examples

```bash
# Uses team's primary provider (codex)
ax run backend "Implement auth API"

# Override with CLI option (uses gemini)
ax run backend "Implement auth API" --provider gemini

# Agent without team uses its own provider
ax run legacy-agent "Some task"  # Uses agent.provider
```

---

## Ability Merging

Abilities are automatically merged from team and agent configurations.

### Example: Backend Agent in Engineering Team

**Team Abilities** (`.automatosx/teams/engineering.yaml`):
```yaml
sharedAbilities:
  - our-coding-standards
  - code-generation
  - refactoring
  - testing
```

**Agent Abilities** (`.automatosx/agents/backend.yaml`):
```yaml
abilities:
  - backend-development
  - api-design
  - database-optimization
```

**Final Merged Abilities** (what the agent sees):
```yaml
abilities:
  - our-coding-standards      # From team
  - code-generation           # From team
  - refactoring               # From team
  - testing                   # From team
  - backend-development       # From agent
  - api-design                # From agent
  - database-optimization     # From agent
```

### Deduplication

If an ability appears in both team and agent configs, it's only included once:

```yaml
# Team
sharedAbilities:
  - code-generation

# Agent
abilities:
  - code-generation  # Duplicate - will be included only once
  - backend-development
```

---

## Creating Custom Teams

You can create custom teams for your organization.

### Step 1: Create Team File

```bash
# Create custom team configuration
cat > .automatosx/teams/ml.yaml << EOF
name: ml
displayName: "Machine Learning Team"
description: ML and data science specialists

provider:
  primary: gemini
  fallbackChain:
    - gemini
    - codex
    - claude

sharedAbilities:
  - data-analysis
  - ml-modeling
  - statistical-methods

orchestration:
  maxDelegationDepth: 3

metadata:
  owner: "ML Lead"
  created: "2025-10-09"
EOF
```

### Step 2: Create Abilities

```bash
# Create shared abilities for the team
cat > .automatosx/abilities/data-analysis.md << EOF
# Data Analysis

Statistical data analysis and visualization.

## Capabilities
- Exploratory data analysis
- Statistical testing
- Data visualization
- Pattern recognition

## Usage
Apply statistical methods to understand data patterns.
EOF
```

### Step 3: Assign Agents to Team

```yaml
# .automatosx/agents/ml-engineer.yaml
name: ml-engineer
team: ml                    # Use custom team
displayName: "Maya"
role: ML Engineer

abilities:
  - model-training          # Agent-specific
  - hyperparameter-tuning

systemPrompt: |
  You are an ML engineer...
```

### Step 4: Verify Configuration

```bash
# Show team details
ax team show ml

# Show agent with inherited config
ax agent show ml-engineer
```

---

## Migration Guide

### Migrating from v4.9.x to v4.10.0+

**Step 1**: Identify common configurations

```bash
# Review your existing agents
ls .automatosx/agents/

# Look for repeated provider/ability configs
grep -r "provider:" .automatosx/agents/
```

**Step 2**: Choose appropriate team

- Backend/Frontend/DevOps → `engineering`
- QA/Testing → `core`
- Product/Business Analysis → `business`
- Design/Content → `design`

**Step 3**: Update agent profiles

```yaml
# Before
name: backend
provider: codex
abilities:
  - code-generation
  - backend-development

# After
name: backend
team: engineering          # Add this
abilities:
  - backend-development    # Remove duplicated abilities
```

**Step 4**: Test agents

```bash
# Verify team assignment
ax agent show backend

# Test execution
ax run backend "Test task"
```

---

## Best Practices

### 1. **Use Teams for Organization**
```yaml
# ✅ Good: Clear team structure
team: engineering

# ❌ Bad: No team (deprecated pattern)
provider: codex
temperature: 0.7
```

### 2. **Keep Shared Abilities Generic**
```yaml
# ✅ Good: Broadly applicable to entire team
sharedAbilities:
  - our-coding-standards
  - code-generation

# ❌ Bad: Too specific for one agent
sharedAbilities:
  - backend-specific-tool
  - obscure-library-usage
```

### 3. **Document Team Purpose**
```yaml
# ✅ Good: Clear description
description: Software engineering specialists focusing on backend, frontend, and DevOps

# ❌ Bad: Vague description
description: Engineering stuff
```

### 4. **Use Metadata for Tracking**
```yaml
metadata:
  owner: "Engineering Lead"
  created: "2025-10-08"
  updated: "2025-10-09"
  purpose: "Backend API development"
```

### 5. **Consistent Provider Fallback**
```yaml
# ✅ Good: Logical fallback order
fallbackChain:
  - codex      # Primary: Best for code
  - gemini     # Secondary: Fast alternative
  - claude     # Tertiary: Reliable fallback

# ❌ Bad: Random order
fallbackChain:
  - claude
  - codex
  - gemini
```

---

## CLI Commands

### List Teams

```bash
# List all teams
ax team list

# Show team details
ax team show engineering

# List agents in team
ax agent list --by-team engineering
```

### Create Agent in Team

```bash
# Interactive creation (auto-assigns team based on template)
ax agent create my-agent --template developer --interactive

# Explicit team assignment
ax agent create my-agent \
  --template developer \
  --team engineering \
  --display-name "Mike"
```

---

## Troubleshooting

### Agent not inheriting team settings

**Symptoms**: Agent uses wrong provider or missing abilities

**Solution**: Verify team assignment
```bash
ax agent show <agent-name>
# Check "Team:" field in output
```

### Team file not found

**Symptoms**: Error: "Team 'xyz' not found"

**Solution**: Check team file exists
```bash
ls .automatosx/teams/
# Should show: core.yaml, engineering.yaml, business.yaml, design.yaml
```

### Abilities not merging correctly

**Symptoms**: Agent missing expected abilities

**Solution**: Check both team and agent configs
```bash
# View team abilities
cat .automatosx/teams/engineering.yaml | grep -A5 "sharedAbilities"

# View agent abilities
cat .automatosx/agents/backend.yaml | grep -A5 "abilities"
```

---

## Advanced Topics

### Custom Orchestration per Team

```yaml
# .automatosx/teams/engineering.yaml
orchestration:
  maxDelegationDepth: 3           # Allow deeper delegation chains
  workspace:
    maxFileSize: 20971520         # 20 MB for code files
    maxFiles: 200
  session:
    maxSessions: 50
    saveDebounce: 500
```

### Provider-Specific Settings

```yaml
provider:
  primary: codex
  fallbackChain: [codex, gemini, claude]
  settings:
    codex:
      temperature: 0.2            # Lower for code generation
      maxTokens: 8192
    gemini:
      temperature: 0.7
      maxTokens: 4096
```

---

## See Also

- [Agent Templates Guide](./agent-templates.md) - Quick agent creation
- [Multi-Agent Orchestration](./multi-agent-orchestration.md) - Team collaboration
- [CLI Commands Reference](../reference/cli-commands.md) - Command details

---

**Last Updated**: 2025-10-09
**Version**: v5.0.1
