/**
 * AutomatosX MCP Server
 *
 * Implements stdio JSON-RPC server for Model Context Protocol (MCP).
 * Exposes AutomatosX capabilities as MCP tools for Claude Code and other clients.
 */

import { createInterface } from 'readline';
import { createRequire } from 'module';
import { join } from 'path';
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  McpInitializeRequest,
  McpInitializeResponse,
  McpToolListRequest,
  McpToolListResponse,
  McpToolCallRequest,
  McpToolCallResponse,
  McpTool,
  ToolHandler
} from './types.js';
import { McpErrorCode } from './types.js';
import { logger, setLogLevel } from '../utils/logger.js';
import { loadConfig } from '../core/config.js';
import { Router } from '../core/router.js';
import { MemoryManager } from '../core/memory-manager.js';
import { SessionManager } from '../core/session-manager.js';
import { WorkspaceManager } from '../core/workspace-manager.js';
import { ContextManager } from '../agents/context-manager.js';
import { ProfileLoader } from '../agents/profile-loader.js';
import { AbilitiesManager } from '../agents/abilities-manager.js';
import { TeamManager } from '../core/team-manager.js';
import { PathResolver } from '../core/path-resolver.js';

// Import tool handlers
import { createRunAgentHandler } from './tools/run-agent.js';
import { createListAgentsHandler } from './tools/list-agents.js';
import { createSearchMemoryHandler } from './tools/search-memory.js';
import { createGetStatusHandler } from './tools/get-status.js';

export interface McpServerOptions {
  debug?: boolean;
}

export class McpServer {
  private tools: Map<string, ToolHandler<unknown, unknown>> = new Map();
  private toolSchemas: McpTool[] = [];
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;  // Fix: Race condition prevention
  private version: string;

  // Shared services (initialized once per server)
  private router!: Router;
  private memoryManager!: MemoryManager;
  private sessionManager!: SessionManager;
  private workspaceManager!: WorkspaceManager;
  private contextManager!: ContextManager;
  private profileLoader!: ProfileLoader;

  constructor(options: McpServerOptions = {}) {
    if (options.debug) {
      setLogLevel('debug');
    }

    // Get version
    const require = createRequire(import.meta.url);
    this.version = 'unknown';
    try {
      const versionData = require('../version.json');
      this.version = versionData.version || 'unknown';
    } catch {
      try {
        const packageJson = require('../../package.json');
        this.version = packageJson.version || 'unknown';
      } catch {
        // Keep 'unknown'
      }
    }

    logger.info('[MCP Server] Initializing AutomatosX MCP Server', {
      version: this.version
    });
  }

  /**
   * Initialize shared services once per server process
   */
  private async initializeServices(): Promise<void> {
    logger.info('[MCP Server] Initializing shared services...');

    const projectDir = process.cwd();
    const config = await loadConfig(projectDir);

    // Initialize TeamManager
    const teamManager = new TeamManager(
      join(projectDir, '.automatosx', 'teams')
    );

    // Initialize ProfileLoader
    this.profileLoader = new ProfileLoader(
      join(projectDir, '.automatosx', 'agents'),
      undefined,  // fallbackProfilesDir (uses default)
      teamManager
    );

    // Initialize AbilitiesManager
    const abilitiesManager = new AbilitiesManager(
      join(projectDir, '.automatosx', 'abilities')
    );

    // Initialize MemoryManager
    this.memoryManager = await MemoryManager.create({
      dbPath: join(projectDir, '.automatosx', 'memory', 'memory.db')
    });

    // Initialize PathResolver
    const pathResolver = new PathResolver({
      projectDir,
      workingDir: process.cwd(),
      agentWorkspace: join(projectDir, '.automatosx', 'workspaces')
    });

    // Initialize Providers
    const providers = [];

    if (config.providers['claude-code']?.enabled) {
      const { ClaudeProvider } = await import('../providers/claude-provider.js');
      providers.push(new ClaudeProvider({
        name: 'claude-code',
        enabled: true,
        priority: config.providers['claude-code'].priority,
        timeout: config.providers['claude-code'].timeout,
        command: config.providers['claude-code'].command
      }));
    }

    if (config.providers['gemini-cli']?.enabled) {
      const { GeminiProvider } = await import('../providers/gemini-provider.js');
      providers.push(new GeminiProvider({
        name: 'gemini-cli',
        enabled: true,
        priority: config.providers['gemini-cli'].priority,
        timeout: config.providers['gemini-cli'].timeout,
        command: config.providers['gemini-cli'].command
      }));
    }

    if (config.providers['openai']?.enabled) {
      const { OpenAIProvider } = await import('../providers/openai-provider.js');
      providers.push(new OpenAIProvider({
        name: 'openai',
        enabled: true,
        priority: config.providers['openai'].priority,
        timeout: config.providers['openai'].timeout,
        command: config.providers['openai'].command
      }));
    }

    // Initialize Router
    this.router = new Router({
      providers,
      fallbackEnabled: true
    });

    // Initialize SessionManager
    this.sessionManager = new SessionManager({
      persistencePath: join(projectDir, '.automatosx', 'sessions', 'sessions.json')
    });
    await this.sessionManager.initialize();

    // Initialize WorkspaceManager
    this.workspaceManager = new WorkspaceManager(projectDir);
    await this.workspaceManager.initialize();

    // Initialize ContextManager
    this.contextManager = new ContextManager({
      profileLoader: this.profileLoader,
      abilitiesManager,
      memoryManager: this.memoryManager,
      router: this.router,
      pathResolver,
      sessionManager: this.sessionManager,
      workspaceManager: this.workspaceManager
    });

    logger.info('[MCP Server] Services initialized successfully');
  }

