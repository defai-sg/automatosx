# AutomatosX Agent Directory

**v5.3.4 Update**: Team-based configuration complete. Best practices guide added.

AutomatosX agents have **human-friendly names** to make them easier to remember and use. Each agent has both a technical role name and a memorable display name.

## 💡 How to Use These Agents (Best Practices)

### Recommended: Natural Language Collaboration

Instead of directly commanding agents with slash commands, **let Claude Code coordinate**:

```
✅ BEST: "please work with backend agent to implement user authentication"
✅ BEST: "please discuss with backend and security agents to design our API"
✅ BEST: "please plan with the engineering team to refactor this module"
```

**Why this is better**:
- 🧠 Claude Code analyzes your project first
- 🎯 Provides full context to agents
- ✅ Validates results
- 🔄 Easy to iterate

### Express Method: Slash Commands (for simple tasks only)

```
⚡ EXPRESS: /ax:agent backend, write an email validation function
⚡ EXPRESS: /ax:agent quality, review this code snippet
```

**Use slash commands only when**:
- Task is simple and well-defined
- You know exactly which agent to use
- Speed matters more than planning

📖 **[Complete Best Practices Guide](../docs/BEST-PRACTICES.md)**

---

## 🎯 v5.0.12: Agent Governance & Delegation Controls

**Key Changes**:
- ✅ **Role Ownership**: Quality owns code-review/debugging, Security owns security-audit
- ✅ **Delegation Depth**: Most agents (1), Research only (0)
- ✅ **Smart Ability Loading**: `abilitySelection` reduces prompt tokens by 30-50%
- ✅ **Role-Specific Stages**: 8 unique workflow sequences
- ✅ **No Cycles**: maxDelegationDepth: 1 prevents re-delegation

**Agent Categories by Delegation Depth**:
- **Implementers** (depth 1): backend, frontend, fullstack, mobile, devops, security, design, writer
- **Data Specialists** (depth 1): data (engineer), data-scientist
- **Quality** (depth 1): quality (can delegate fixes to implementers)
- **Coordinators** (depth 1): product, ceo, cto (delegate to implementers)
- **Research** (depth 0): researcher (executes directly, no delegation)

## 🚀 Quick Overview: 15 Agents, 5 Teams, 3 Providers

AutomatosX agents are organized into **5 professional teams**, each optimized with the best AI provider for their domain:

| Team | Primary Provider | Agent Count | Expertise |
|------|------------------|-------------|-----------|
| **💻 Engineering Team** | 🟣 **Claude** (claude-code) | 6 | Backend, frontend, fullstack, mobile, DevOps, security |
| **💾 Data Team** | 🔵 **Gemini** (gemini-cli) | 2 | Data engineering, data science & ML |
| **🎯 Quality Team** | 🟣 **Claude** (claude-code) | 1 | Code review, debugging, testing (sole ownership) |
| **🎨 Content Team** | Various | 2 | UX/UI design, technical documentation |
| **📊 Leadership Team** | Various | 4 | CEO, CTO, Product Management, research & feasibility analysis |

### 🛡️ Intelligent 3-Layer Fallback System

Each agent uses a **smart fallback strategy** to ensure maximum reliability:

1. **Primary Provider**: Team-optimized AI (🟢 OpenAI / 🟣 Claude / 🔵 Gemini)
2. **Fallback Provider**: Agent-specific backup (configured per agent)
3. **Router Fallback**: Auto-routing through all available providers (priority-based)

**Example**: If an Engineering agent (primary: claude-code) encounters an issue:
- ✅ Try Claude first (primary: `claude-code`)
- ✅ Fall back to OpenAI (configured fallback: `openai`)
- ✅ Try Gemini (router fallback: `gemini-cli`)

This ensures **99.9% uptime** even if one provider has issues!

## Why Names?

Research shows humans remember names better than roles. Instead of remembering "backend engineer", you can just think "ask Bob".

## Agent Directory

### 💻 Engineering Team (Implementers)

**maxDelegationDepth: 1** - Can delegate once for cross-domain needs, no re-delegation

