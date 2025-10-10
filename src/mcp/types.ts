/**
 * MCP (Model Context Protocol) Type Definitions
 *
 * Defines types for stdio JSON-RPC communication between
 * AutomatosX MCP server and MCP clients (e.g., Claude Code).
 */

// JSON-RPC 2.0 Base Types
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: unknown;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// MCP Protocol Messages
export interface McpInitializeRequest {
  method: 'initialize';
  params: {
    protocolVersion: string;
    capabilities: {
      tools?: Record<string, unknown>;
    };
    clientInfo: {
      name: string;
      version: string;
    };
  };
}

export interface McpInitializeResponse {
  protocolVersion: string;
  capabilities: {
    tools?: Record<string, unknown>;
  };
  serverInfo: {
    name: string;
    version: string;
  };
}

export interface McpToolListRequest {
  method: 'tools/list';
  params?: Record<string, never>;
}

export interface McpToolListResponse {
  tools: McpTool[];
}

export interface McpToolCallRequest {
  method: 'tools/call';
  params: {
    name: string;
    arguments?: Record<string, unknown>;
  };
}

export interface McpToolCallResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Tool-Specific Input/Output Types

// run_agent
export interface RunAgentInput {
  agent: string;
  task: string;
  provider?: 'claude' | 'gemini' | 'openai';
  no_memory?: boolean;
}

export interface RunAgentOutput {
  content: string;
  agent: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs?: number;
}

// list_agents
export interface ListAgentsOutput {
  agents: Array<{
    name: string;
    displayName?: string;
    role?: string;
    team?: string;
  }>;
}

// search_memory
export interface SearchMemoryInput {
  query: string;
  limit?: number;
}

export interface SearchMemoryOutput {
  results: Array<{
    id: number;
    similarity: number;
    content: string;
    metadata: {
      agent?: string;
      timestamp?: string;
      [key: string]: unknown;
    };
  }>;
}

// get_status
export interface GetStatusOutput {
  version: string;
  providers: string[];
  memory: {
    entries: number;
    dbSize?: string;
  };
  sessions: {
    active: number;
    total: number;
  };
}

// ============================================
// Phase 2: Session Management Tools
// ============================================

// session_create
export interface SessionCreateInput {
  name: string;
  agent: string;
}

export interface SessionCreateOutput {
  sessionId: string;
  name: string;
  agent: string;
  status: string;
  createdAt: string;
}

// session_list
export interface SessionListOutput {
  sessions: Array<{
    id: string;
    task: string;
    initiator: string;
    status: string;
    agents: string[];
    createdAt: string;
    updatedAt: string;
  }>;
}

// session_status
export interface SessionStatusInput {
  id: string;
}

export interface SessionStatusOutput {
  id: string;
  task: string;
  initiator: string;
  status: string;
  agents: string[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// session_complete
export interface SessionCompleteInput {
  id: string;
}

export interface SessionCompleteOutput {
  success: boolean;
  sessionId: string;
  status: string;
}

// session_fail
export interface SessionFailInput {
  id: string;
  reason: string;
}

export interface SessionFailOutput {
  success: boolean;
  sessionId: string;
  status: string;
  error: string;
}

// ============================================
// Phase 2: Memory Management Tools
// ============================================

// memory_add
export interface MemoryAddInput {
  content: string;
  metadata?: {
    agent?: string;
    timestamp?: string;
    [key: string]: unknown;
  };
}

export interface MemoryAddOutput {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// memory_list
export interface MemoryListInput {
  agent?: string;
  limit?: number;
}

export interface MemoryListOutput {
  entries: Array<{
    id: number;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: string;
  }>;
  total: number;
}

// memory_delete
export interface MemoryDeleteInput {
  id: number;
}

export interface MemoryDeleteOutput {
  success: boolean;
  id: number;
}

// memory_export
export interface MemoryExportInput {
  path: string;
}

export interface MemoryExportOutput {
  success: boolean;
  path: string;
  entries: number;
}

// memory_import
export interface MemoryImportInput {
  path: string;
}

export interface MemoryImportOutput {
  success: boolean;
  imported: number;
  skipped: number;
}

// memory_stats
export interface MemoryStatsOutput {
  totalEntries: number;
  dbSize: string;
  byAgent: Record<string, number>;
}

// memory_clear
export interface MemoryClearOutput {
  success: boolean;
  deleted: number;
}

// Tool Handler Type
export type ToolHandler<TInput = unknown, TOutput = unknown> = (
  input: TInput
) => Promise<TOutput>;

// Error Codes (align with JSON-RPC standard)
export enum McpErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // Custom error codes (application-specific)
  ToolNotFound = -32001,
  ToolExecutionFailed = -32002,
  InvalidToolInput = -32003,
}
