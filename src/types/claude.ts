/**
 * Claude Code Type Definitions
 * Target format for .claude/ output
 */

// ============================================================================
// Claude Agent Types
// ============================================================================

export type ClaudeCodeModel = 'sonnet' | 'opus' | 'haiku' | 'inherit';
export type ClaudeCodePermissionMode = 'default' | 'allowAll' | 'denyAll';

export interface ClaudeCodeAgentFrontmatter {
  name: string;
  description: string;
  tools?: string; // comma-separated: "Read, Write, Edit, Bash, Glob, Grep"
  disallowedTools?: string; // comma-separated
  model?: ClaudeCodeModel;
  permissionMode?: ClaudeCodePermissionMode;
  maxTurns?: number;
  skills?: string[]; // skill references
}

export interface ClaudeCodeAgent {
  filename: string;
  frontmatter: ClaudeCodeAgentFrontmatter;
  prompt: string;
  sourceModule?: string;
  sourceBmadAgent?: string;
}

// ============================================================================
// Claude Skill Types
// ============================================================================

export interface ClaudeCodeSkillFrontmatter {
  name: string;
  description: string;
  'allowed-tools'?: string; // comma-separated
  'user-invocable'?: boolean;
  'disable-model-invocation'?: boolean;
  'argument-hint'?: string;
  context?: {
    fork?: boolean;
  };
  agent?: string;
}

export interface ClaudeCodeSkill {
  name: string;
  folder: string;
  frontmatter: ClaudeCodeSkillFrontmatter;
  content: string;
  sourceModule?: string;
  sourceType?: 'agent' | 'workflow' | 'task';
  sourceName?: string;
}

// ============================================================================
// Conversion Result
// ============================================================================

export interface ClaudeCodeConversionResult {
  agents: ClaudeCodeAgent[];
  skills: ClaudeCodeSkill[];
  warnings: string[];
  errors: string[];
}


