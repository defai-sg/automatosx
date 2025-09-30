# AutomatosX Frequently Asked Questions (FAQ)

This document answers the most common questions about AutomatosX design decisions, requirements, and usage policies.

## 🚀 System Requirements & Setup

### Q: What are the minimum CLI requirements to run AutomatosX?

**A:** AutomatosX is designed with flexibility in mind. The **minimum requirement** is:
- **Claude Code Pro account** - Our primary provider for optimal performance

You can disable other providers (Gemini CLI and OpenAI CLI) if needed. However, our **design philosophy emphasizes
cost reduction while maximizing performance**, so we **strongly recommend** following our complete provider setup:

**Recommended Configuration:**
1. **Claude Code CLI** (Primary) - Best performance, zero API costs
2. **Gemini CLI** (Secondary) - Google AI fallback via gcloud
3. **OpenAI CLI** (Tertiary) - Codex integration for specialized tasks

**Why Multiple Providers?**
- **Reliability**: Automatic failover when one provider is down
- **Cost Optimization**: Use the most cost-effective provider for each task
- **Performance**: Different providers excel at different task types
- **Resilience**: Never be blocked by a single provider's issues

```bash
# Check your provider setup
npm run status

# Enable/disable providers as needed
node src/scripts/config-manager.js enable gemini
node src/scripts/config-manager.js disable openai
```

### Q: Can I use AutomatosX with just one provider?

**A:** Yes, but it's not recommended. AutomatosX includes a circuit breaker system that automatically routes to healthy
providers. With only one provider, you lose:
- Automatic failover capabilities
- Cost optimization through provider selection
- Performance benefits from provider specialization

## 🗄️ Memory System & Architecture

### Q: Why does AutomatosX use Milvus Lite instead of a full vector database?

**A:** This choice reflects our **real-world development philosophy**:

**The Reality of Development Cycles:**
- Every project has a lifecycle - they start, evolve, and eventually end
- Most companies run **multiple projects in parallel**
- Each project needs its own isolated memory and context
- Projects may be archived, transferred, or deprecated

**Why Milvus Lite is Perfect for This:**
- **File-based storage** - No server installation required
- **Project isolation** - Each project gets its own vector database
- **Multiple concurrent access** - Supports parallel project development
- **Zero maintenance** - No database servers to manage or maintain
- **Portable** - Move projects between developers/environments easily

**Our Integration Design:**
- **MCP server coordination** - Ensures write integrity across concurrent access
- **Automatic fallback** - SQLite backup when vector search is unavailable
- **Hybrid approach** - Best of both worlds: performance + reliability

**Enterprise vs Open Source:**
In our **enterprise AutomatosX Plus** version (which is **not open source**), we use more sophisticated infrastructure:
- **Milvus** (full server) for large-scale deployments
- **Weaviate** for specialized vector operations
- **Redis** for high-performance caching
- **Neo4j** for complex reasoning and relationship understanding

> **Future Note**: We may open-source some of our advanced reasoning capabilities in future AutomatosX versions
> (decision pending), but AutomatosX Plus will remain a commercial enterprise product.

### Q: Why not use a traditional database for memory?

**A:** Traditional databases lack semantic search capabilities. AutomatosX agents need to:
- Find **similar** conversations, not just exact matches
- Understand **context** across different agents
- **Learn** from past interactions to improve future responses

Vector embeddings enable this intelligence, making agents truly collaborative and adaptive.

## 📜 Licensing & Business Use

### Q: Can I use AutomatosX in a business environment?

**A:** **Yes, absolutely!** AutomatosX is **100% open source** under the **Apache License 2.0**.

**Business Usage Rights:**
- ✅ **Commercial use** - Use in your business operations
- ✅ **Modification** - Adapt to your business needs
- ✅ **Distribution** - Share with your team/clients
- ✅ **Private use** - Use internally without restrictions
- ✅ **Patent protection** - Apache 2.0 includes patent grants

**Only Requirement:**
- Include the Apache License 2.0 notice in your distribution
- No royalties, no fees, no restrictions on commercial use

