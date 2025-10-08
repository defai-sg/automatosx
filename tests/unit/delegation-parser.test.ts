/**
 * Delegation Parser Tests
 *
 * Tests natural language delegation parsing with multiple syntax patterns.
 */

import { describe, it, expect } from 'vitest';
import { DelegationParser } from '../../src/agents/delegation-parser.js';

describe('DelegationParser', () => {
  const parser = new DelegationParser();

  describe('Pattern 1: DELEGATE TO syntax', () => {
    it('should parse "DELEGATE TO frontend: Create login UI"', () => {
      const response = 'I will handle the backend. DELEGATE TO frontend: Create login UI with validation.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toBe('Create login UI with validation.');
    });

    it('should parse multiple DELEGATE TO statements', () => {
      const response = `
        DELEGATE TO frontend: Create UI components.

        DELEGATE TO database: Design schema.
      `;
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(2);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('Create UI components');
      expect(delegations[1]?.toAgent).toBe('database');
      expect(delegations[1]?.task).toContain('Design schema');
    });

    it('should handle case-insensitive DELEGATE TO', () => {
      const response = 'delegate to frontend: Build the UI';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
    });
  });

  describe('Pattern 2: @agent syntax', () => {
    it('should parse "@frontend: Create login UI"', () => {
      const response = 'I will handle auth. @frontend: Create login UI with email/password fields.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('Create login UI');
    });

    it('should parse "@frontend Create login UI" (no colon)', () => {
      const response = 'Let me delegate this. @frontend Create responsive login UI.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('Create responsive login UI');
    });

    it('should parse multiple @agent mentions', () => {
      const response = `
        @frontend Create the UI components.

        @backend: Implement the REST API.
      `;
      const delegations = parser.parse(response, 'coordinator');

      expect(delegations).toHaveLength(2);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[1]?.toAgent).toBe('backend');
    });

    it('should handle agent names with hyphens and underscores', () => {
      const response = '@user-service: Create user profile API. @data_validator Validate inputs.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(2);
      expect(delegations[0]?.toAgent).toBe('user-service');
      expect(delegations[1]?.toAgent).toBe('data_validator');
    });
  });

  describe('Pattern 3: Please/Request/Ask syntax', () => {
    it('should parse "Please ask frontend to create UI"', () => {
      const response = 'Please ask frontend to create a responsive login UI.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('create a responsive login UI');
    });

    it('should parse "Request backend to implement API"', () => {
      const response = 'Request backend to implement authentication API with JWT.';
      const delegations = parser.parse(response, 'coordinator');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('backend');
      expect(delegations[0]?.task).toContain('implement authentication API');
    });

    it('should parse "Request frontend: build UI"', () => {
      const response = 'Request frontend: build the dashboard UI.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('build the dashboard UI');
    });

    it('should handle case-insensitive please/request/ask', () => {
      const response = 'PLEASE ask frontend to create UI. REQUEST backend: implement API.';
      const delegations = parser.parse(response, 'coordinator');

      expect(delegations).toHaveLength(2);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[1]?.toAgent).toBe('backend');
    });
  });

  describe('Pattern 4: I need/require syntax', () => {
    it('should parse "I need frontend to handle UI"', () => {
      const response = 'I need frontend to handle the user interface components.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('handle the user interface');
    });

    it('should parse "I require backend to implement auth"', () => {
      const response = 'I require backend to implement secure authentication.';
      const delegations = parser.parse(response, 'frontend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('backend');
      expect(delegations[0]?.task).toContain('implement secure authentication');
    });
  });

  describe('Pattern 5: Chinese syntax', () => {
    it('should parse "請 frontend 建立登入 UI"', () => {
      const response = '我會處理後端。請 frontend 建立登入 UI 和表單驗證。';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('建立登入 UI');
    });

    it('should parse "委派給 backend：實現 API"', () => {
      const response = '委派給 backend：實現認證 API 和資料庫整合。';
      const delegations = parser.parse(response, 'frontend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('backend');
      expect(delegations[0]?.task).toContain('實現認證 API');
    });

    it('should parse mixed Chinese and English', () => {
      const response = '請 frontend 建立 UI。DELEGATE TO backend: Implement API.';
      const delegations = parser.parse(response, 'coordinator');

      expect(delegations).toHaveLength(2);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[1]?.toAgent).toBe('backend');
    });
  });

  describe('Edge cases', () => {
    it('should skip self-delegation', () => {
      const response = 'DELEGATE TO backend: Handle this task.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(0);
    });

    it('should allow multiple delegations to same agent', () => {
      const response = `
        DELEGATE TO frontend: Create login UI.
        @frontend Build the dashboard.
      `;
      const delegations = parser.parse(response, 'backend');

      // Should keep both delegations to 'frontend'
      expect(delegations).toHaveLength(2);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('Create login UI');
      expect(delegations[1]?.toAgent).toBe('frontend');
      expect(delegations[1]?.task).toContain('Build the dashboard');
    });

    it('should skip tasks that are too short', () => {
      const response = '@frontend: UI';
      const delegations = parser.parse(response, 'backend');

      // Task "UI" is too short (< 5 chars)
      expect(delegations).toHaveLength(0);
    });

    it('should handle empty response', () => {
      const delegations = parser.parse('', 'backend');
      expect(delegations).toHaveLength(0);
    });

    it('should handle response with no delegations', () => {
      const response = 'I will implement this feature myself without delegating.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(0);
    });

    it('should extract originalText for debugging', () => {
      const response = 'DELEGATE TO frontend: Create login UI.';
      const delegations = parser.parse(response, 'backend');

      expect(delegations[0]?.originalText).toBeDefined();
      expect(delegations[0]?.originalText).toContain('DELEGATE TO frontend');
    });

    it('should handle multiple tasks to same agent in order', () => {
      const response = `
        @frontend Create the header component.

        Some intermediate text here.

        @frontend Also create the footer component.

        @frontend And finally create the navigation menu.
      `;
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(3);
      expect(delegations[0]?.task).toContain('header component');
      expect(delegations[1]?.task).toContain('footer component');
      expect(delegations[2]?.task).toContain('navigation menu');

      // All should be to frontend
      delegations.forEach(d => {
        expect(d.toAgent).toBe('frontend');
      });
    });

    it('should handle mixed agents with duplicates', () => {
      const response = `
        @frontend Create UI for login.
        @backend Implement auth API.
        @frontend Create UI for dashboard.
        @database Design user schema.
        @backend Add session management.
      `;
      const delegations = parser.parse(response, 'coordinator');

      expect(delegations).toHaveLength(5);

      // Check order and agents
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('login');

      expect(delegations[1]?.toAgent).toBe('backend');
      expect(delegations[1]?.task).toContain('auth API');

      expect(delegations[2]?.toAgent).toBe('frontend');
      expect(delegations[2]?.task).toContain('dashboard');

      expect(delegations[3]?.toAgent).toBe('database');
      expect(delegations[3]?.task).toContain('user schema');

      expect(delegations[4]?.toAgent).toBe('backend');
      expect(delegations[4]?.task).toContain('session management');
    });
  });

  describe('Complex scenarios', () => {
    it('should parse multi-line tasks', () => {
      const response = `
        DELEGATE TO frontend: Create a responsive login UI with the following requirements:
        - Email and password fields
        - Form validation
        - Error handling
      `;
      const delegations = parser.parse(response, 'backend');

      expect(delegations).toHaveLength(1);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[0]?.task).toContain('Create a responsive login UI');
    });

    it('should handle mixed syntax patterns in same response', () => {
      const response = `
        I'll coordinate the work:

        DELEGATE TO frontend: Create the UI components.

        @backend Implement REST API.

        Please ask database to design the schema.

        I need security to review the authentication flow.
      `;
      const delegations = parser.parse(response, 'coordinator');

      expect(delegations).toHaveLength(4);
      expect(delegations.map(d => d.toAgent)).toEqual(['frontend', 'backend', 'database', 'security']);
    });

    it('should handle delegations in narrative context', () => {
      const response = `
        After analyzing the requirements, I've determined we need specialized help:

        For the user interface, @frontend Create a modern, responsive design with these features:
        - Login form with validation
        - Dashboard layout
        - User profile page

        For the backend, DELEGATE TO backend: Implement secure authentication with JWT and role-based access control.

        For data storage, please ask database to design an optimized schema for user data and sessions.
      `;
      const delegations = parser.parse(response, 'architect');

      expect(delegations).toHaveLength(3);
      expect(delegations[0]?.toAgent).toBe('frontend');
      expect(delegations[1]?.toAgent).toBe('backend');
      expect(delegations[2]?.toAgent).toBe('database');
    });
  });

  describe('Performance', () => {
    it('should parse large responses efficiently', () => {
      // Create a large response with multiple delegations
      const lines = [
        'This is a complex project requiring multiple delegations.',
        '',
        'DELEGATE TO frontend: Create comprehensive UI.',
        '',
        ...Array(100).fill('Some intermediate text here.'),
        '',
        '@backend Implement robust API.',
        '',
        ...Array(100).fill('More intermediate text.'),
        '',
        'Please ask database to optimize queries.'
      ];
      const response = lines.join('\n');

      const startTime = Date.now();
      const delegations = parser.parse(response, 'coordinator');
      const duration = Date.now() - startTime;

      expect(delegations).toHaveLength(3);
      expect(duration).toBeLessThan(10); // Should be < 10ms
    });
  });
});
