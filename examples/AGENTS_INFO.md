# AutomatosX Agent Directory

AutomatosX agents have **human-friendly names** to make them easier to remember and use. Each agent has both a technical role name and a memorable display name.

## Why Names?

Research shows humans remember names better than roles. Instead of remembering "backend engineer", you can just think "ask Bob".

## Agent Directory

### 👥 Core Team

| Name | Role | Expertise | Best For | Primary Provider | Fallback |
|------|------|-----------|----------|------------------|----------|
| **Alex** | General Assistant | General purpose tasks, planning, questions | Quick questions, brainstorming, planning | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Charlie** | Software Developer | Code generation, implementation | Writing new code, implementing features | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Ryan** | Code Reviewer | Code review, quality assurance | PR reviews, code quality checks | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Danny** | Debug Expert | Debugging, troubleshooting | Fixing bugs, error analysis | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Wendy** | Technical Writer | Documentation, content creation | Writing docs, README files | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |

### 💻 Engineering

| Name | Role | Expertise | Best For | Primary Provider | Fallback |
|------|------|-----------|----------|------------------|----------|
| **Bob** | Backend Engineer | Server-side architecture, APIs, databases | Backend development, API design | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Frank** | Frontend Developer | React, UI/UX, performance | Frontend development, components | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Oliver** | DevOps Engineer | Infrastructure, CI/CD, deployment | DevOps, deployment, monitoring | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Steve** | Security Engineer | Application security, threat modeling | Security review, vulnerability assessment | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Queenie** | QA Engineer | Testing, quality assurance | Test planning, test automation | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |

### 📊 Business & Product

| Name | Role | Expertise | Best For | Primary Provider | Fallback |
|------|------|-----------|----------|------------------|----------|
| **Eric** | CEO | Business strategy, vision | Strategy, business decisions | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Tony** | CTO | Technology strategy, leadership | Tech strategy, architecture decisions | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Paris** | Product Manager | Product strategy, user research | Product planning, feature prioritization | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |
| **Daisy** | Data Scientist | Data analysis, machine learning | Analytics, ML models, insights | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |

### 🎨 Design

| Name | Role | Expertise | Best For | Primary Provider | Fallback |
|------|------|-----------|----------|------------------|----------|
| **Debbee** | UX/UI Designer | User experience, visual design | UX design, prototyping, design systems | 🟣 Claude | 🟢 OpenAI → 🔵 Gemini |

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
| 🟣 **Claude** | 16 | All agents (Alex, Charlie, Ryan, Danny, Wendy, Bob, Frank, Oliver, Steve, Queenie, Eric, Tony, Paris, Daisy, Debbee, + 1 more) |
| 🟢 **OpenAI** | 0 | Available via auto-routing |
| 🔵 **Gemini** | 0 | Available via auto-routing |

### Provider Selection Logic

```text
Agent Request → Try Primary Provider (Claude)
    ↓ (if fails)
Try Fallback Provider (if configured)
    ↓ (if fails or not configured)
Use Auto-Routing Priority:
    1. 🟢 OpenAI
    2. 🔵 Gemini
```

**Example**: If Charlie (primary: 🟣 **Claude**) encounters an error:

1. Try 🟣 **Claude** first
2. No fallback configured, skip to auto-routing
3. Router tries 🟢 **OpenAI** → 🔵 **Gemini** until one succeeds

### Customizing Provider Configuration

You can customize provider preferences for any agent:

```yaml
# In .automatosx/agents/my-agent.yaml
name: my-agent
displayName: MyAgent
provider: claude               # Primary: 🟣 Claude (can use 'claude' or 'claude-code')
fallbackProvider: codex        # Fallback: 🟢 OpenAI (v4.9.5+)

# Available provider options:
# - claude or claude-code  (🟣 Claude - both are Anthropic Claude)
# - codex                  (🟢 OpenAI)
# - gemini                 (🔵 Gemini)
```

**Why choose each provider?**

- 🟣 **Claude**: Best for general reasoning, long-context tasks, detailed analysis, and coding
- 🟢 **OpenAI**: Excellent for code generation and technical planning
- 🔵 **Gemini**: Great for creative tasks and multimodal processing

## Usage Examples

### Using Technical Role Names

```bash
# Traditional way (still works)
automatosx run backend "Design a RESTful API for user management"
automatosx run frontend "Create a React login component"
automatosx run security "Review this authentication code"
```

### Using Display Names (Human-Friendly)

```bash
# More memorable!
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

| v4.0 Name | v3.x Name | Role |
|-----------|-----------|------|
| Alex | Alex | General Assistant |
| Charlie | - | Coder (new) |
| Ryan | - | Reviewer (new) |
| Danny | - | Debugger (new) |
| Wendy | - | Writer (new) |
| Bob | Bob | Backend Engineer |
| Frank | Frank | Frontend Developer |
| Oliver | Oliver | DevOps Engineer |
| Steve | Steve | Security Engineer |
| Queenie | Queenie | QA Engineer |
| Eric | Eric | CEO |
| Tony | Tony | CTO |
| Paris | Paris | Product Manager |
| Daisy | Daisy | Data Scientist |
| Debbee | Debbee | UX/UI Designer |

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
