export type OpenCodeAgentMode = 'primary' | 'subagent' | 'all';
export type OpenCodePermission = 'allow' | 'deny' | 'ask';

export interface OpenCodeAgentTools {
  write?: boolean;
  edit?: boolean;
  bash?: boolean;
  read?: boolean;
  glob?: boolean;
  grep?: boolean;
  skill?: boolean;
  task?: boolean;
  [key: string]: boolean | undefined;
}

export interface OpenCodeAgentPermissions {
  edit?: OpenCodePermission;
  bash?: OpenCodePermission | Record<string, OpenCodePermission>;
  webfetch?: OpenCodePermission;
  skill?: Record<string, OpenCodePermission>;
  task?: Record<string, OpenCodePermission>;
}

export interface OpenCodeAgentFrontmatter {
  description: string;
  mode?: OpenCodeAgentMode;
  model?: string;
  temperature?: number;
  steps?: number;
  tools?: OpenCodeAgentTools;
  permission?: OpenCodeAgentPermissions;
  hidden?: boolean;
  color?: string;
  top_p?: number;
}

export interface OpenCodeAgent {
  filename: string;
  frontmatter: OpenCodeAgentFrontmatter;
  prompt: string;
  sourceModule?: string;
  sourceBmadAgent?: string;
}

export interface OpenCodeSkillMetadata {
  [key: string]: string;
}

export interface OpenCodeSkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: OpenCodeSkillMetadata;
}

export interface OpenCodeSkill {
  name: string;
  folder: string;
  frontmatter: OpenCodeSkillFrontmatter;
  content: string;
  sourceModule?: string;
  sourceType?: 'agent' | 'workflow' | 'task';
  sourceName?: string;
}

export interface OpenCodeToolArg {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required?: boolean;
}

export interface OpenCodeTool {
  filename: string;
  name: string;
  description: string;
  args: OpenCodeToolArg[];
  executeBody: string;
  sourceModule?: string;
  sourceTask?: string;
}

export interface OpenCodePluginHook {
  event: string;
  handler: string;
}

export interface OpenCodePlugin {
  filename: string;
  name: string;
  hooks: OpenCodePluginHook[];
  sourceModule?: string;
}

export interface OpenCodeConversionResult {
  agents: OpenCodeAgent[];
  skills: OpenCodeSkill[];
  tools: OpenCodeTool[];
  plugins: OpenCodePlugin[];
  warnings: string[];
  errors: string[];
}
