/**
 * Delegation Parser - Natural language delegation parsing
 *
 * Parses natural language delegation requests from agent responses.
 * Supports multiple syntaxes for flexibility while maintaining precision.
 *
 * @module agents/delegation-parser
 * @since v4.7.2
 */

import { logger } from '../utils/logger.js';
import type { ProfileLoader } from './profile-loader.js';

/**
 * Parsed delegation instruction
 */
export interface ParsedDelegation {
  /** Target agent name */
  toAgent: string;

  /** Task description */
  task: string;

  /** Original matched text (for debugging) */
  originalText?: string;
}

/**
 * Delegation Parser
 *
 * Extracts delegation requests from agent response text using multiple patterns.
 * Supports both agent names and display names (e.g., @oliver or @devops).
 *
 * Supported syntaxes:
 * 1. `DELEGATE TO frontend: Create login UI` (explicit, backward-compatible)
 * 2. `@frontend Create login UI` (concise)
 * 3. `@frontend: Create login UI` (with colon separator)
 * 4. `Please ask frontend to create login UI` (polite request)
 * 5. `I need frontend to handle auth` (need expression)
 * 6. `請 frontend 建立登入 UI` (Chinese support)
 * 7. `委派給 backend：實現 API` (Chinese formal)
 *
 * Performance: < 1ms per parse (regex-based, no LLM calls)
 */
export class DelegationParser {
  private profileLoader?: ProfileLoader;

  /**
   * Create delegation parser with optional ProfileLoader for display name resolution
   *
   * @param profileLoader - Optional ProfileLoader for resolving display names to agent names
   */
  constructor(profileLoader?: ProfileLoader) {
    this.profileLoader = profileLoader;
  }

  /**
   * Parse delegation requests from agent response
   *
   * @param response - Agent response text
   * @param fromAgent - Agent name (for logging)
   * @returns Array of parsed delegations
   *
   * @example
   * ```typescript
   * const parser = new DelegationParser(profileLoader);
   * const delegations = await parser.parse(
   *   "I'll handle the backend. @Oliver Create the login UI with validation.",
   *   "backend"
   * );
   * // Returns: [{ toAgent: "devops", task: "Create the login UI with validation." }]
   * // (Oliver is display name for devops agent)
   * ```
   */
  async parse(response: string, fromAgent: string): Promise<ParsedDelegation[]> {
    const delegations: Array<ParsedDelegation & { position: number }> = [];

    // Pattern 1: DELEGATE TO [agent]: [task]
    // Example: "DELEGATE TO frontend: Create login UI"
    // Priority: High (most explicit)
    const pattern1 = /DELEGATE\s+TO\s+([a-zA-Z0-9-_]+)\s*:\s*(.+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|$)/gis;
    await this.extractMatches(pattern1, response, fromAgent, delegations, 'DELEGATE TO');

    // Pattern 2a: @[agent]: [task]
    // Example: "@frontend: Create login UI"
    // Priority: High (explicit with colon)
    const pattern2a = /@([a-zA-Z0-9-_]+)\s*:\s+(.+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|$)/gis;
    await this.extractMatches(pattern2a, response, fromAgent, delegations, '@agent:');

    // Pattern 2b: @[agent] [task] (no colon after agent name)
    // Example: "@frontend Create login UI" or "@coder 請檢視程式碼"
    // Priority: Medium (less explicit, may have false positives)
    // Match task until: double newline, next delegation pattern, or end
    // Support both English (uppercase start) and Chinese/other languages
    // Supports multi-line tasks (e.g., bullet points)
    const pattern2b = /@([a-zA-Z0-9-_]+)\s+([A-Z\u4e00-\u9fff\u3400-\u4dbf][\s\S]+?)(?:\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|$)/gs;
    await this.extractMatches(pattern2b, response, fromAgent, delegations, '@agent');

    // Pattern 3a: Please/Request/Ask [agent] to [task]
    // Example: "Please ask frontend to create login UI"
    // Priority: Medium
    const pattern3a = /(?:please|request|ask)\s+([a-zA-Z0-9-_]+)\s+to\s+(.+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|(?=\n\s*(?:please|request|ask))|$)/gis;
    await this.extractMatches(pattern3a, response, fromAgent, delegations, 'please/request/ask');

    // Pattern 3b: Please/Request [agent]: [task]
    // Example: "Request frontend: create login UI"
    // Priority: Medium
    const pattern3b = /(?:please|request)\s+([a-zA-Z0-9-_]+)\s*:\s*(.+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|(?=\n\s*(?:please|request))|$)/gis;
    await this.extractMatches(pattern3b, response, fromAgent, delegations, 'please/request:');

    // Pattern 4: I need/require [agent] to [task]
    // Example: "I need frontend to handle the UI"
    // Priority: Medium
    const pattern4 = /I\s+(?:need|require)\s+([a-zA-Z0-9-_]+)\s+to\s+(.+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|(?=\n\s*I\s+(?:need|require))|$)/gis;
    await this.extractMatches(pattern4, response, fromAgent, delegations, 'I need/require');

    // Pattern 5a: 請 [agent] [task]
    // Example: "請 frontend 建立登入 UI"
    // Priority: High (Chinese explicit)
    const pattern5a = /請\s+([a-zA-Z0-9-_]+)\s+([^\n@請委派]+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|$)/gs;
    await this.extractMatches(pattern5a, response, fromAgent, delegations, '請');

    // Pattern 5b: 委派給 [agent]：[task] or 委派給 [agent] [task]
    // Example: "委派給 backend：實現 API"
    // Priority: High (Chinese formal)
    const pattern5b = /委派給\s+([a-zA-Z0-9-_]+)\s*[：:]\s*(.+?)(?=\n\n|(?=\n\s*DELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|$)/gs;
    await this.extractMatches(pattern5b, response, fromAgent, delegations, '委派給');

    // Sort by position in text (ascending)
    delegations.sort((a, b) => a.position - b.position);

    // Remove position field before returning
    const result = delegations.map(({ position, ...rest }) => rest);

    logger.info(`Parsed ${delegations.length} delegation(s)`, {
      fromAgent,
      delegations: result.map(d => ({ toAgent: d.toAgent, taskPreview: d.task.substring(0, 50) }))
    });

    return result;
  }

  /**
   * Extract matches from a regex pattern
   *
   * @private
   */
  private async extractMatches(
    pattern: RegExp,
    response: string,
    fromAgent: string,
    delegations: Array<ParsedDelegation & { position: number }>,
    patternName: string
  ): Promise<void> {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      let toAgent = match[1]?.trim();
      const task = match[2]?.trim();

      // Validate extracted values
      if (!toAgent || !task) {
        continue;
      }

      // Skip if task is too short (likely false positive)
      if (task.length < 5) {
        continue;
      }

      // Skip JSDoc annotations (e.g., @returns, @param)
      if (this.isJSDocAnnotation(response, match.index)) {
        logger.debug('Skipping JSDoc annotation', { toAgent, position: match.index });
        continue;
      }

      // Skip if in code block (between ``` or `)
      if (this.isInCodeBlock(response, match.index)) {
        logger.debug('Skipping code block', { toAgent, position: match.index });
        continue;
      }

      // Resolve agent name (supports display names like "Oliver" → "devops")
      if (this.profileLoader) {
        try {
          const resolvedName = await this.profileLoader.resolveAgentName(toAgent);
          if (resolvedName !== toAgent) {
            logger.debug('Resolved display name to agent name', {
              displayName: toAgent,
              agentName: resolvedName
            });
            toAgent = resolvedName;
          }
        } catch (error) {
          // Agent not found - skip this delegation
          logger.warn('Agent not found, skipping delegation', {
            agentIdentifier: toAgent,
            fromAgent,
            error: error instanceof Error ? error.message : String(error)
          });
          continue;
        }
      }

      // Skip if delegating to self
      if (toAgent.toLowerCase() === fromAgent.toLowerCase()) {
        logger.warn('Skipping self-delegation', { fromAgent, toAgent });
        continue;
      }

      // Allow multiple delegations to the same agent (removed deduplication)
      delegations.push({
        toAgent,
        task,
        originalText: match[0],
        position: match.index // Track position in text
      });

      logger.debug('Delegation extracted', {
        pattern: patternName,
        fromAgent,
        toAgent,
        taskPreview: task.substring(0, 100),
        originalText: match[0]?.substring(0, 100),
        position: match.index
      });
    }
  }

