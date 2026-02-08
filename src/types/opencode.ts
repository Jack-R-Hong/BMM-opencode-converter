// OpenCode Type Definitions

export interface OpenCodeAgentFrontmatter {
  description: string;
  mode?: 'subagent' | 'primary' | 'all';
  model?: string;
  temperature?: number;
  steps?: number;
  permission?: {
    edit?: 'allow' | 'deny' | 'ask';
    bash?: Record<string, 'allow' | 'deny' | 'ask'>;
    skill?: Record<string, 'allow' | 'deny' | 'ask'>;
  };
}

export interface OpenCodeAgent {
  name: string;
  frontmatter: OpenCodeAgentFrontmatter;
  systemPrompt: string;
}

export interface OpenCodeSkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
}

export interface OpenCodeSkill {
  name: string;
  frontmatter: OpenCodeSkillFrontmatter;
  content: string;
}

export type ConversionTarget = 'opencode' | 'claude' | 'agents';

export interface ConversionResult {
  agents: OpenCodeAgent[];
  skills: OpenCodeSkill[];
  agentCount: number;
  skillCount: number;
  errors: string[];
}
