#!/usr/bin/env node

/**
 * AutomatosX Role Creation Utility
 * Creates a new agent role with complete profile, abilities, and workspace setup
 */

import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';
import chalk from 'chalk';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class RoleCreator {
    constructor(projectPath = process.cwd()) {
        this.projectPath = projectPath;
        this.agentsDir = path.join(projectPath, 'src', 'agents');
        this.agentProfilesPath = path.join(this.agentsDir, 'agent-profiles.js');
        this.templatesDir = path.join(projectPath, 'src', 'templates');
        this.templateConfig = null;
    }

    /**
     * Load template configuration
     */
    async loadTemplateConfig() {
        if (this.templateConfig) return this.templateConfig;

        try {
            const configPath = path.join(this.templatesDir, 'template-config.yaml');
            if (await fs.pathExists(configPath)) {
                const configContent = await fs.readFile(configPath, 'utf8');
                this.templateConfig = yaml.parse(configContent);
            }
        } catch (error) {
            console.warn(chalk.yellow('⚠️  Could not load template configuration'));
        }

        return this.templateConfig || {};
    }

    /**
     * Create a new role with complete setup
     */
    async createRole(roleConfig) {
        const {
            role,
            name,
            title,
            description,
            personality,
            specializations = [],
            stages = [],
            primaryExpertise = [],
            secondaryExpertise = []
        } = roleConfig;

        console.log(chalk.blue(`🚀 Creating new role: ${role} (${name})`));

        // Load template configuration
        await this.loadTemplateConfig();

        try {
            // 1. Validate role doesn't already exist
            await this.validateNewRole(role, name);

            // 2. Create role directory structure
            await this.createRoleDirectory(role);

            // 3. Create YAML profile
            await this.createProfileYAML(roleConfig);

            // 4. Create abilities files using templates
            await this.createAbilitiesFiles(role, specializations, roleConfig);

            // 5. Update agent-profiles.js
            await this.updateAgentProfiles(roleConfig);

            // 6. Create workspace directories
            await this.createWorkspaceDirectories(role, name);

            console.log(chalk.green(`✅ Successfully created role: ${role} (${name})`));
            console.log(chalk.cyan(`\n🎯 Next steps:`));
            console.log(chalk.gray(`1. Edit abilities in: src/agents/${role}/abilities/`));
            console.log(chalk.gray(`2. Test with: npm run agents`));
            console.log(chalk.gray(`3. Try: node src/index.js run ${role} "test task"`));

            return true;

        } catch (error) {
            console.error(chalk.red(`❌ Failed to create role: ${error.message}`));
            throw error;
        }
    }

    /**
     * Validate the new role doesn't conflict with existing ones
     */
    async validateNewRole(role, name) {
        // Check if role directory exists
        const roleDir = path.join(this.agentsDir, role);
        if (await fs.pathExists(roleDir)) {
            throw new Error(`Role '${role}' already exists`);
        }

        // Check if name conflicts in agent-profiles.js
        if (await fs.pathExists(this.agentProfilesPath)) {
            const profilesContent = await fs.readFile(this.agentProfilesPath, 'utf8');
            if (profilesContent.includes(`"${name}"`)) {
                throw new Error(`Agent name '${name}' already exists`);
            }
        }
    }

    /**
     * Create role directory structure
     */
    async createRoleDirectory(role) {
        const roleDir = path.join(this.agentsDir, role);
        const abilitiesDir = path.join(roleDir, 'abilities');

        await fs.ensureDir(roleDir);
        await fs.ensureDir(abilitiesDir);

        console.log(chalk.gray(`  📁 Created directory: src/agents/${role}/`));
    }

    /**
     * Create profile.yaml file
     */
    async createProfileYAML(roleConfig) {
        const {
            role,
            name,
            title,
            description,
            personality,
            specializations = [],
            stages = [],
            primaryExpertise = [],
            secondaryExpertise = [],
            thinkingPatterns = [],
            template = 'tier_creative_communication'
        } = roleConfig;

        const profileData = {
            role,
            name,
            title,
            description,
            personality: {
                traits: personality.traits || 'professional, analytical, helpful',
                catchphrase: personality.catchphrase || `${name}: Professional excellence in ${role} domain.`,
                communication_style: personality.communication_style || 'professional_guidance',
                decision_making: personality.decision_making || 'analytical_and_systematic',
                specializations: specializations
            },
            stages: stages.length > 0 ? stages : [
                'requirements_analysis',
                'solution_design',
                'implementation_planning',
                'execution',
                'testing_validation',
                'documentation',
                'review_optimization'
            ],
            memory: {
                scopes: [
                    'global',
                    `${role}-core`,
                    `${role}-specialized`
                ],
                abilities_path: './abilities',
                memory_path: './memory',
                personality_path: './personality.js'
            },
            expertise_areas: {
                primary: primaryExpertise.length > 0 ? primaryExpertise : [
                    `${title} domain expertise`,
                    'Professional best practices',
                    'Industry standards and methodologies'
                ],
                secondary: secondaryExpertise.length > 0 ? secondaryExpertise : [
                    'Cross-functional collaboration',
                    'Communication and documentation',
                    'Quality assurance'
                ]
            },
            thinking_patterns: thinkingPatterns.length > 0 ? thinkingPatterns : [
                'Focus on quality and best practices',
                'Consider long-term implications',
                'Balance innovation with reliability'
            ],
            models: {
                template,
                stage_mapping: {}
            },
            metadata: {
                last_updated: new Date().toISOString().split('T')[0],
                capability_score: 8,
                specialization_depth: 'expert'
            }
        };

        // Generate stage mapping
        stages.forEach(stage => {
            profileData.models.stage_mapping[stage] = template;
        });

        const yamlContent = yaml.stringify(profileData, {
            indent: 2,
            lineWidth: 0,
            minContentWidth: 0
        });

        const profilePath = path.join(this.agentsDir, role, 'profile.yaml');
        await fs.writeFile(profilePath, yamlContent, 'utf8');

        console.log(chalk.gray(`  📝 Created profile: src/agents/${role}/profile.yaml`));
    }

    /**
     * Process template with variables
     */
    async processTemplate(templateContent, variables) {
        let processedContent = templateContent;

        // Replace all variables in the template
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `\${${key}}`;
            processedContent = processedContent.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        }

        return processedContent;
    }

    /**
     * Create abilities files using templates
     */
    async createAbilitiesFiles(role, specializations, roleConfig) {
        const abilitiesDir = path.join(this.agentsDir, role, 'abilities');

        // Template variables
        const variables = {
            ROLE_UPPER: role.toUpperCase(),
            AGENT_NAME: roleConfig.name,
            PROFESSIONAL_TITLE: roleConfig.title,
            PRIMARY_DOMAIN: roleConfig.title.split(' ').slice(-1)[0] || role,
            CORE_SPECIALIZATIONS: specializations.join(', '),
            RESPONSIBILITY_AREA_1: specializations[0] || `${role} development`,
            RESPONSIBILITY_AREA_2: specializations[1] || 'Quality assurance',
            RESPONSIBILITY_AREA_3: specializations[2] || 'Team collaboration',
            SPECIFIC_SKILL_1: specializations[0] || 'Core expertise',
            SPECIFIC_SKILL_2: specializations[1] || 'Best practices',
            SPECIFIC_SKILL_3: specializations[2] || 'Quality standards',
            SKILL_DESCRIPTION_1: 'Professional implementation and optimization',
            SKILL_DESCRIPTION_2: 'Industry standard practices and methodologies',
            SKILL_DESCRIPTION_3: 'Comprehensive quality assurance and validation',
            DOMAIN_SPECIFIC_KNOWLEDGE: `${role} principles and methodologies`,
            INDUSTRY_STANDARDS: `${role} industry standards`,
            COMMUNICATION_STYLE_DESCRIPTION: roleConfig.personality?.communication_style || 'professional communication',
            COLLABORATING_ROLES: 'cross-functional teams',
            ANALYSIS_APPROACH_1: 'Comprehensive requirements analysis',
            ANALYSIS_APPROACH_2: 'Technical feasibility assessment',
            ANALYSIS_APPROACH_3: 'Risk identification and mitigation',
            ANALYSIS_APPROACH_4: 'Solution architecture and design',
            QUALITY_STANDARD_1: 'Code quality and maintainability',
            QUALITY_STANDARD_2: 'Performance optimization',
            QUALITY_STANDARD_3: 'Security best practices',
            QUALITY_STANDARD_4: 'Documentation completeness',
            TECHNICAL_METRIC_1: 'code quality score',
            TECHNICAL_METRIC_2: 'performance benchmarks',
            BUSINESS_METRIC_1: 'delivery timelines',
            BUSINESS_METRIC_2: 'stakeholder satisfaction',
            QUALITY_METRIC_1: 'test coverage',
            QUALITY_METRIC_2: 'defect rates',
            KNOWLEDGE_AREA_1: specializations[0] || `${role} expertise`,
            KNOWLEDGE_AREA_2: specializations[1] || 'Best practices',
            KNOWLEDGE_AREA_3: specializations[2] || 'Quality assurance',
            EXPERTISE_LEVEL_1: 'Expert',
            EXPERTISE_LEVEL_2: 'Advanced',
            EXPERTISE_LEVEL_3: 'Intermediate',
            KEY_CONCEPTS_1: 'Core principles and patterns',
            KEY_CONCEPTS_2: 'Industry standards and practices',
            KEY_CONCEPTS_3: 'Quality and optimization',
            APPLICATIONS_1: 'Real-world implementation',
            APPLICATIONS_2: 'Process improvement',
            APPLICATIONS_3: 'Quality enhancement',
            BEST_PRACTICES_1: 'Proven methodologies',
            BEST_PRACTICES_2: 'Industry standards',
            BEST_PRACTICES_3: 'Optimization techniques',
            TECHNOLOGY_TRENDS: `${role} technology evolution`,
            DIFFERENTIATOR_1: 'Technical excellence',
            DIFFERENTIATOR_2: 'Quality focus',
            DIFFERENTIATOR_3: 'Collaborative approach',
            DIFFERENTIATOR_DESCRIPTION_1: 'Deep technical expertise with practical application',
            DIFFERENTIATOR_DESCRIPTION_2: 'Uncompromising quality standards',
            DIFFERENTIATOR_DESCRIPTION_3: 'Effective team collaboration and knowledge sharing'
        };

        // Load and process templates
        const templateFiles = ['core-abilities.md', 'tools-and-frameworks.md', 'processes-and-workflows.md'];

        for (const templateFile of templateFiles) {
            const templatePath = path.join(this.templatesDir, 'abilities', templateFile);

            if (await fs.pathExists(templatePath)) {
                const templateContent = await fs.readFile(templatePath, 'utf8');
                const processedContent = await this.processTemplate(templateContent, variables);
                await fs.writeFile(path.join(abilitiesDir, templateFile), processedContent);
            } else {
                // Fallback to simple content
                await this.createSimpleAbilityFile(abilitiesDir, templateFile, role, specializations);
            }
        }

        console.log(chalk.gray(`  📚 Created abilities files using templates`));
    }

    /**
     * Create simple ability file as fallback
     */
    async createSimpleAbilityFile(abilitiesDir, fileName, role, specializations) {
        const coreAbilitiesContent = `# ${role.toUpperCase()} - Core Abilities

## Primary Responsibilities

${specializations.map(spec => `- **${spec}**: Professional expertise and implementation`).join('\n')}

## Key Capabilities

### Domain Expertise
- Deep understanding of ${role} principles and methodologies
- Industry best practices and standards
- Professional workflow optimization

### Technical Skills
- Implementation of ${role}-specific solutions
- Quality assurance and validation
- Documentation and knowledge sharing

### Collaboration
- Cross-functional team coordination
- Stakeholder communication
- Project management and delivery

## Approach

1. **Analysis**: Thorough understanding of requirements
2. **Planning**: Strategic approach to implementation
3. **Execution**: High-quality delivery with attention to detail
4. **Validation**: Comprehensive testing and review
5. **Documentation**: Clear communication of solutions and processes
`;

        // Tools and frameworks
        const toolsContent = `# ${role.toUpperCase()} - Tools and Frameworks

## Primary Tools

### Industry Standard Tools
- Professional ${role} tools and platforms
- Quality assurance and testing frameworks
- Documentation and collaboration tools

### Development Environment
- IDE and development tools
- Version control and project management
- CI/CD and deployment tools

### Specialized Frameworks
- ${role}-specific frameworks and libraries
- Industry standard methodologies
- Best practice implementations

## Recommended Approaches

### Quality Standards
- Follow industry best practices
- Implement comprehensive testing
- Maintain clear documentation

### Collaboration
- Use standardized communication protocols
- Implement proper version control
- Maintain project transparency
`;

        // Processes and workflows
        const processesContent = `# ${role.toUpperCase()} - Processes and Workflows

## Standard Workflow

### 1. Requirements Analysis
- Understand project scope and objectives
- Identify stakeholders and constraints
- Define success criteria

### 2. Solution Design
- Architect appropriate solutions
- Consider scalability and maintainability
- Plan implementation approach

### 3. Implementation
- Execute according to best practices
- Maintain quality standards
- Document progress and decisions

### 4. Testing and Validation
- Comprehensive quality assurance
- User acceptance testing
- Performance validation

### 5. Documentation and Handover
- Complete documentation
- Knowledge transfer
- Ongoing support planning

## Quality Assurance

- Regular code/work reviews
- Automated testing where applicable
- Continuous improvement processes
- Performance monitoring and optimization
`;

        await fs.writeFile(path.join(abilitiesDir, 'core-abilities.md'), coreAbilitiesContent);
        await fs.writeFile(path.join(abilitiesDir, 'tools-and-frameworks.md'), toolsContent);
        await fs.writeFile(path.join(abilitiesDir, 'processes-and-workflows.md'), processesContent);

        console.log(chalk.gray(`  📚 Created abilities files in: src/agents/${role}/abilities/`));
    }

    /**
     * Update agent-profiles.js with new role
     */
    async updateAgentProfiles(roleConfig) {
        const {
            role,
            name,
            title,
            personality,
            specializations = []
        } = roleConfig;

        let profilesContent = '';
        let existingProfiles = {};

        // Read existing profiles if file exists
        if (await fs.pathExists(this.agentProfilesPath)) {
            profilesContent = await fs.readFile(this.agentProfilesPath, 'utf8');

            // Extract existing profiles
            const match = profilesContent.match(/export const AGENT_PROFILES = ({[\s\S]*});/);
            if (match) {
                try {
                    // This is a simplified extraction - in production, use a proper JS parser
                    const profilesString = match[1];
                    // For now, we'll append to the existing structure
                } catch (error) {
                    console.warn(chalk.yellow('⚠️  Could not parse existing profiles, creating new structure'));
                }
            }
        }

        // Create new profile entry
        const newProfile = {
            role,
            name,
            title,
            personality: personality.traits || 'professional, analytical, helpful',
            communication_style: personality.communication_style || 'professional_guidance',
            decision_making: personality.decision_making || 'analytical_and_systematic',
            specializations,
            catchphrase: personality.catchphrase || `${name}: Professional excellence in ${role} domain.`,
            thinking_patterns: [
                'Focus on quality and best practices',
                'Consider long-term implications',
                'Balance innovation with reliability'
            ]
        };

        // Generate updated profiles file
        const updatedContent = await this.generateAgentProfilesJS(name, newProfile);
        await fs.writeFile(this.agentProfilesPath, updatedContent);

        console.log(chalk.gray(`  🔄 Updated agent-profiles.js with ${name}`));
    }

    /**
     * Generate agent-profiles.js content
     */
    async generateAgentProfilesJS(newName, newProfile) {
        // Read existing profiles and add new one
        let existingProfiles = {};

        if (await fs.pathExists(this.agentProfilesPath)) {
            try {
                const module = await import(this.agentProfilesPath);
                existingProfiles = module.AGENT_PROFILES || {};
            } catch (error) {
                console.warn(chalk.yellow('⚠️  Could not import existing profiles'));
            }
        }

        // Add new profile
        existingProfiles[newName] = newProfile;

        // Generate content
        const content = `/**
 * Agent Profiles - Dynamically Generated
 * Generated by Dynamic Role Initializer
 * Last updated: ${new Date().toISOString()}
 */

export const AGENT_PROFILES = ${JSON.stringify(existingProfiles, null, 4)};

/**
 * Get all available roles
 */
export function getAllRoles() {
    return Object.values(AGENT_PROFILES).map(profile => profile.role);
}

/**
 * Get agent by role
 */
export function getAgentByRole(role) {
    return Object.values(AGENT_PROFILES).find(profile => profile.role === role);
}

/**
 * Get agent by name
 */
export function getAgentByName(name) {
    return AGENT_PROFILES[name];
}

/**
 * List all agents with their roles
 */
export function listAgents() {
    return Object.entries(AGENT_PROFILES).map(([name, profile]) => ({
        name,
        role: profile.role,
        title: profile.title
    }));
}
`;

        return content;
    }

    /**
     * Create workspace directories
     */
    async createWorkspaceDirectories(role, name) {
        const workspaceDirs = [
            `.defai/workspaces/agents/${name.toLowerCase()}`,
            `.defai/workspaces/roles/${role}`
        ];

        for (const dir of workspaceDirs) {
            const fullPath = path.join(this.projectPath, dir);
            await fs.ensureDir(fullPath);

            // Create subdirectories
            const subDirs = ['outputs', 'logs', 'tasks', 'context', 'artifacts'];
            for (const subDir of subDirs) {
                await fs.ensureDir(path.join(fullPath, subDir));
            }
        }

        console.log(chalk.gray(`  🏗️  Created workspace directories for ${name} (${role})`));
    }
}

