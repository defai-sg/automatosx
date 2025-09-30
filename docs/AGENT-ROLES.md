# AutomatosX Agent Roles

Quick reference guide for all available AI agents in AutomatosX.

## 🚀 Quick Usage
```bash
npm start run <agent-role> "<task description>"
```

## 📚 Full Role Directory

| Agent | Persona | Title | Focus | Example Command |
|-------|---------|-------|-------|-----------------|
| **algorithm** | Alex | Senior Algorithm Specialist | Complexity analysis, optimization | `npm start run algorithm "Review pathfinding algorithm complexity"` |
| **analyst** | Anna | Senior Business Analyst | Market research, KPI frameworks | `npm start run analyst "Outline product analytics KPIs"` |
| **architect** | Adrian | Software Architect | Systems design, integration strategy | `npm start run architect "Design multi-region SaaS architecture"` |
| **backend** | Bob | Senior Backend Engineer | APIs, databases, service reliability | `npm start run backend "Implement user profile API"` |
| **ceo** | Eric | Chief Executive Officer | Vision, portfolio planning, strategy | `npm start run ceo "Draft strategic vision for AutomatosX"` |
| **cfo** | Flora | Chief Financial Officer | Forecasting, pricing, financial controls | `npm start run cfo "Evaluate subscription pricing model"` |
| **cto** | Tony | Chief Technology Officer | Technology roadmaps, org design | `npm start run cto "Plan engineering modernization initiative"` |
| **data** | Daisy | Senior Data Professional | Analytics pipelines, ML, experimentation | `npm start run data "Design event analytics pipeline"` |
| **design** | Debbee | Senior UX Designer | Experience strategy, accessibility | `npm start run design "Map onboarding experience flow"` |
| **devops** | Oliver | Senior DevOps Engineer | CI/CD, infrastructure, observability | `npm start run devops "Propose Kubernetes deployment plan"` |
| **docs** | Doris | Technical Documentation Specialist | API docs, tutorials, information architecture | `npm start run docs "Document authentication API"` |
| **edge** | Emily | Senior Edge Computing Engineer | Edge deployments, IoT pipelines | `npm start run edge "Plan edge rollout for telemetry service"` |
| **frontend** | Frank | Senior Frontend Developer | UI systems, accessibility, responsive design | `npm start run frontend "Build responsive dashboard layout"` |
| **legal** | Louis | Senior Legal Counsel | Compliance, policy drafting, risk | `npm start run legal "Review data retention policy"` |
| **marketer** | Maggie | Senior Digital Marketing Strategist | GTM, positioning, campaign analytics | `npm start run marketer "Outline product launch campaign"` |
| **network** | Nicolas | Senior Network Engineering Expert | Networking, resiliency, diagnostics | `npm start run network "Troubleshoot multi-region latency"` |
| **product** | Paris | Senior Product Manager & Requirements Specialist | Roadmaps, discovery, stakeholder alignment | `npm start run product "Define MVP scope for reporting module"` |
| **quality** | Queenie | Senior Quality Professional | Test strategy, automation, release gating | `npm start run quality "Plan regression suite for auth service"` |
| **quantum** | Quian | Senior Quantum Computing Engineer | Quantum algorithms, hybrid compute | `npm start run quantum "Assess feasibility of quantum optimizer"` |
| **security** | Steve | Senior Security Engineer | Threat modelling, secure coding | `npm start run security "Perform auth threat assessment"` |
| **translator** | Taylor | Senior Translator | Localization, language QA, cross-cultural comms | `npm start run translator "Localize release notes to Japanese"` |

## 💡 Quick Tips

**Choose the Right Agent**:
- 🔧 Technical implementation → `backend`, `frontend`, `devops`
- 🔒 Security concerns → `security`
- 🎨 Experience & product shaping → `design`, `product`
- 📊 Decision support → `data`, `analyst`, `cfo`
- 📝 Documentation & localization → `docs`, `translator`
- 🏗️ Strategy & leadership → `architect`, `cto`, `ceo`

**Be Specific**:
```bash
# ❌ Vague: npm start run backend "help with API"
# ✅ Clear: npm start run backend "Design REST API for user management"
```

**Combine Agents for Complex Tasks**:
1. **Plan**: `architect` defines the technical approach
2. **Build**: `backend` + `frontend` implement the features
3. **Secure & Test**: `security` hardens, `quality` validates
4. **Launch**: `devops` deploys, `marketer` crafts the rollout story

## 🔍 Memory & Search
```bash
npm start memory search "topic"    # Find past conversations
npm start memory show <id>         # View specific conversation
npm run agents                     # List all available agents
npm start agents -- --detailed     # Show personas, stages, and specializations
```

---

**Need more details?** See [OPERATIONS.md](OPERATIONS.md) for complete command reference.
