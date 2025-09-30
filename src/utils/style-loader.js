/**
 * Style Loader Utility
 * Loads and applies role-specific output formatting styles
 */

import fs from 'fs-extra';
import path from 'path';

export async function loadStyle(role, projectPath = process.cwd()) {
    const stylePath = path.join(projectPath, '.claude/styles/ax', `${role}.yaml`);

    try {
        if (await fs.pathExists(stylePath)) {
            const styleContent = await fs.readFile(stylePath, 'utf8');
            return parseYamlStyle(styleContent);
        }
    } catch (error) {
        console.warn(`Warning: Could not load style for ${role}: ${error.message}`);
    }

    // Return default style if no custom style found
    return getDefaultStyle(role);
}

function parseYamlStyle(yamlContent) {
    // Simple YAML parsing for basic key-value pairs
    const lines = yamlContent.split('\n');
    const style = {
        guidelines: '',
        format: 'markdown',
        codeStyle: 'clean',
        documentation: true
    };

    let currentKey = null;
    let multilineValue = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        if (line.match(/^[a-zA-Z_][a-zA-Z0-9_]*:\s*/)) {
            // Save previous multiline value
            if (currentKey && multilineValue.length > 0) {
                style[currentKey] = multilineValue.join('\n').trim();
                multilineValue = [];
            }

            const [key, value] = line.split(':', 2);
            currentKey = key.trim();
            const val = value?.trim();

            if (val && val !== '|') {
                style[currentKey] = val;
                currentKey = null;
            }
        } else if (currentKey) {
            multilineValue.push(line.replace(/^  /, ''));
        }
    }

    // Handle last multiline value
    if (currentKey && multilineValue.length > 0) {
        style[currentKey] = multilineValue.join('\n').trim();
    }

    return style;
}

function getDefaultStyle(role) {
    const defaultStyles = {
        backend: {
            guidelines: 'Backend Development Guidelines:\n- Use TypeScript for all new code\n- Implement comprehensive error handling\n- Follow REST API conventions\n- Include unit tests for all functions',
            format: 'markdown',
            codeStyle: 'clean',
            documentation: true
        },
        frontend: {
            guidelines: 'Frontend Development Guidelines:\n- Use React functional components with hooks\n- Implement responsive design\n- Follow accessibility best practices\n- Use TypeScript for type safety',
            format: 'markdown',
            codeStyle: 'modern',
            documentation: true
        },
        security: {
            guidelines: 'Security Assessment Guidelines:\n- Follow OWASP Top 10 security practices\n- Perform threat modeling\n- Implement security controls\n- Document all security findings',
            format: 'markdown',
            codeStyle: 'secure',
            documentation: true
        }
    };

    return defaultStyles[role] || {
        guidelines: `${role.charAt(0).toUpperCase() + role.slice(1)} Development Guidelines:\n- Follow project coding standards\n- Implement comprehensive error handling\n- Include appropriate documentation\n- Write maintainable, clean code`,
        format: 'markdown',
        codeStyle: 'clean',
        documentation: true
    };
}

export function applyStyle(content, style) {
    if (!style) return content;

    let formatted = content;

    // Add guidelines header if specified
    if (style.guidelines) {
        formatted = `## Development Guidelines\n\n${style.guidelines}\n\n## Implementation\n\n${formatted}`;
    }

    return formatted;
}