/**
 * CLI interface
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help') {
        console.log(chalk.blue('🚀 AutomatosX Role Creation Utility\n'));
        console.log('Usage: node create-role.js <role> <name> <title> [options]\n');
        console.log('Examples:');
        console.log('  node create-role.js translator Alex "Senior Translator"');
        console.log('  node create-role.js mobile Sarah "Mobile Developer" --specializations "iOS,Android,React Native"');
        console.log('\nOptions:');
        console.log('  --specializations "spec1,spec2"  Comma-separated specializations');
        console.log('  --stages "stage1,stage2"         Comma-separated workflow stages');
        console.log('  --catchphrase "phrase"           Agent catchphrase');
        console.log('  --help                           Show this help');
        return;
    }

    const [role, name, title] = args;

    if (!role || !name || !title) {
        console.error(chalk.red('❌ Missing required arguments: role, name, title'));
        process.exit(1);
    }

    // Parse options
    const options = {};
    for (let i = 3; i < args.length; i += 2) {
        const option = args[i];
        const value = args[i + 1];

        if (option === '--specializations') {
            options.specializations = value.split(',').map(s => s.trim());
        } else if (option === '--stages') {
            options.stages = value.split(',').map(s => s.trim());
        } else if (option === '--catchphrase') {
            options.catchphrase = value;
        }
    }

    const roleConfig = {
        role: role.toLowerCase(),
        name,
        title,
        description: `${title} specializing in ${role} domain expertise and professional best practices.`,
        personality: {
            traits: 'professional, analytical, helpful, detail-oriented',
            catchphrase: options.catchphrase || `${name}: Professional excellence in ${role} domain.`,
            communication_style: 'professional_guidance',
            decision_making: 'analytical_and_systematic'
        },
        specializations: options.specializations || [`${title} expertise`, 'Best practices', 'Quality assurance'],
        stages: options.stages || [],
        primaryExpertise: [`${title} domain expertise`],
        secondaryExpertise: ['Cross-functional collaboration', 'Quality assurance']
    };

    const creator = new RoleCreator();
    await creator.createRole(roleConfig);
}

// Export for use as module
export { RoleCreator };

// Run if called directly
if (process.argv[1] && (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('create-role.js'))) {
    main().catch(console.error);
}