| Name | Agent | Expertise | Best For | Primary | Fallback | Can Delegate To |
|------|-------|-----------|----------|---------|----------|-----------------|
| **Bob** | backend | API design, database modeling, caching | Backend development, microservices | 🟣 claude-code | 🟢 openai | frontend, data, security, quality, devops |
| **Frank** | frontend | Component architecture, state management | Frontend development, React, accessibility | 🟣 claude-code | 🟢 openai | backend, design, security, quality, devops |
| **Felix** | fullstack | End-to-end features, API integration, E2E testing | Full-stack development, cross-layer features | 🟣 claude-code | 🟢 openai | backend, frontend, design, devops, quality |
| **Maya** | mobile | Native iOS/Android, React Native, Flutter | Mobile app development (native & cross-platform) | 🟣 claude-code | 🟢 openai | backend, design, devops, quality |
| **Oliver** | devops | Infrastructure as code, CI/CD pipelines | DevOps, deployment, observability | 🟣 claude-code | 🟢 openai | backend, frontend, security, quality |
| **Steve** | security | **SOLE OWNER** of security-audit | Security review, threat modeling | 🟢 openai | 🔵 gemini-cli | backend, frontend, devops, quality |

### 🎯 Quality Team (Coordinator Role)

**maxDelegationDepth: 1** - Can delegate fixes back to implementers, no re-delegation

| Name | Agent | Expertise | Best For | Primary | Fallback | Can Delegate To |
|------|-------|-----------|----------|---------|----------|-----------------|
| **Queenie** | quality | **SOLE OWNER** of code-review & debugging | Test planning, automation, quality gates | 🟢 openai | 🔵 gemini-cli | backend, frontend, security, devops, data |

### 🎨 Content Team (Implementers)

**maxDelegationDepth: 1** - Can delegate once for cross-domain needs, no re-delegation

| Name | Agent | Expertise | Best For | Primary | Fallback | Can Delegate To |
|------|-------|-----------|----------|---------|----------|-----------------|
| **Debbee** | design | UX research, wireframes, design systems | UX design, prototyping, accessibility | 🔵 gemini-cli | 🟢 openai | frontend, writer, quality |
| **Wendy** | writer | API docs, ADRs, release notes | Technical writing, documentation | 🟢 openai | 🟣 claude-code | backend, frontend, design, quality |

### 📊 Leadership Team (Coordinators)

**maxDelegationDepth: 1** - Delegate to implementers, focus on strategy, no re-delegation

| Name | Agent | Expertise | Best For | Primary | Fallback | Can Delegate To |
|------|-------|-----------|----------|---------|----------|-----------------|
| **Paris** | product | User research, feature planning, prioritization | Product strategy, roadmap planning | 🔵 gemini-cli | 🟣 claude-code | backend, frontend, design, writer, quality |
| **Eric** | ceo | Business strategy, market analysis, vision | Strategic decisions, organizational leadership | 🔵 gemini-cli | 🟣 claude-code | paris, tony, all agents |
| **Tony** | cto | Architecture governance, tech strategy, innovation | Technology roadmap, platform decisions | 🟢 openai | 🟣 claude-code | backend, frontend, devops, security, quality |

### 🔬 Research Team (Specialist)

**maxDelegationDepth: 0** - Execute research work directly, no delegation

| Name | Agent | Expertise | Best For | Primary | Fallback | Can Delegate To |
|------|-------|-----------|----------|---------|----------|-----------------|
| **Rodman** | researcher | Idea validation, feasibility analysis | Research reports, literature review | 🟢 openai | 🔵 gemini-cli | None (depth: 0) |

### 💾 Data Team (Specialists)

**maxDelegationDepth: 1** - Can delegate once for cross-domain needs, no re-delegation

| Name | Agent | Expertise | Best For | Primary | Fallback | Can Delegate To |
|------|-------|-----------|----------|---------|----------|-----------------|
| **Daisy** | data | ETL pipelines, data infrastructure, SQL optimization | Data engineering, data pipelines | 🔵 gemini-cli | 🟣 claude-code | backend, security, quality |
| **Dana** | data-scientist | Statistical analysis, ML modeling, data visualization | Data science, analytics, predictive modeling | 🔵 gemini-cli | 🟣 claude-code | data, backend, quality |

---

**Note**: General-purpose agents (assistant, coder, debugger, reviewer) have been moved to templates (`examples/templates/`) to prevent delegation cycles. Use `ax agent create` to add them when specifically needed for your project.

## Provider Configuration

### ✅ Best Practice: Model Parameters

**v5.0.11+ Recommendation**: Let provider CLIs use their optimized defaults

**What Changed**:
- All `temperature` and `maxTokens` parameters have been **removed from default agents**
- Provider CLIs (Claude, Gemini, OpenAI) use their own optimized settings
- This gives agents **full access to provider capabilities** (Claude: 200K tokens, Gemini: 2M tokens)

