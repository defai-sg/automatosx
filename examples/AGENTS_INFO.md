# AutomatosX Agent Directory

AutomatosX agents have **human-friendly names** to make them easier to remember and use. Each agent has both a technical role name and a memorable display name.

## Why Names?

Research shows humans remember names better than roles. Instead of remembering "backend engineer", you can just think "ask Bob".

## Agent Directory

### 👥 Core Team

| Name | Agent | Expertise | Best For | Primary Provider | Fallback |
|------|-------|-----------|----------|------------------|----------|
| **Alex** | assistant | General purpose tasks, planning, questions | Quick questions, brainstorming, planning | 🟢 OpenAI | 🟣 Claude → 🔵 Gemini |
| **Sofia** | coder | Code generation, implementation | Writing new code, implementing features | 🟢 OpenAI | 🟣 Claude → 🔵 Gemini |
| **Ryan** | reviewer | Code review, quality assurance | PR reviews, code quality checks | 🟢 OpenAI | 🟣 Claude → 🔵 Gemini |
| **Danny** | debugger | Debugging, troubleshooting | Fixing bugs, error analysis | 🟢 OpenAI | 🟣 Claude → 🔵 Gemini |
| **Wendy** | writer | Documentation, content creation | Writing docs, README files | 🟢 OpenAI | 🟣 Claude → 🔵 Gemini |

### 💻 Engineering

| Name | Agent | Expertise | Best For | Primary Provider | Fallback |
|------|-------|-----------|----------|------------------|----------|
| **Bob** | backend | Server-side architecture, APIs, databases | Backend development, API design | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Frank** | frontend | React, UI/UX, performance | Frontend development, components | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Oliver** | devops | Infrastructure, CI/CD, deployment | DevOps, deployment, monitoring | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Steve** | security | Application security, threat modeling | Security review, vulnerability assessment | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Queenie** | quality | Testing, quality assurance | Test planning, test automation | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |

### 📊 Business & Product

| Name | Agent | Expertise | Best For | Primary Provider | Fallback |
|------|-------|-----------|----------|------------------|----------|
| **Eric** | ceo | Business strategy, vision | Strategy, business decisions | 🔵 Gemini | 🟣 Claude → 🟢 OpenAI |
| **Tony** | cto | Technology strategy, leadership | Tech strategy, architecture decisions | 🔵 Gemini | 🟣 Claude → 🟢 OpenAI |
| **Paris** | product | Product strategy, user research | Product planning, feature prioritization | 🔵 Gemini | 🟣 Claude → 🟢 OpenAI |
| **Daisy** | data | Data analysis, machine learning | Analytics, ML models, insights | 🔵 Gemini | 🟣 Claude → 🟢 OpenAI |

### 🎨 Design

| Name | Agent | Expertise | Best For | Primary Provider | Fallback |
|------|-------|-----------|----------|------------------|----------|
| **Debbee** | design | User experience, visual design | UX design, prototyping, design systems | 🔵 Gemini | 🟢 OpenAI → 🟣 Claude |

## Provider Configuration

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
| 🟢 **OpenAI** | 5 | Core Team (Alex, Sofia, Ryan, Danny, Wendy) |
| 🟣 **Claude** | 5 | Engineering Team (Bob, Frank, Oliver, Steve, Queenie) |
| 🔵 **Gemini** | 5 | Business & Product + Design (Eric, Tony, Paris, Daisy, Debbee) |

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
automatosx run Steve "Review this authentication code"

# Quick help from experts
automatosx run Eric "Should we prioritize mobile or web?"
automatosx run Tony "What's our cloud migration strategy?"
automatosx run Paris "How should we price this feature?"

# Get insights
automatosx run Daisy "Analyze our user engagement trends"
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
- **Steve** - "**S**teve keeps it **S**ecure"
- **Oliver** - "**O**liver **O**perates servers"
- **Queenie** - "**Q**ueenie ensures **Q**uality"
- **Eric** - "**E**ric's the **E**xecutive"
- **Tony** - "**T**ony leads **T**echnology"
- **Paris** - "**P**aris plans **P**roducts"
- **Daisy** - "**D**aisy dives into **D**ata"
- **Debbee** - "**D**ebbee **D**esigns beautifully"

### Team Analogy

Think of AutomatosX like assembling your dream team:

- Need backend work? **Call Bob**
- UI problems? **Ask Frank**
- Security concerns? **Talk to Steve**
- Strategy questions? **Consult Eric**
- Product decisions? **Meet with Paris**

## Next Steps

- Browse `examples/agents/` to see all agent profiles
- Copy agents to `.automatosx/agents/` to use them
- Customize agent personalities and abilities
- Create your own agents with memorable names!

---

**Pro tip**: You can list all available agents with:

```bash
automatosx list agents
```
