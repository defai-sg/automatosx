#!/usr/bin/env node

/**
 * AutomatosX Help System Script
 * Dynamic help content generation for Markdown commands
 *
 * Copyright 2025 DEFAI Team
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs-extra';
import path from 'path';

async function main() {
    const section = process.argv[2]?.toLowerCase();

    try {
        switch (section) {
            case 'agents':
                await showAgentsHelp();
                break;
            case 'commands':
                await showCommandsHelp();
                break;
            case 'workspace':
                await showWorkspaceHelp();
                break;
            default:
                await showGeneralHelp();
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

async function showGeneralHelp() {
    console.log(`🚀 **AutomatosX v2.0 Help**

**Agent-Based Development:**

🎭 **Natural & Personal Approach**:
\`/ax:agent bob, please implement user authentication\`
\`/ax:agent frank, help me create a responsive navbar\`
\`/ax:agent steve, audit our security configuration\`

**Or use direct commands**:
\`/ax:agent frontend, create responsive navbar component\`
\`/ax:agent security, audit security configuration\`

**Get More Help:**
• \`/ax:help agents\` - Meet all available AI agents
• \`/ax:help commands\` - List all available commands
• \`/ax:help workspace\` - Learn about workspace management

**Quick Start:**
1. Try: \`/ax:agent bob, create hello world API\`
2. Try: \`/ax:agent backend, implement hello world API\`
3. Both work the same, choose your preference!

**Key Features:**
✅ No API keys required (uses Claude Code CLI)
✅ Dual workspace system (agents + roles)
✅ Automatic fallback providers
✅ Complete task history and artifacts`);
}

async function showAgentsHelp() {
    console.log(`🎭 **Meet Your AI Agents**

Each agent has their own personality, expertise, and working style!

**💻 Development Team:**
• **Bob** (bob) - Senior Backend Developer
  "Let's build this rock-solid."
  Specialties: APIs, Databases, Security

• **Frank** (frank) - Senior Frontend Developer
  "Users first, beautiful code second."
  Specialties: React, UI/UX, Performance

• **Oliver** (oliver) - Senior DevOps Engineer
  "Automate everything, break nothing."
  Specialties: Docker, CI/CD, Cloud

• **Adrian** (adrian) - Senior Software Architect
  "Design for tomorrow, build for today."
  Specialties: System Design, Patterns, Scalability

• **Qing** (qing) - Senior QA Engineer
  "Quality is not negotiable."
  Specialties: Testing, Automation, Validation

• **Claire** (claire) - Quality Control Specialist
  "Perfection through process."
  Specialties: Standards, Reviews, Compliance

**🛡️ Security Team:**
• **Steve** (steve) - Senior Security Engineer
  "Security is not optional, it's essential."
  Specialties: Penetration Testing, Compliance, Auditing

**🎨 Creative Team:**
• **Debbee** (debbee) - Senior UX Designer
  "Design with empathy, iterate with data."
  Specialties: User Research, Prototyping, Accessibility

• **Daisy** (daisy) - Product Requirements Specialist
  "Requirements are the blueprint of success."
  Specialties: Requirements Analysis, Stakeholder Management

**🎯 Leadership Team:**
• **Eric** (eric) - Chief Executive Officer
  "Vision without execution is hallucination."
  Specialties: Strategy, Product Vision, Leadership

• **Tony** (tony) - Chief Technology Officer
  "Technology serves the mission."
  Specialties: Architecture, Tech Strategy, Innovation

• **Paris** (paris) - Senior Product Manager & Requirements Specialist
  "Projects succeed through people."
  Specialties: Agile, Stakeholder Management, Risk Management

**🔬 Research & Documentation:**
• **Serena** (serena) - Senior Research Analyst
  "Curiosity drives innovation."
  Specialties: Market Research, Competitive Analysis, Innovation

• **Doris** (doris) - Technical Documentation Specialist
  "Documentation is user experience."
  Specialties: Technical Writing, API Documentation, User Guides

**📊 Data Team:**
• **Ann** (ann) - Senior Data Scientist
  "Data tells stories, we interpret them."
  Specialties: Machine Learning, Analytics, Insights

• **Dennis** (dennis) - Senior Data Engineer
  "Pipelines are the arteries of data."
  Specialties: ETL, Data Architecture, Real-time Processing

**Usage Examples:**
\`/ax:agent bob, implement JWT authentication system\`
\`/ax:agent frank, create mobile-first navigation menu\`
\`/ax:agent steve, conduct security audit of API endpoints\`
\`/ax:agent dolly, design user onboarding workflow\`
\`/ax:agent leo, analyze market opportunity for new feature\`

**Pro Tips:**
• Each agent remembers your project context
• Agents have their own workspace for organized output
• Different agents may approach the same task differently
• Choose agents based on task complexity and your preference`);
}

async function showCommandsHelp() {
    console.log(`🏢 **Available Commands**

**Agent Commands** (Natural language):
• \`/ax:agent <name>, <task>\` - Call any agent by name
• \`/ax:help agents\` - Meet all available agents

**Direct Commands** (By specialty):
• \`/ax:agent backend, <task>\` - Backend development
• \`/ax:agent frontend, <task>\` - Frontend development
• \`/ax:agent devops, <task>\` - DevOps and infrastructure
• \`/ax:agent security, <task>\` - Security auditing
• \`/ax:agent architect, <task>\` - System architecture
• \`/ax:agent quality, <task>\` - Quality assurance
• \`/ax:agent design, <task>\` - UI/UX design
• \`/ax:agent product, <task>\` - Product requirements
• \`/ax:agent analyst, <task>\` - Market research
• \`/ax:agent product, <task>\` - Project management
• \`/ax:agent docs, <task>\` - Documentation
• \`/ax:agent data, <task>\` - Data science
• \`/ax:agent data, <task>\` - Data engineering

**Management Commands:**
• \`/ax:help\` - This help system
• \`/ax:help [topic]\` - Get help on specific topic
• \`/ax:workspace status\` - View workspace overview
• \`/ax:test\` - Test AutomatosX functionality

**Command Patterns:**
**Direct command**: \`/ax:agent backend, implement user authentication\`
**Agent-based**: \`/ax:agent bob, implement user authentication\`
**Natural language**: \`/ax:agent bob, please help me with authentication\`

Both approaches work identically - choose what feels natural!`);
}

async function showWorkspaceHelp() {
    console.log(`📁 **Workspace Management**

AutomatosX uses a **dual workspace system** for organized output:

**🎭 Agent Workspaces** (\`.defai/workspaces/agents/\`):
• Each agent has their personal workspace
• \`bob/\` - Bob's backend work and personal style
• \`frank/\` - Frank's frontend work and approach
• \`steve/\` - Steve's security analysis and reports

**🏢 Role Workspaces** (\`.defai/workspaces/roles/\`):
• Traditional role-based organization
• \`backend/\` - All backend development work
• \`frontend/\` - All frontend development work
• \`security/\` - All security auditing work

**Directory Structure** (same for both types):
\`\`\`
workspace/
├── outputs/     # Generated code, docs, configs
├── logs/        # Execution logs and debug info
├── tasks/       # Task history with metadata
├── context/     # Persistent memory and context
└── artifacts/   # Supporting files and resources
\`\`\`

**Management Commands:**
• \`/ax:workspace status\` - Overview of all workspaces
• \`/ax:workspace clean <role> --keep 20\` - Clean old outputs
• \`/ax:workspace list recent --role <role>\` - Recent work
• \`/ax:workspace stats --all\` - Detailed statistics

**File Naming:**
Files are timestamped: \`2024-12-01T10-30-00_implementation_a1b2.md\`

**Benefits:**
✅ Never lose your work - everything is saved and organized
✅ Easy to find past solutions and approaches
✅ Track your project's development history
✅ Compare different agents' approaches to similar tasks`);
}

// Run when executed directly
main().catch(console.error);

export { showGeneralHelp, showAgentsHelp, showCommandsHelp, showWorkspaceHelp };
