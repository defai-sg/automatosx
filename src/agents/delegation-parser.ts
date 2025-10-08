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
  /**
   * Parse delegation requests from agent response
   *
   * @param response - Agent response text
   * @param fromAgent - Agent name (for logging)
   * @returns Array of parsed delegations
   *
   * @example
   * ```typescript
   * const parser = new DelegationParser();
   * const delegations = parser.parse(
   *   "I'll handle the backend. @frontend Create the login UI with validation.",
   *   "backend"
   * );
   * // Returns: [{ toAgent: "frontend", task: "Create the login UI with validation." }]
   * ```
   */
  parse(response: string, fromAgent: string): ParsedDelegation[] {
    const delegations: Array<ParsedDelegation & { position: number }> = [];

    // Pattern 1: DELEGATE TO [agent]: [task]
    // Example: "DELEGATE TO frontend: Create login UI"
    // Priority: High (most explicit)
    const pattern1 = /DELEGATE\s+TO\s+([a-zA-Z0-9-_]+)\s*:\s*(.+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|$)/gis;
    this.extractMatches(pattern1, response, fromAgent, delegations, 'DELEGATE TO');

    // Pattern 2a: @[agent]: [task]
    // Example: "@frontend: Create login UI"
    // Priority: High (explicit with colon)
    const pattern2a = /@([a-zA-Z0-9-_]+)\s*:\s+(.+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|$)/gis;
    this.extractMatches(pattern2a, response, fromAgent, delegations, '@agent:');

    // Pattern 2b: @[agent] [task] (no colon after agent name)
    // Example: "@frontend Create login UI"
    // Priority: Medium (less explicit, may have false positives)
    // Match task until: sentence end (.!?:) + newline, next delegation pattern, or end
    const pattern2b = /@([a-zA-Z0-9-_]+)\s+([A-Z][^\n]+?)(?:[.!?:]\s*(?=\n)|(?=\nDELEGATE\s+TO)|(?=\n\s*@[\w-]+)|(?=\n\s*請\s+[\w-]+)|(?=\n\s*委派給)|$)/gs;
    this.extractMatches(pattern2b, response, fromAgent, delegations, '@agent');

    // Pattern 3a: Please/Request/Ask [agent] to [task]
    // Example: "Please ask frontend to create login UI"
    // Priority: Medium
    const pattern3a = /(?:please|request|ask)\s+([a-zA-Z0-9-_]+)\s+to\s+(.+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|please|request|ask|$)/gis;
    this.extractMatches(pattern3a, response, fromAgent, delegations, 'please/request/ask');

    // Pattern 3b: Please/Request [agent]: [task]
    // Example: "Request frontend: create login UI"
    // Priority: Medium
    const pattern3b = /(?:please|request)\s+([a-zA-Z0-9-_]+)\s*:\s*(.+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|please|request|$)/gis;
    this.extractMatches(pattern3b, response, fromAgent, delegations, 'please/request:');

    // Pattern 4: I need/require [agent] to [task]
    // Example: "I need frontend to handle the UI"
    // Priority: Medium
    const pattern4 = /I\s+(?:need|require)\s+([a-zA-Z0-9-_]+)\s+to\s+(.+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|I\s+(?:need|require)|$)/gis;
    this.extractMatches(pattern4, response, fromAgent, delegations, 'I need/require');

    // Pattern 5a: 請 [agent] [task]
    // Example: "請 frontend 建立登入 UI"
    // Priority: High (Chinese explicit)
    const pattern5a = /請\s+([a-zA-Z0-9-_]+)\s+([^\n@請委派]+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|$)/gs;
    this.extractMatches(pattern5a, response, fromAgent, delegations, '請');

    // Pattern 5b: 委派給 [agent]：[task] or 委派給 [agent] [task]
    // Example: "委派給 backend：實現 API"
    // Priority: High (Chinese formal)
    const pattern5b = /委派給\s+([a-zA-Z0-9-_]+)\s*[：:]\s*(.+?)(?=\n\n|DELEGATE\s+TO|@[\w-]+|請\s+[\w-]+|委派給|$)/gs;
    this.extractMatches(pattern5b, response, fromAgent, delegations, '委派給');

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
  private extractMatches(
    pattern: RegExp,
    response: string,
    fromAgent: string,
    delegations: Array<ParsedDelegation & { position: number }>,
    patternName: string
  ): void {
    let match;
    while ((match = pattern.exec(response)) !== null) {
      const toAgent = match[1]?.trim();
      const task = match[2]?.trim();

      // Validate extracted values
      if (!toAgent || !task) {
        continue;
      }

      // Skip if task is too short (likely false positive)
      if (task.length < 5) {
        continue;
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
}