  /**
   * Validate if a string looks like a valid agent name
   *
   * @private
   */
  private isValidAgentName(name: string): boolean {
    // Agent names should be alphanumeric with hyphens/underscores
    // 3-50 characters
    return /^[a-zA-Z0-9-_]{3,50}$/.test(name);
  }

  /**
   * Check if position is within a JSDoc comment block
   *
   * @private
   */
  private isJSDocAnnotation(text: string, position: number): boolean {
    // Get context before the match (up to 100 chars)
    const before = text.substring(Math.max(0, position - 100), position);

    // Check if preceded by JSDoc comment patterns
    // Common patterns: " * @", "* @", " *@"
    if (/[*\s]+@\w+\s*$/.test(before)) {
      return true;
    }

    // Check if within a JSDoc block (/** ... */)
    const beforeFull = text.substring(0, position);
    const lastJSDocStart = beforeFull.lastIndexOf('/**');
    const lastJSDocEnd = beforeFull.lastIndexOf('*/');

    if (lastJSDocStart > lastJSDocEnd) {
      // Inside JSDoc block
      return true;
    }

    return false;
  }

  /**
   * Check if position is within a code block (between ``` or `)
   *
   * @private
   */
  private isInCodeBlock(text: string, position: number): boolean {
    const before = text.substring(0, position);

    // Check for triple backticks (```) - count should be even if not in block
    const tripleBacktickCount = (before.match(/```/g) || []).length;
    if (tripleBacktickCount % 2 === 1) {
      return true; // Inside ``` code block
    }

    // Check for inline code (`) - more complex due to single backticks
    // Only check if not in triple backtick block
    const lines = before.split('\n');
    const currentLine = lines[lines.length - 1] || '';
    const singleBacktickCount = (currentLine.match(/`/g) || []).length;

    if (singleBacktickCount % 2 === 1) {
      return true; // Inside inline code on current line
    }

    return false;
  }
}
