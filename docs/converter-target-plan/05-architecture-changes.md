## 5. Architecture Changes

### 5.1 New Files

```
src/
├── types/
│   └── claude.ts                          # NEW: Claude Code types
├── converters/
│   └── claude/
│       ├── claude-agent-converter.ts      # NEW: BMAD Agent → Claude agent + skill
│       ├── claude-workflow-converter.ts    # NEW: BMAD Workflow → Claude skill
│       ├── claude-task-converter.ts        # NEW: BMAD Task → Claude skill
│       └── index.ts                       # NEW: Re-exports
└── writers/
    ├── agents-writer.ts                   # NEW: Write .agents/ output files (cross-IDE)
    └── claude-writer.ts                   # NEW: Write .claude/ output files
```

### 5.2 Modified Files

| File | Change |
|------|--------|
| `src/converter.ts` | Add `ConversionTarget` param, route to opencode/claude converters+writers |
| `src/cli.ts` | Add `--target` / `-t` flag (`opencode` \| `claude` \| `agents`, default: `opencode`) |
| `src/types/index.ts` | Re-export claude types |
| `src/converters/index.ts` | Re-export claude converters |
| `src/index.ts` | Re-export new modules |

### 5.3 Type Definitions (`src/types/opencode.ts` — updated)

```typescript
export interface OpenCodeAgentFrontmatter {
  description: string
  mode?: 'primary' | 'subagent' | 'all'
  model?: string
  temperature?: number
  steps?: number
  tools?: Record<string, boolean>
  permission?: Record<string, unknown>
  skills?: string[]                       // NEW: owned skill names from BMAD <menu>
  hidden?: boolean
  color?: string
  top_p?: number
}
```

### 5.4 Type Definitions (`src/types/claude.ts`)

```typescript
export interface ClaudeCodeAgentFrontmatter {
  name: string
  description: string
  tools?: string                    // "Read, Write, Edit, Bash, Glob, Grep"
  disallowedTools?: string
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit'
  permissionMode?: 'default' | 'acceptEdits' | 'delegate' | 'dontAsk' | 'bypassPermissions' | 'plan'
  maxTurns?: number
  skills?: string[]
}

export interface ClaudeCodeAgent {
  filename: string                  // {module}-{name}.md
  frontmatter: ClaudeCodeAgentFrontmatter
  prompt: string
  sourceModule: string
  sourceBmadAgent: string
}

export interface ClaudeCodeSkillFrontmatter {
  name: string
  description: string
  'allowed-tools'?: string
  model?: string
  'argument-hint'?: string
  'disable-model-invocation'?: boolean
  'user-invocable'?: boolean
  context?: 'fork'
  agent?: string
}

export interface ClaudeCodeSkill {
  name: string
  folder: string
  frontmatter: ClaudeCodeSkillFrontmatter
  content: string
  sourceModule: string
  sourceType: 'agent' | 'workflow' | 'task'
  sourceName: string
}

export interface ClaudeCodeConversionResult {
  agents: ClaudeCodeAgent[]
  skills: ClaudeCodeSkill[]
  warnings: string[]
  errors: string[]
}
```

### 5.5 Converter Entry Point Changes

```typescript
// src/converter.ts
export type ConversionTarget = 'opencode' | 'claude' | 'agents'

export interface ConvertOptions {
  target?: ConversionTarget   // default: 'opencode'
  verbose?: boolean
}

export async function convert(
  sourceDir: string,
  outputDir: string,
  options?: ConvertOptions
): Promise<OpenCodeConversionResult | ClaudeCodeConversionResult>
```

### 5.6 CLI Changes

```
bmad-convert --source ./_bmad --output ./ --target claude    # → .claude/agents/ + .claude/skills/
bmad-convert -s ./_bmad -o ./ -t opencode                    # → .agents/agents/ + .agents/skills/ (default)
bmad-convert -s ./_bmad -o ./ -t agents                      # → .agents/agents/ + .agents/skills/ (alias)
bmad-convert -s ./_bmad -o ./                                 # default = opencode
```

### 5.7 Agent-Skill Ownership Map

The converter parses BMAD agent `<menu>` items to extract `exec=` and `workflow=` attributes, building a `skills[]` array for each agent's frontmatter.

**Parsing logic:**
1. Read each agent's `<menu>` block from the BMAD source file
2. For each `<item>` with an `exec=` or `workflow=` attribute, extract the referenced workflow/task name
3. Map the workflow/task name to its converted skill name (e.g., `create-prd` → `bmad-bmm-create-prd`)
4. Include `bmad-core-party-mode` for all agents (universal shared workflow)
5. For `bmad-master`, also include all core task skills (help, index-docs, shard-doc, etc.)
6. Populate the agent frontmatter `skills:` array with the resulting list

**Output example (OpenCode agent frontmatter):**
```yaml
---
description: "Product Manager"
mode: subagent
skills:
  - bmad-bmm-create-prd
  - bmad-bmm-validate-prd
  - bmad-bmm-edit-prd
  - bmad-bmm-create-epics-and-stories
  - bmad-bmm-check-implementation-readiness
  - bmad-bmm-correct-course
  - bmad-core-party-mode
tools:
  write: true
  edit: true
  bash: true
---
```