  /**
   * Register Phase 1 tools
   */
  private registerTools(): void {
    logger.info('[MCP Server] Registering tools...');

    // Tool 1: run_agent
    this.tools.set(
      'run_agent',
      createRunAgentHandler({
        contextManager: this.contextManager,
        executorConfig: {
          sessionManager: this.sessionManager,
          workspaceManager: this.workspaceManager,
          contextManager: this.contextManager,
          profileLoader: this.profileLoader
        }
      }) as ToolHandler<unknown, unknown>
    );

    this.toolSchemas.push({
      name: 'run_agent',
      description: 'Execute an AutomatosX agent with a specific task',
      inputSchema: {
        type: 'object',
        properties: {
          agent: {
            type: 'string',
            description: 'The name of the agent to run (e.g., backend, Paris, Bob)'
          },
          task: {
            type: 'string',
            description: 'The task for the agent to perform'
          },
          provider: {
            type: 'string',
            description: 'Optional: Override the AI provider',
            enum: ['claude', 'gemini', 'openai']
          },
          no_memory: {
            type: 'boolean',
            description: 'Optional: Skip memory injection',
            default: false
          }
        },
        required: ['agent', 'task']
      }
    });

    // Tool 2: list_agents
    this.tools.set(
      'list_agents',
      createListAgentsHandler({
        profileLoader: this.profileLoader
      }) as ToolHandler<unknown, unknown>
    );

    this.toolSchemas.push({
      name: 'list_agents',
      description: 'List all available AutomatosX agents',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    // Tool 3: search_memory
    this.tools.set(
      'search_memory',
      createSearchMemoryHandler({
        memoryManager: this.memoryManager
      }) as ToolHandler<unknown, unknown>
    );

    this.toolSchemas.push({
      name: 'search_memory',
      description: 'Search AutomatosX memory for relevant information',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            default: 10
          }
        },
        required: ['query']
      }
    });

    // Tool 4: get_status
    this.tools.set(
      'get_status',
      createGetStatusHandler({
        memoryManager: this.memoryManager,
        sessionManager: this.sessionManager,
        router: this.router
      }) as ToolHandler<unknown, unknown>
    );

    this.toolSchemas.push({
      name: 'get_status',
      description: 'Get AutomatosX system status and configuration',
      inputSchema: {
        type: 'object',
        properties: {}
      }
    });

