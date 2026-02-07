# Converter Target Plan: Add Claude Code Output

## 1. Goal

Extend `bmad-opencode-converter` to support **three conversion targets**:

| Target | Output Dir | Notes |
|--------|-----------|-------|
| `opencode` | `.agents/` | Cross-IDE compatible (default) |
| `claude` | `.claude/` | Claude Code native format |
| `agents` | `.agents/` | **Cross-IDE compatible** — discovered by both OpenCode and Claude Code |

Output self-contained agents and skills using modern formats — no legacy `.claude/commands/`, no runtime `_bmad/` file references.

**Key architecture change**: Each agent's frontmatter includes a `skills:` array linking it to its owned workflows/tasks (extracted from BMAD `<menu>` items). This enables IDE auto-loading of relevant skills when an agent is activated.

## 1.1 Reference Documents

- [OpenCode Rules](https://opencode.ai/docs/rules/) — AGENTS.md, instruction loading
- [OpenCode Agents](https://opencode.ai/docs/agents/) — Agent frontmatter, modes, tool booleans
- [OpenCode Skills](https://opencode.ai/docs/skills/) — Skill frontmatter, name rules, discovery
- [OpenCode Permissions](https://opencode.ai/docs/permissions/) — Permission model, granular syntax
- [Claude Code Skills](https://docs.anthropic.com/en/docs/claude-code/skills) — Skill frontmatter, context: fork, allowed-tools
- [Claude Code Sub-agents](https://docs.anthropic.com/en/docs/claude-code/sub-agents) — Agent frontmatter, tools, maxTurns, permissionMode
- [Claude Code Memory](https://docs.anthropic.com/en/docs/claude-code/memory) — CLAUDE.md, rules/, imports
- [BMAD Method Full Docs](https://docs.bmad-method.org/llms-full.txt) — Module structure, installation, IDE integration

## 1.2 BMAD Installation Context

The official `npx bmad-method install` creates:

```
_bmad/                    # Source modules (core, bmm, cis, tea, bmb)
_bmad-output/             # Generated artifacts (PRD, architecture, epics, sprint-status)
.claude/commands/         # IDE integration (lightweight pointers → _bmad/ sources)
```

**Existing Claude Code pattern** (legacy `commands/`): Small .md files that LOAD `_bmad/` source files at runtime:
```
IT IS CRITICAL THAT YOU FOLLOW THIS COMMAND: LOAD the FULL @{project-root}/_bmad/bmm/workflows/.../workflow.md
```

**Our converter pattern** (modern `agents/` + `skills/`): Self-contained .md files with all content embedded — no runtime `_bmad/` dependency. This is a deliberate departure from the official installer's approach, trading file size for portability and compatibility with the modern Claude Code format.

### BMAD Module Structure (source input)
```
_bmad/
├── _config/              # Agent customization .yaml files
├── core/                 # Universal core framework (bmad-master, brainstorming, workflow.xml)
├── bmm/                  # BMad Method (agents, workflows across 4 phases, data, _memory)
├── cis/                  # Creative Intelligence Suite (brainstorming-coach, storyteller, etc.)
├── tea/                  # Test Engineering Architecture (test architect agent + workflows)
└── bmb/                  # BMad Builder (agent/workflow/module builder workflows)
```

### BMAD Workflow Phases
| Phase | Key Workflows | Module |
|-------|---------------|--------|
| 1-Analysis | brainstorming, research (market/domain/technical), create-product-brief | bmm, core |
| 2-Planning | create-prd, edit-prd, validate-prd, quick-spec, create-ux-design | bmm |
| 3-Solutioning | create-architecture, create-epics-and-stories, check-implementation-readiness | bmm |
| 4-Implementation | sprint-planning, create-story, dev-story, code-review, qa-automate, retrospective | bmm |

### BMAD Agent Customization
- `.customize.yaml` in `_config/agents/` can override: name, persona (role/identity/style/principles), memories, menu items
- Persona section REPLACES entirely (not merged) — converter must handle customized agents identically to defaults

---

## 2. Authoritative Format Specifications

### 2.1 OpenCode Agent (`.agents/agents/{name}.md`)

> **Discovery path**: OpenCode discovers agents/skills from `.opencode/`, `.claude/`, and `.agents/`. The converter uses `.agents/` for the `opencode` target to enable cross-IDE compatibility.

```yaml
---
description: Brief description                    # required
mode: primary | subagent | all                     # default: all
model: provider/model-id                           # optional
temperature: 0.0-1.0                               # optional
steps: N                                           # optional, max agentic iterations
prompt: "{file:./path}"                            # optional, external prompt file
tools:                                             # optional, boolean map
  write: true/false
  edit: true/false
  bash: true/false
  read: true/false
  glob: true/false
  grep: true/false
  skill: true/false
  task: true/false
  mymcp_*: true/false                              # wildcard support
permission:                                        # optional, granular object syntax
  edit: allow/ask/deny
  bash:
    "*": ask
    "git diff": allow
skills:                                            # optional, array of owned skill names
  - bmad-bmm-create-prd
hidden: true/false                                 # subagent only
color: "#hex"                                      # optional
top_p: 0.0-1.0                                     # optional
---

Prompt body in markdown
```

### 2.2 OpenCode Skill (`.agents/skills/{name}/SKILL.md`)

```yaml
---
name: my-skill          # required, 1-64 chars, ^[a-z0-9]+(-[a-z0-9]+)*$
description: What it does  # required, 1-1024 chars
license: MIT               # optional
compatibility: opencode    # optional
metadata:                  # optional, string-to-string map
  source: agent
  module: bmm
---

Markdown instructions content
```

### 2.3 Claude Code Agent (`.claude/agents/{name}.md`)

```yaml
---
name: code-reviewer                    # required, lowercase+hyphens
description: Reviews code quality      # required
tools: Read, Glob, Grep, Bash          # optional, comma-separated allowlist
disallowedTools: Write                 # optional, comma-separated denylist
model: sonnet | opus | haiku | inherit # optional, default: inherit
permissionMode: default                # optional: default, acceptEdits, delegate, dontAsk, bypassPermissions, plan
maxTurns: 10                           # optional, max agentic iterations
skills:                                # optional, array of skill names to preload
  - my-skill
mcpServers: {}                         # optional, MCP server configs
hooks: {}                              # optional, lifecycle hooks
memory: {}                             # optional, persistent memory config
---

Markdown system prompt body
```

**Key behaviors:**
- Subagents receive ONLY this prompt + basic env, NOT the full Claude Code system prompt
- Cannot spawn other subagents
- Can run foreground (blocking) or background (concurrent)
- Filename = agent name (e.g., `review.md` → `review` agent)

### 2.4 Claude Code Skill (`.claude/skills/{name}/SKILL.md`)

```yaml
---
name: my-skill                        # optional, defaults to directory name
description: What it does             # recommended
argument-hint: "[issue-number]"       # optional, autocomplete hint
disable-model-invocation: true/false  # optional, default false (true = manual-only)
user-invocable: true/false            # optional, default true (false = Claude-only)
allowed-tools: Read, Grep             # optional, tool whitelist when active
model: model-id                       # optional, model override
context: fork                         # optional, runs in forked subagent
agent: Explore                        # optional, subagent type when context: fork
hooks: {}                             # optional, lifecycle hooks
---

Markdown instructions content
```

**Key features:**
- String substitutions: `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `${CLAUDE_SESSION_ID}`
- Dynamic context: `` !`command` `` preprocesses shell output
- `context: fork` runs in isolated subagent (skill content = prompt)
- Supporting files in subdirs (template.md, examples/, scripts/)
- Keep SKILL.md under 500 lines, move reference material to separate files

---

## 3. Format Mapping: OpenCode → Claude Code

### 3.1 Agent Frontmatter Mapping

| OpenCode | Claude Code | Transform |
|----------|-------------|-----------|
| `description` | `description` | Direct copy |
| `mode: subagent` | _(implicit, all agents are subagents)_ | Drop field |
| `model: provider/model-id` | `model: sonnet\|opus\|haiku\|inherit` | Extract model family or use `inherit` |
| `temperature` | _(not supported)_ | Drop |
| `steps: N` | `maxTurns: N` | Rename |
| `tools: { write: true, edit: true, ... }` | `tools: Write, Edit, ...` | Boolean map → comma-separated truthy keys, capitalize first letter |
| `permission: { ... }` | `permissionMode: default` | Simplify to mode enum |
| `hidden: true` | _(not a field)_ | Drop |
| `color` | _(not supported)_ | Drop |
| `top_p` | _(not supported)_ | Drop |
| `skills: [...]` | `skills: [...]` | Populated from BMAD `<menu>` exec/workflow attributes; maps agent to its owned workflows/tasks as skill names |
| _(N/A)_ | `disallowedTools` | Not needed from BMAD |

### 3.2 Skill Frontmatter Mapping

| OpenCode | Claude Code | Transform |
|----------|-------------|-----------|
| `name` | `name` | Direct copy |
| `description` | `description` | Direct copy |
| `license` | _(not supported)_ | Drop |
| `compatibility: opencode` | _(not needed)_ | Drop |
| `metadata.source` | _(not supported)_ | Drop |
| `metadata.module` | _(not supported)_ | Drop |
| `metadata.standalone: true` | `user-invocable: true` | Rename concept |
| _(N/A)_ | `allowed-tools` | Map from BMAD workflow needs |
| _(N/A)_ | `argument-hint` | Not from BMAD |
| _(N/A)_ | `context: fork` | For agent-derived skills |
| _(N/A)_ | `agent` | For agent-derived skills |
| _(N/A)_ | `disable-model-invocation` | Default false |

### 3.3 Tool Name Mapping

| OpenCode Tool Key | Claude Code Tool Name |
|-------------------|-----------------------|
| `read` | `Read` |
| `write` | `Write` |
| `edit` | `Edit` |
| `bash` | `Bash` |
| `glob` | `Glob` |
| `grep` | `Grep` |
| `skill` | `Skill` (if applicable) |
| `task` | `Task` |

Transform: capitalize first letter of OpenCode key.

---

## 4. BMAD → Target Conversion Matrix

### 4.1 Output Directory by Target

| Target | Agents Dir | Skills Dir |
|--------|-----------|------------|
| `opencode` | `.agents/agents/` | `.agents/skills/` |
| `claude` | `.claude/agents/` | `.claude/skills/` |
| `agents` | `.agents/agents/` | `.agents/skills/` |

> **`.agents/`** is a cross-IDE path: OpenCode discovers `.agents/skills/*/SKILL.md` natively. Claude Code does **not** auto-discover `.agents/`, but this target is useful for shared/vendored skill libraries.

### 4.2 BMAD Agent

| Output | OpenCode | Claude Code | Agents (cross-IDE) |
|--------|----------|-------------|---------------------|
| Agent file | `{outDir}/agents/{module}-{name}.md` | same path pattern | same path pattern |
| Skill file | `{outDir}/skills/bmad-{module}-{name}/SKILL.md` | same | same |
| Agent prompt | Persona sections as markdown | Same content | Same content |
| Agent tools | `tools: { write: true, ... }` (boolean map) | `tools: Read, Write, ...` (comma-sep) | Same as OpenCode |
| Agent mode | `mode: subagent` | _(implicit)_ | `mode: subagent` |
| **Agent skills** | **`skills: [bmad-bmm-create-prd, ...]`** | **`skills: [bmad-bmm-create-prd, ...]`** | **Same as OpenCode** |
| Skill content | Activation steps + menu + persona | Same content | Same content |
| Skill meta | `metadata: { source: agent, module: X }` | _(dropped)_ | Same as OpenCode |

**Agent → Skill ownership** is extracted from the BMAD agent's `<menu>` items (`exec=` and `workflow=` attributes). Each agent's frontmatter `skills:` array lists the skill names for workflows it owns.

### 4.3 Agent → Skill Ownership Map (from BMAD `<menu>`)

| Agent | Module | Owned Skills (workflow names) |
|-------|--------|-------------------------------|
| **bmad-master** | core | _(party-mode only)_ |
| **analyst** | bmm | brainstorming, market-research, domain-research, technical-research, create-product-brief, document-project |
| **pm** | bmm | create-prd, validate-prd, edit-prd, create-epics-and-stories, check-implementation-readiness, correct-course |
| **ux-designer** | bmm | create-ux-design |
| **architect** | bmm | create-architecture, check-implementation-readiness |
| **sm** | bmm | sprint-planning, create-story, retrospective, correct-course |
| **dev** | bmm | dev-story, code-review |
| **quick-flow-solo-dev** | bmm | quick-spec, quick-dev, code-review |
| **qa** | bmm | qa-automate |
| **tech-writer** | bmm | document-project |
| **brainstorming-coach** | cis | brainstorming |
| **innovation-strategist** | cis | innovation-strategy |
| **creative-problem-solver** | cis | problem-solving |
| **design-thinking-coach** | cis | design-thinking |
| **storyteller** | cis | storytelling |
| **presentation-master** | cis | _(none yet — all menu items are TODO)_ |
| **tea** | tea | teach-me-testing, testarch-framework, testarch-atdd, testarch-automate, testarch-test-design, testarch-trace, testarch-nfr, testarch-ci, testarch-test-review |

> **Shared workflows** (appear in multiple agents): party-mode (all), check-implementation-readiness (pm + architect), code-review (dev + quick-flow-solo-dev), correct-course (pm + sm), document-project (analyst + tech-writer)

> **Unowned skills** (standalone tasks from core): editorial-review-prose, editorial-review-structure, help, index-docs, review-adversarial-general, shard-doc — these are NOT linked to any agent.

### 4.4 BMAD Workflow

| Output | OpenCode | Claude Code | Agents (cross-IDE) |
|--------|----------|-------------|---------------------|
| Skill file | `{outDir}/skills/bmad-{module}-{name}/SKILL.md` | same | same |
| Content | Structured steps + template | Same content | Same content |
| Frontmatter | `license, compatibility, metadata` | `user-invocable: true` | Same as OpenCode |

### 4.5 BMAD Task

| Output | OpenCode | Claude Code | Agents (cross-IDE) |
|--------|----------|-------------|---------------------|
| Skill file | `{outDir}/skills/bmad-{module}-task-{name}/SKILL.md` | same | same |
| Content | Cleaned XML → markdown | Same content | Same content |
| Frontmatter | `metadata: { standalone: true/false }` | `user-invocable: true/false` | Same as OpenCode |

---

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

---

## 6. Implementation Tasks

| # | Task | Files | Effort | Depends On |
|---|------|-------|--------|------------|
| 1 | Create Claude Code types | `src/types/claude.ts`, `src/types/index.ts` | S | — |
| 2 | Extract agent→skill ownership from `<menu>` items | `src/parsers/menu-parser.ts` | M | — |
| 3 | Create `claude-agent-converter.ts` | `src/converters/claude/claude-agent-converter.ts` | M | 1, 2 |
| 4 | Create `claude-workflow-converter.ts` | `src/converters/claude/claude-workflow-converter.ts` | M | 1 |
| 5 | Create `claude-task-converter.ts` | `src/converters/claude/claude-task-converter.ts` | S | 1 |
| 6 | Create Claude converters index | `src/converters/claude/index.ts`, `src/converters/index.ts` | S | 3, 4, 5 |
| 7 | Create `.agents/` writer (cross-IDE) + Claude `.claude/` writer | `src/writers/agents-writer.ts`, `src/writers/claude-writer.ts` | M | 1 |
| 8 | Add `ConversionTarget` + routing to `convert()` | `src/converter.ts` | M | 6, 7 |
| 9 | Add `--target` CLI flag | `src/cli.ts` | S | 8 |
| 10 | Update exports | `src/index.ts` | S | 6, 7 |
| 11 | Add test fixtures + test script for Claude target | `tests/` | M | 8, 9 |
| 12 | Update README | `README.md` | S | 11 |

**Total effort:** ~Medium (most converter logic parallels existing OpenCode converters with different frontmatter shapes)

---

## 7. Design Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Self-contained output** (no `_bmad/` references) | Matches OpenCode approach; portable; no runtime file loading. **Differs from official BMAD installer** which uses lightweight pointers that LOAD `_bmad/` source files at runtime. Our approach embeds all content for portability at cost of larger files. |
| 2 | **Modern format only** (`.claude/agents/` + `.claude/skills/`, no `.claude/commands/`) | Commands are legacy (still functional but deprecated since Claude Code v2.1.3); skills/agents are the current standard |
| 3 | **Shared BMAD parsing layer** | CSV manifests, agent/workflow/task parsers are target-agnostic; only conversion + writing differs |
| 4 | **Agent default: all tools enabled** | BMAD agents are full-capability; map to `tools: Read, Write, Edit, Bash, Glob, Grep` |
| 5 | **Model: inherit** | Don't hardcode model; let Claude Code pick based on user config |
| 6 | **Skill content identical across targets** | The markdown body (persona, steps, instructions) is the same; only frontmatter shape differs |
| 7 | **Agent-derived skills: no `context: fork`** | These are reference skills invoked by users, not autonomous subagents |
| 8 | **Handle agent customizations transparently** | BMAD `.customize.yaml` persona replacements are applied at parse time, so converters see final persona regardless of customization |
| 9 | **Preserve workflow phase structure in naming** | Skill names like `bmad-bmm-create-prd` maintain the module hierarchy; no phase prefixes to keep names short per the 64-char limit |
| 10 | **No `_bmad-output/` conversion** | Output artifacts (PRD.md, architecture.md, etc.) are user-generated content, not module definitions — outside converter scope |
| 11 | **Output to `.agents/` for cross-IDE compatibility** | OpenCode reads from `.opencode/`, `.claude/`, and `.agents/`; using `.agents/` makes the `opencode` target portable across IDEs that support the `.agents` convention. Claude target still writes to `.claude/`. |
| 12 | **Agent→skill ownership derived from `<menu>` items** | BMAD agent `<menu>` items contain `exec=` and `workflow=` attributes that define which workflows an agent can run; converter parses these to populate the `skills[]` frontmatter array for both OpenCode and Claude Code agents |

---

## 8. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Support `--target both` for simultaneous output? | Low effort to add, useful for maintainers publishing to both |
| 2 | Should agent-derived skills use `context: fork` + `agent: {name}`? | Changes skill behavior from reference material to autonomous subagent execution |
| 3 | Map BMAD `standalone: true` to `disable-model-invocation: false` + `user-invocable: true`? | Affects whether Claude can auto-invoke task skills |
| ~~4~~ | ~~Should Claude agents link their associated skill via `skills: [bmad-{module}-{name}]`?~~ | **RESOLVED: YES** — agents link their owned skills via `skills:` array, populated from BMAD `<menu>` items. Applies to both OpenCode and Claude Code targets. |
| 5 | Should shared workflows (party-mode, check-implementation-readiness) be listed in ALL owning agents' `skills[]`, or only in the primary owner? | Affects skill duplication across agents — currently listed in all owning agents per the BMAD `<menu>` source of truth |