**Standard Apache 2.0 License Notice:**
```
Copyright 2025 DEFAI Team

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

### Q: How can I contribute to AutomatosX?

**A:** We welcome contributions in multiple ways:

**Code Contributions:**
```bash
# If you modify the source code, please contribute back:
git clone https://github.com/defai-digital/automatosx
# Make your improvements
git push origin your-feature-branch
# Submit a pull request
```

**Community Support:**
- **Join as a Helper** - Help other users in discussions
- **Documentation** - Improve guides and tutorials
- **Bug Reports** - Report issues you encounter
- **Feature Requests** - Suggest new capabilities
- **Agent Abilities** - Contribute knowledge to agent abilities

**Financial Support:**
- **Fund Donations** - Support ongoing development
- **Sponsorship** - Support specific features or maintenance

**How to Get Started:**
1. Check our [GitHub Issues](https://github.com/defai-digital/automatosx/issues)
2. Join our community discussions
3. Read **[DEVELOPMENT.md](DEVELOPMENT.md)** for technical contribution guidelines

### Q: What's the difference between open source AutomatosX and AutomatosX Plus?

**A:**

**AutomatosX Open Source (This Version):**
- CLI-based AI provider integration
- Milvus Lite for vector memory
- 21+ specialized agents
- Basic workflow orchestration
- **Free forever** under Apache License 2.0
- **Fully open source** - all code available

**AutomatosX Plus (Enterprise - NOT Open Source):**
- Local offline AI models (no internet required)
- Enterprise-grade vector databases (Milvus, Weaviate)
- Advanced reasoning with Neo4j
- Redis-powered performance optimization
- Enhanced security and compliance features
- Professional support and consulting
- **Commercial license** - proprietary enterprise solution

> **Important**: AutomatosX Plus is **not open source**. It's a separate commercial enterprise product that builds on
> the concepts proven in this open source version. Both versions share the same core agent architecture principles,
> but AutomatosX Plus includes proprietary enterprise features and advanced AI capabilities.

## 🔧 Technical Questions

### Q: Why JavaScript/Node.js instead of Python?

**A:** AutomatosX v3.1.2+ uses JavaScript because:
- **Claude Code Integration** - Native JavaScript ecosystem
- **CLI Tool Compatibility** - Better integration with modern CLI tools
- **Async Performance** - Superior for I/O-heavy AI operations
- **Developer Ecosystem** - Broader adoption for development tools

> **Note**: Our enterprise version maintains Python capabilities for offline AI model integration.

### Q: How does the circuit breaker system work?

**A:** AutomatosX monitors each provider's health and automatically routes requests:

1. **Health Monitoring** - Regular availability checks
2. **Failure Detection** - Track response times and errors
3. **Automatic Switching** - Route to healthy providers
4. **Recovery Detection** - Restore providers when healthy

```bash
# Monitor provider health
npm run status
node src/scripts/config-manager.js test
```

### Q: Why do agents have human names and personalities?

**A:** AutomatosX uses **humanized AI agents** for several important reasons:

**1. Better User Experience**:
- **Memorable**: "Ask Bob the backend engineer" is easier to remember than "Use the backend agent"
- **Intuitive**: Human names make it feel like working with a real development team
- **Natural**: More engaging than interacting with anonymous AI functions

**2. Consistent Behavior**:
- **Personality-driven responses**: Each agent has consistent communication patterns
- **Role clarity**: Bob (backend) always thinks like a backend engineer, Steve (security) always considers security first
- **Predictable expertise**: You know what to expect from each team member

**3. Professional Team Simulation**:
- **Real team dynamics**: Mimics working with actual specialists
- **Distinct perspectives**: Each agent approaches problems from their role's viewpoint
- **Collaborative feel**: Feels like managing a real development team

**4. Improved Decision Making**:
- **Clear specialization**: Easy to choose the right expert for each task
- **Role-appropriate advice**: Each agent gives advice from their professional perspective
- **Quality consistency**: Personality traits ensure consistent quality standards

**Examples**:
```bash
# Bob (backend) - methodical, security-conscious
npm start run backend "Design user authentication"
# → Will focus on security, performance, and scalability

# Frank (frontend) - user-focused, creative
npm start run frontend "Create user login form"
# → Will focus on UX, accessibility, and visual design

# Steve (security) - paranoid (in a good way)
npm start run security "Review this authentication system"
# → Will find potential vulnerabilities and security gaps
```

> **Result**: You get more reliable, role-appropriate responses that feel like working with human experts rather than
> generic AI.

### Q: Can I add my own AI providers?

**A:** Yes! AutomatosX is designed for extensibility:

1. Implement the provider interface (see `src/providers/claude-code.js`)
2. Add configuration to `src/config/providers.json`
3. Register with the provider manager
4. Test with the circuit breaker system

See **[DEVELOPMENT.md](DEVELOPMENT.md#adding-new-providers)** for detailed instructions.

## 🤝 Community & Support

### Q: Where can I get help?

**Priority order for getting help:**

1. **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Solve common issues
2. **[GitHub Discussions](https://github.com/defai-digital/automatosx/discussions)** - Community support
3. **[GitHub Issues](https://github.com/defai-digital/automatosx/issues)** - Report bugs
4. **System Diagnostics** - Run `npm run health` for automated help

### Q: How can I stay updated on AutomatosX development?

**Stay Connected:**
- ⭐ **Star** our [GitHub repository](https://github.com/defai-digital/automatosx)
- 👀 **Watch** for release notifications
- 📖 **Read** our **[ROADMAP.md](ROADMAP.md)** for upcoming features
- 💬 **Join** community discussions

---

**Have a question not covered here?**

Please check our **[GitHub Discussions](https://github.com/defai-digital/automatosx/discussions)** or create a new discussion.
We actively monitor and respond to community questions.