    logger.info('[MCP Server] Registered tools', {
      count: this.tools.size,
      tools: Array.from(this.tools.keys())
    });
  }

  /**
   * Handle MCP protocol messages
   */
  private async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    const { method, params, id } = request;

    logger.debug('[MCP Server] Handling request', { method, id });

    try {
      // Initialize protocol
      if (method === 'initialize') {
        return await this.handleInitialize(request as McpInitializeRequest, id ?? null);
      }

      // List available tools
      if (method === 'tools/list') {
        return this.handleToolsList(request as McpToolListRequest, id ?? null);
      }

      // Execute tool
      if (method === 'tools/call') {
        return await this.handleToolCall(request as McpToolCallRequest, id ?? null);
      }

      // Method not found
      return this.createErrorResponse(
        id ?? null,
        McpErrorCode.MethodNotFound,
        `Method not found: ${method}`
      );
    } catch (error) {
      logger.error('[MCP Server] Request handling failed', { method, error });
      return this.createErrorResponse(
        id ?? null,
        McpErrorCode.InternalError,
        `Internal error: ${(error as Error).message}`
      );
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(
    request: McpInitializeRequest,
    id: string | number | null
  ): Promise<JsonRpcResponse> {
    logger.info('[MCP Server] Initialize request received', {
      clientInfo: request.params.clientInfo
    });

    // Fix: Prevent race condition in concurrent initialization
    if (!this.initialized) {
      if (!this.initializationPromise) {
        // First initialize request - start initialization
        this.initializationPromise = (async () => {
          await this.initializeServices();
          this.registerTools();
          this.initialized = true;
          logger.info('[MCP Server] Initialization complete');
        })();
      }
      // Wait for initialization to complete (either first or concurrent request)
      await this.initializationPromise;
    }

    const response: McpInitializeResponse = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      serverInfo: {
        name: 'automatosx',
        version: this.version
      }
    };

    return {
      jsonrpc: '2.0',
      id,
      result: response
    };
  }

  /**
   * Handle tools/list request
   */
  private handleToolsList(
    _request: McpToolListRequest,
    id: string | number | null
  ): JsonRpcResponse {
    logger.debug('[MCP Server] Tools list requested');

    // Fix: Check initialization status
    if (!this.initialized) {
      return this.createErrorResponse(
        id,
        McpErrorCode.InternalError,
        'Server not initialized. Please send initialize request first.'
      );
    }

    const response: McpToolListResponse = {
      tools: this.toolSchemas
    };

    return {
      jsonrpc: '2.0',
      id,
      result: response
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleToolCall(
    request: McpToolCallRequest,
    id: string | number | null
  ): Promise<JsonRpcResponse> {
    const { name, arguments: args } = request.params;

    logger.info('[MCP Server] Tool call', { tool: name });

    // Fix: Check initialization status
    if (!this.initialized) {
      return this.createErrorResponse(
        id,
        McpErrorCode.InternalError,
        'Server not initialized. Please send initialize request first.'
      );
    }

    const handler = this.tools.get(name);
    if (!handler) {
      return this.createErrorResponse(
        id,
        McpErrorCode.ToolNotFound,
        `Tool not found: ${name}`
      );
    }

    try {
      const result = await handler(args || {});

      const response: McpToolCallResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };

      return {
        jsonrpc: '2.0',
        id,
        result: response
      };
    } catch (error) {
      logger.error('[MCP Server] Tool execution failed', { tool: name, error });

      const response: McpToolCallResponse = {
        content: [
          {
            type: 'text',
            text: `Error: ${(error as Error).message}`
          }
        ],
        isError: true
      };

      return {
        jsonrpc: '2.0',
        id,
        result: response
      };
    }
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    id: string | number | null,
    code: McpErrorCode,
    message: string
  ): JsonRpcResponse {
    const error: JsonRpcError = {
      code,
      message
    };

    return {
      jsonrpc: '2.0',
      id,
      error
    };
  }

  /**
   * Start stdio server
   */
  async start(): Promise<void> {
    logger.info('[MCP Server] Starting stdio JSON-RPC server...');

    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });

    rl.on('line', async (line) => {
      try {
        const request = JSON.parse(line) as JsonRpcRequest;
        const response = await this.handleRequest(request);

        // Write response to stdout
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        logger.error('[MCP Server] Failed to parse request', { line, error });

        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: McpErrorCode.ParseError,
            message: 'Parse error: Invalid JSON'
          }
        };

        process.stdout.write(JSON.stringify(errorResponse) + '\n');
      }
    });

    rl.on('close', () => {
      logger.info('[MCP Server] Server stopped');
      process.exit(0);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('[MCP Server] Received SIGINT, shutting down...');
      rl.close();
    });

    process.on('SIGTERM', () => {
      logger.info('[MCP Server] Received SIGTERM, shutting down...');
      rl.close();
    });

    logger.info('[MCP Server] Server started successfully');
  }
}
