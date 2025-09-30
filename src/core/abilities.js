/**
 * Agent Abilities System
 * Manages role-based abilities from markdown files that users can modify
 * This is separate from Milvus chat history memory
 */

import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { AGENT_PROFILES } from '../agents/agent-profiles.js';

export class AgentAbilities {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.agentsRoot = path.join(projectPath, 'src/agents');
        this.initialized = false;
        this.abilitiesCache = new Map();
    }

    /**
     * Resolve agent name to role (e.g., "bob" -> "backend", "alice" -> "frontend")
     * @param {string} nameOrRole - Agent name or role
     * @returns {string} - The role name
     */
    resolveNameToRole(nameOrRole) {
        // First, check if role directory exists directly
        const directPath = path.join(this.agentsRoot, nameOrRole, 'abilities');
        if (fs.pathExistsSync(directPath)) {
            return nameOrRole;
        }

        // Then try to find by agent name in AGENT_PROFILES
        const agentEntry = Object.values(AGENT_PROFILES).find(
            agent => agent.name && agent.name.toLowerCase() === nameOrRole.toLowerCase()
        );

        if (agentEntry) {
            return agentEntry.role;
        }

        // Return original if no match found
        return nameOrRole;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            await fs.ensureDir(this.agentsRoot);
            await this.createDefaultAbilities();
            this.initialized = true;
            console.log('✅ Agent Abilities system initialized');
        } catch (error) {
            console.warn('⚠️  Agent Abilities initialization failed:', error.message);
            this.initialized = false;
        }
    }

    async createDefaultAbilities() {
        // Create default abilities directories and files if they don't exist
        const profileRoles = new Set(Object.values(AGENT_PROFILES).map(agent => agent.role));
        const roles = ['global', ...Array.from(profileRoles).sort()];

        for (const role of roles) {
            const roleBasePath = path.join(this.agentsRoot, role);
            const roleDir = path.join(roleBasePath, 'abilities');
            await fs.ensureDir(roleBasePath);
            await fs.ensureDir(roleDir);

            // Create default ability files if they don't exist
            const coreAbilitiesFile = path.join(roleDir, 'core-abilities.md');
            const toolsFile = path.join(roleDir, 'tools-and-frameworks.md');
            const processesFile = path.join(roleDir, 'processes-and-workflows.md');

            if (!await fs.pathExists(coreAbilitiesFile)) {
                await this.createDefaultAbilityFile(role, 'core-abilities', coreAbilitiesFile);
            }
            if (!await fs.pathExists(toolsFile)) {
                await this.createDefaultAbilityFile(role, 'tools-and-frameworks', toolsFile);
            }
            if (!await fs.pathExists(processesFile)) {
                await this.createDefaultAbilityFile(role, 'processes-and-workflows', processesFile);
            }
        }
    }

    async createDefaultAbilityFile(role, type, filePath) {
        let content = '';

        switch (type) {
            case 'core-abilities':
                content = this.getDefaultCoreAbilities(role);
                break;
            case 'tools-and-frameworks':
                content = this.getDefaultToolsAndFrameworks(role);
                break;
            case 'processes-and-workflows':
                content = this.getDefaultProcesses(role);
                break;
        }

        await fs.writeFile(filePath, content);
    }

    getDefaultCoreAbilities(role) {
        const roleAbilities = {
            backend: `# Backend Developer Core Abilities

## Technical Skills
- RESTful API design and implementation
- Database design and optimization (SQL/NoSQL)
- Server-side architecture and microservices
- Authentication and authorization systems
- Performance optimization and caching
- Error handling and logging strategies

## Problem-Solving Approach
- Break down complex requirements into manageable components
- Design scalable and maintainable code structures
- Consider security implications in all implementations
- Write comprehensive tests and documentation

## Code Quality Standards
- Follow SOLID principles and design patterns
- Implement proper error handling and validation
- Use consistent naming conventions and code style
- Optimize for performance and maintainability
`,
            frontend: `# Frontend Developer Core Abilities

## Technical Skills
- Modern JavaScript/TypeScript development
- React, Vue, or Angular framework expertise
- Responsive and accessible UI development
- State management (Redux, Zustand, Context API)
- Performance optimization and bundle analysis
- Cross-browser compatibility and testing

## Design Implementation
- Transform designs into pixel-perfect implementations
- Create reusable component libraries
- Implement smooth animations and interactions
- Ensure mobile-first responsive design

## User Experience Focus
- Consider accessibility and usability in all implementations
- Optimize for performance and Core Web Vitals
- Implement proper error boundaries and loading states
- Create intuitive and consistent user interfaces
`,
            global: `# Global Abilities - Shared Across All Roles

## Communication
- Clear and concise written communication
- Technical documentation best practices
- Cross-functional collaboration skills
- Requirements gathering and clarification

## Problem-Solving
- Analytical thinking and root cause analysis
- Creative solution development
- Risk assessment and mitigation
- Decision-making frameworks

## Professional Standards
- Code review and quality assurance
- Continuous learning and skill development
- Industry best practices awareness
- Ethical considerations in technology
`
        };

        return roleAbilities[role] || `# ${role.charAt(0).toUpperCase() + role.slice(1)} Core Abilities

## Role-Specific Skills
- Define your key technical skills here
- List relevant tools and technologies
- Describe your approach to problem-solving
- Outline quality standards and best practices

## Professional Competencies
- Communication and collaboration skills
- Project management and organization
- Learning and adaptation strategies
- Industry knowledge and trends
`;
    }

    getDefaultToolsAndFrameworks(role) {
        const roleTools = {
            backend: `# Backend Tools and Frameworks

## Programming Languages
- Node.js / JavaScript / TypeScript
- Python (Django, FastAPI, Flask)
- Java (Spring Boot, Spring Framework)
- C# (.NET Core, ASP.NET)
- Go, Rust, or other system languages

## Databases
- PostgreSQL, MySQL, SQLite
- MongoDB, Redis, Elasticsearch
- Database migration tools
- ORM/ODM libraries

## Development Tools
- Docker and containerization
- Git version control
- CI/CD pipelines (GitHub Actions, Jenkins)
- Testing frameworks (Jest, pytest, JUnit)
- API documentation tools (Swagger, Postman)

## Cloud and Infrastructure
- AWS, Google Cloud, Azure services
- Load balancers and reverse proxies
- Monitoring and logging tools
- Message queues and event streaming
`,
            frontend: `# Frontend Tools and Frameworks

## Core Technologies
- HTML5, CSS3, Modern JavaScript/TypeScript
- React, Vue.js, Angular, or Svelte
- State management libraries
- CSS preprocessors and CSS-in-JS

## Development Tools
- Webpack, Vite, or Parcel bundlers
- ESLint, Prettier code formatting
- Testing frameworks (Jest, Cypress, Playwright)
- Storybook for component development

## Design and UI
- Figma, Sketch design tool integration
- CSS frameworks (Tailwind, Material-UI, Ant Design)
- Animation libraries (Framer Motion, GSAP)
- Accessibility testing tools

## Performance and Optimization
- Lighthouse and Core Web Vitals tools
- Bundle analyzers and performance profilers
- Image optimization tools
- Progressive Web App technologies
`,
            global: `# Global Tools and Frameworks

## Version Control
- Git workflows and branching strategies
- GitHub, GitLab, or Bitbucket
- Code review tools and processes

## Communication and Documentation
- Slack, Discord, Microsoft Teams
- Confluence, Notion, or similar wiki tools
- Markdown and technical writing
- Diagramming tools (Miro, Draw.io, Lucidchart)

## Project Management
- Jira, Trello, Asana task management
- Agile/Scrum methodologies
- Time tracking and estimation tools

## Development Environment
- VS Code, IntelliJ, or preferred IDEs
- Terminal and command-line tools
- Package managers and dependency management
`
        };

        return roleTools[role] || `# ${role.charAt(0).toUpperCase() + role.slice(1)} Tools and Frameworks

## Primary Tools
- List your main development tools
- Include frameworks and libraries
- Specify version control and CI/CD tools

## Supporting Technologies
- Databases and storage solutions
- Testing and quality assurance tools
- Monitoring and debugging utilities

## Environment and Infrastructure
- Development environment setup
- Deployment and hosting platforms
- Collaboration and communication tools
`;
    }

    getDefaultProcesses(role) {
        return `# ${role.charAt(0).toUpperCase() + role.slice(1)} Processes and Workflows

## Development Workflow
1. Requirements analysis and planning
2. Design and architecture considerations
3. Implementation with iterative testing
4. Code review and quality assurance
5. Deployment and monitoring

## Quality Assurance
- Test-driven development practices
- Code review checklists and standards
- Performance testing and optimization
- Security vulnerability assessments

## Collaboration Processes
- Daily standups and progress reporting
- Sprint planning and retrospectives
- Cross-team communication protocols
- Documentation and knowledge sharing

## Continuous Improvement
- Learning and skill development plans
- Technology evaluation and adoption
- Process refinement and optimization
- Feedback collection and implementation
`;
    }

    async loadAbilities(roles = [], useCache = true) {
        await this.initialize();

        const abilities = {};

        // Always include global abilities
        if (!roles.includes('global')) {
            roles = ['global', ...roles];
        }

        for (const role of roles) {
            if (useCache && this.abilitiesCache.has(role)) {
                abilities[role] = this.abilitiesCache.get(role);
                continue;
            }

            const roleAbilities = await this.loadRoleAbilities(role);
            abilities[role] = roleAbilities;

            if (useCache) {
                this.abilitiesCache.set(role, roleAbilities);
            }
        }

        return abilities;
    }

    async loadRoleAbilities(role) {
        // Resolve agent name to role (e.g. "bob" -> "backend")
        const resolvedRole = this.resolveNameToRole(role);
        const rolePath = path.join(this.agentsRoot, resolvedRole, 'abilities');
        const abilities = [];

        if (!await fs.pathExists(rolePath)) {
            if (role !== resolvedRole) {
                console.warn(`Abilities not found for "${role}" (resolved to "${resolvedRole}")`);
            } else {
                console.warn(`Abilities not found for role: ${role}`);
            }
            return abilities;
        }

        // Load all markdown files in the role directory
        const pattern = path.join(rolePath, '*.md');
        const files = glob.sync(pattern);

        for (const filePath of files) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const fileName = path.basename(filePath, '.md');

                abilities.push({
                    source: filePath,
                    filename: fileName,
                    content: content,
                    role: role,
                    size: content.length,
                    type: 'ability'
                });
            } catch (error) {
                console.warn(`Failed to load ability file ${filePath}:`, error.message);
            }
        }

        return abilities;
    }

    async searchAbilities(query, roles = [], limit = 10) {
        const abilities = await this.loadAbilities(roles);
        const results = [];
        const queryLower = query.toLowerCase();

        // Extract keywords from query
        const keywords = this.extractKeywords(query);

        for (const [role, roleAbilities] of Object.entries(abilities)) {
            for (const ability of roleAbilities) {
                const relevanceScore = this.calculateRelevanceScore(ability, keywords, queryLower);

                if (relevanceScore > 0) {
                    results.push({
                        ...ability,
                        relevance: relevanceScore,
                        preview: this.createPreview(ability.content, queryLower)
                    });
                }
            }
        }

        // Sort by relevance and return top results
        results.sort((a, b) => b.relevance - a.relevance);
        return results.slice(0, limit);
    }

    extractKeywords(text) {
        const stopWords = new Set([
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'how',
            'what', 'when', 'where', 'why', 'who', 'which'
        ]);

        return text.toLowerCase()
            .match(/\b[a-z]+\b/g)
            ?.filter(word => word.length > 2 && !stopWords.has(word)) || [];
    }

    calculateRelevanceScore(ability, keywords, queryLower) {
        const content = ability.content.toLowerCase();
        let score = 0;

        // Keyword matching
        for (const keyword of keywords) {
            const count = (content.match(new RegExp(keyword, 'g')) || []).length;
            score += Math.min(count * 0.5, 2); // Cap contribution per keyword
        }

        // Title/header matching (higher weight)
        const lines = content.split('\n');
        for (const line of lines) {
            if (line.startsWith('#') && line.toLowerCase().includes(queryLower)) {
                score += 1.5;
            }
        }

        // File name matching
        if (ability.filename.toLowerCase().includes(queryLower)) {
            score += 1;
        }

        // Normalize by content length
        score = score / (1 + ability.size / 1000);

        return score;
    }

    createPreview(content, query, maxLength = 200) {
        const lines = content.split('\n');
        const queryIndex = content.toLowerCase().indexOf(query);

        if (queryIndex === -1) {
            return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
        }

        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(content.length, queryIndex + 150);
        const preview = content.substring(start, end);

        return (start > 0 ? '...' : '') + preview + (end < content.length ? '...' : '');
    }

    async getAbilitiesSummary(roles = []) {
        const abilities = await this.loadAbilities(roles);
        const summary = {
            totalRoles: Object.keys(abilities).length,
            totalAbilities: 0,
            rolesSummary: {}
        };

        for (const [role, roleAbilities] of Object.entries(abilities)) {
            summary.totalAbilities += roleAbilities.length;
            summary.rolesSummary[role] = {
                count: roleAbilities.length,
                files: roleAbilities.map(ability => ability.filename),
                totalSize: roleAbilities.reduce((sum, ability) => sum + ability.size, 0)
            };
        }

        return summary;
    }

    async refreshCache() {
        this.abilitiesCache.clear();
        console.log('✅ Abilities cache refreshed');
    }
}

// Global instance
let _abilitiesInstance = null;

export async function getAgentAbilities() {
    if (!_abilitiesInstance) {
        _abilitiesInstance = new AgentAbilities();
        await _abilitiesInstance.initialize();
    }
    return _abilitiesInstance;
}