**Why This Is Better**:
1. **No Artificial Limits**: Agents can generate complete, comprehensive answers
2. **Provider Optimization**: Each CLI is tuned for its model's strengths
3. **Simpler Configuration**: Less to maintain and understand
4. **Fewer Mistakes**: Can't accidentally limit powerful models to 4K tokens

**When to Add Parameters** (optional):
- **Cost Control**: Set `maxTokens` to limit API usage for specific agents
- **Determinism**: Set `temperature: 0` for QA/testing agents that need consistent output
- **OpenAI Only**: Currently only OpenAI provider supports these parameters

**How to Add Parameters** (if needed):
```yaml
# Example: Cost-controlled agent
config:
  maxTokens: 2000  # Limit output length

# Example: Deterministic QA agent
config:
  temperature: 0   # Consistent output
```

**References**:
- See `CLAUDE.md` § Provider Model Parameters for technical details
- Track Gemini CLI support: [Issue #5280](https://github.com/google-gemini/gemini-cli/issues/5280)

---

AutomatosX uses a **3-layer fallback system** for maximum reliability:

1. **Primary Provider**: Each agent's preferred AI provider (configured in agent YAML)
2. **Fallback Provider**: Optional per-agent fallback (can be configured via `fallbackProvider` field)
3. **Router Fallback**: Auto-routing through multiple providers (OpenAI → Gemini)

### Supported AI Providers

| Brand | CLI Tool | Best For |
|-------|----------|----------|
| 🟣 **Claude** | `claude` or `claude-code` | General purpose, coding, analysis, debugging |
| 🟢 **OpenAI** | `codex` | Code generation, planning |
| 🔵 **Gemini** | `gemini` | Creative tasks, multimodal |

### Current Provider Distribution

| AI Provider | Agent Count | Agents |
|-------------|-------------|--------|
| 🔵 **Gemini** (gemini-cli) | 5 | Eric, Paris, Daisy, Dana, Debbee |
| 🟣 **Claude** (claude-code) | 6 | Bob, Frank, Felix, Maya, Oliver |
| 🟢 **OpenAI** (openai) | 4 | Tony, Wendy, Queenie, Steve, Rodman |

### Provider Selection Logic

```text
Agent Request → Try Primary Provider (varies by team)
    ↓ (if fails)
Try Fallback Provider (configured per agent)
    ↓ (if fails)
Use Auto-Routing Priority:
    1. 🟢 OpenAI (priority 1)
    2. 🔵 Gemini (priority 2)
    3. 🟣 Claude (priority 3)
```

**Example 1**: If Sofia (Core Team: primary 🟢 **OpenAI**, fallback 🟣 **Claude**) encounters an error:

1. Try 🟢 **OpenAI** first
2. If fails, try fallback 🟣 **Claude**
3. If still fails, router tries 🔵 **Gemini** (remaining provider)

**Example 2**: If Bob (Engineering: primary 🟣 **Claude**, fallback 🟢 **OpenAI**) encounters an error:

1. Try 🟣 **Claude** first
2. If fails, try fallback 🟢 **OpenAI**
3. If still fails, router tries 🔵 **Gemini** (remaining provider)

**Example 3**: If Eric (Business: primary 🔵 **Gemini**, fallback 🟣 **Claude**) encounters an error:

1. Try 🔵 **Gemini** first
2. If fails, try fallback 🟣 **Claude**
3. If still fails, router tries 🟢 **OpenAI** (remaining provider)

### Customizing Provider Configuration

You can customize provider preferences for any agent:

```yaml
# Example 1: Core Team configuration (OpenAI → Claude → Gemini)
name: assistant
displayName: Alex
provider: openai               # Primary: 🟢 OpenAI
fallbackProvider: claude-code  # Fallback: 🟣 Claude

# Example 2: Engineering Team configuration (Claude → OpenAI → Gemini)
name: backend
displayName: Bob
provider: claude               # Primary: 🟣 Claude
fallbackProvider: openai       # Fallback: 🟢 OpenAI (using 'codex' CLI)

# Example 3: Business Team configuration (Gemini → Claude → OpenAI)
name: ceo
displayName: Eric
provider: gemini-cli           # Primary: 🔵 Gemini
fallbackProvider: claude       # Fallback: 🟣 Claude

# Example 4: Design Team configuration (Gemini → OpenAI → Claude)
name: design
displayName: Debbee
provider: gemini-cli           # Primary: 🔵 Gemini
fallbackProvider: openai       # Fallback: 🟢 OpenAI

# Available provider options:
# - claude or claude-code  (🟣 Claude - both are Anthropic Claude)
# - openai or codex        (🟢 OpenAI - both use 'codex' CLI)
# - gemini-cli or gemini   (🔵 Gemini - both use 'gemini' CLI)
```

**Why choose each provider?**

- 🟣 **Claude**: Best for general reasoning, long-context tasks, detailed analysis, and coding
- 🟢 **OpenAI**: Excellent for code generation, technical planning, and structured outputs
- 🔵 **Gemini**: Great for creative tasks, multimodal processing, and strategic thinking

## Usage Examples

### Using Agent Names

```bash
# Use the agent name from the table above
automatosx run backend "Design a RESTful API for user management"
automatosx run frontend "Create a React login component"
automatosx run security "Review this authentication code"
```

### Using Display Names (Human-Friendly)

```bash
# More memorable! Use the human-friendly display name
automatosx run Bob "Design a RESTful API for user management"
automatosx run Frank "Create a React login component"
automatosx run Felix "Build an end-to-end user registration feature"
automatosx run Maya "Create a mobile app login screen for iOS and Android"
automatosx run Steve "Review this authentication code"

# Quick help from experts
automatosx run Eric "Should we prioritize mobile or web?"
automatosx run Tony "What's our cloud migration strategy?"
automatosx run Paris "How should we price this feature?"

# Get insights
automatosx run Daisy "Build an ETL pipeline for user data"
automatosx run Dana "Analyze our user engagement trends with ML models"
automatosx run Debbee "Review this dashboard design"
```

## Complete Agent List

### Old Version (v3.x) Name Mapping

For reference, here are the names from AutomatosX v3.x:

| v4.0 Name | v3.x Name | Agent |
|-----------|-----------|-------|
| Alex | Alex | assistant |
| Sofia | - | coder (new) |
| Ryan | - | reviewer (new) |
| Danny | - | debugger (new) |
| Wendy | - | writer (new) |
| Bob | Bob | backend |
| Frank | Frank | frontend |
| Oliver | Oliver | devops |
| Steve | Steve | security |
| Queenie | Queenie | quality |
| Eric | Eric | ceo |
| Tony | Tony | cto |
| Paris | Paris | product |
| Daisy | Daisy | data |
| Debbee | Debbee | design |

### Additional Agents from v3.x

These agents are available in v3.x but not yet ported to v4.0:

- **Adrian** - Architect (Solution Architect)
- **Anna** - Analyst (Business Analyst)
- **Flora** - CFO (Chief Financial Officer)
- **Doris** - Docs (Documentation Specialist)
- **Emily** - Edge (Edge Computing Engineer)
- **Louis** - Legal (Legal Counsel)
- **Maggie** - Marketer (Marketing Manager)
- **Nicolas** - Network (Network Engineer)
- **Quian** - Quantum (Quantum Computing Specialist)

## Customizing Agents

You can customize any agent or create new ones:

```bash
# Copy an example agent
cp examples/agents/backend.yaml .automatosx/agents/my-backend.yaml

# Edit the profile
vim .automatosx/agents/my-backend.yaml
```

Change the `displayName` field to give your agent a memorable name:

```yaml
name: my-backend
displayName: MyBob  # Your custom name!
role: Custom Backend Engineer
```

## Tips for Remembering

### Mnemonic Devices

- **Bob** - "Bob the **B**ackend **B**uilder"
- **Frank** - "**F**rank the **F**rontend friend"
- **Felix** - "**F**elix handles **F**ull-stack **F**eatures"
- **Maya** - "**M**aya makes **M**obile apps"
- **Steve** - "**S**teve keeps it **S**ecure"
- **Oliver** - "**O**liver **O**perates servers"
- **Queenie** - "**Q**ueenie ensures **Q**uality"
- **Eric** - "**E**ric's the **E**xecutive"
- **Tony** - "**T**ony leads **T**echnology"
- **Paris** - "**P**aris plans **P**roducts"
- **Daisy** - "**D**aisy manages **D**ata pipelines"
- **Dana** - "**D**ana does **D**ata science"
- **Debbee** - "**D**ebbee **D**esigns beautifully"

### Team Analogy

Think of AutomatosX like assembling your dream team:

- Need backend work? **Call Bob**
- UI problems? **Ask Frank**
- Full-stack features? **Work with Felix**
- Mobile apps? **Reach out to Maya**
- Security concerns? **Talk to Steve**
- Data pipelines? **Contact Daisy**
- Data science & ML? **Collaborate with Dana**
- Strategy questions? **Consult Eric**
- Product decisions? **Meet with Paris**
- Design feedback? **Chat with Debbee**

## Next Steps

- Browse `examples/agents/` to see all agent profiles
- Copy agents to `.automatosx/agents/` to use them
- Customize agent personalities and abilities
- Create your own agents with memorable names!

---

## 🎯 Agent Maintenance Principles (v5.0.11+)

To prevent delegation cycles and maintain a clean agent ecosystem, AutomatosX follows these principles:

### Core Principles

1. **Unique Responsibility**: Each default agent must have a clearly defined, non-overlapping responsibility area.
2. **Prevent Duplication**: No two agents should cover the same type of task.
3. **Prefer Specialization**: Default agents should be specialists, not generalists.
4. **Templates for Flexibility**: General-purpose agents should be templates, not defaults.

### Delegation Strategy

**Broad-scope agents** (CEO, CTO, Product) are configured with:
- `maxDelegationDepth: 1` - Limits multi-layer delegation
- **Delegation evaluation guidance** in systemPrompt:
  ```
  Before delegating, evaluate:
  1. Can I handle this with my expertise? If yes, do it yourself.
  2. Does this require specialized skills? If yes, delegate to specialists.
  3. Delegation should be intentional, not automatic.
  ```

### Adding New Agents

When creating or modifying agents:

1. **Check for overlaps**: Ensure the new agent doesn't duplicate existing agents
2. **Update team configuration**: Assign to appropriate team (core/engineering/business/design)
3. **Set delegation limits**: For coordinators, set `maxDelegationDepth: 1`
4. **Add delegation guidance**: Include evaluation criteria in systemPrompt
5. **Document responsibilities**: Update this file with the agent's clear scope

### Templates vs. Default Agents

**Default Agents** (`automatosx/agents/`):
- Specialized roles with clear boundaries
- Always available by default
- Current: backend, frontend, devops, security, quality, data, product, design, writer, ceo, cto

**Templates** (`examples/templates/`):
- General-purpose or situational roles
- Created on-demand with `ax agent create`
- Current: assistant, fullstack-developer, code-reviewer, debugger, developer, analyst, designer, qa-specialist

### How to Re-enable Template Agents

If your project genuinely needs a general-purpose agent (e.g., assistant, fullstack-developer), follow these steps:

#### Evaluation Checklist

**Before creating a template agent, ask:**
1. ✅ Can specialized agents (backend, frontend, quality) handle this task?
2. ✅ Will this agent overlap with existing default agents?
3. ✅ Is this for a specific project phase or temporary need?
4. ✅ Have I read the template's "TEMPLATE ROLE NOTICE"?

**If all answers are satisfactory, proceed:**

#### Step 1: Create from Template

```bash
# Interactive creation (recommended)
ax agent create my-assistant --template assistant --interactive

# Or non-interactive
ax agent create my-fullstack --template fullstack-developer \
  --display-name "Sofia" \
  --role "Full-stack Developer" \
  --team engineering
```

#### Step 2: Review Configuration

After creation, review the agent YAML in `.automatosx/agents/`:
- ✅ Check `maxDelegationDepth` (set to 1 for general-purpose agents)
- ✅ Review delegation guidance in systemPrompt
- ✅ Ensure abilities don't completely overlap with existing agents

#### Step 3: Test for Delegation Cycles

Run a test task and monitor delegation behavior:
```bash
# Test the agent
ax run my-assistant "Create a simple REST API"

# Watch for delegation patterns
# ❌ Bad: Agent immediately delegates to backend/frontend
# ✅ Good: Agent attempts task first, delegates only when necessary
```

#### Step 4: Adjust if Needed

If delegation cycles occur:
- Lower `maxDelegationDepth` to 1
- Add stronger "do it yourself first" guidance in systemPrompt
- Consider removing the agent and using specialized agents instead

#### Step 5: Document Your Decision

Add a comment to your project's `CLAUDE.md`:
```markdown
## Custom Agents

### my-assistant (General Assistant)
- **Why needed**: Handles cross-domain tasks during prototyping phase
- **Overlap mitigation**: maxDelegationDepth=1, explicit self-evaluation
- **Review date**: 2025-11-01
```

### Preventing Delegation Cycles

Common causes of infinite delegation:
- ❌ Two generalists with overlapping skills
- ❌ Agents with identical abilities but different names
- ❌ No clear "stop condition" in delegation logic

Solutions:
- ✅ Move generalists to templates
- ✅ Limit maxDelegationDepth for broad-scope agents
- ✅ Add explicit delegation evaluation in systemPrompt
- ✅ Prefer specialized agents with clear boundaries

---

**Pro tip**: You can list all available agents with:

```bash
automatosx list agents
```
