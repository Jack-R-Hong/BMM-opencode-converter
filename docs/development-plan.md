# Development Plan: Multi-Target Conversion Support

## Overview

Extend the bmad-opencode-converter to support **3 output targets**:

| Target | Output Dir | Use Case |
|--------|-----------|----------|
| `opencode` | `.opencode/` | OpenCode IDE (existing, default) |
| `claude` | `.claude/` | Claude Code CLI |
| `agents` | `.agents/` | Cross-IDE interop |

The existing BMAD parsing layer (parsers, CSV manifests, types) stays untouched. Only conversion and writing logic changes.

---

## Decisions (Resolved)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | `--target both` support | **No** — single target per run |
| 2 | Agent-derived skills use `context:fork`? | **No** — skills as reference docs only |
| 3 | Standalone task mapping in Claude | `user-invocable: true` + `disable-model-invocation: true` |
| 4 | Agents link skills via `skills[]`? | **Yes** — from `<menu>` `exec=`/`workflow=` items |
| 5 | Shared workflows in all owners' `skills[]`? | **Yes** — all owning agents get the skill |
| 6 | Self-contained output (no `_bmad/` runtime refs) | **Yes** |
| 7 | Modern format only (`.claude/agents+skills`) | **Yes** — no legacy `commands/` |
| 8 | Default model for Claude agents | `inherit` (not hardcoded) |

---

## Architecture

### New Files

```
src/
  types/
    claude.ts                           # Claude-specific types
  converters/
    claude/
      claude-agent-converter.ts         # BMAD Agent → Claude agent + skill
      claude-workflow-converter.ts       # BMAD Workflow → Claude skill
      claude-task-converter.ts          # BMAD Task → Claude skill
      index.ts                          # Re-exports
  writers/
    opencode-writer.ts                  # Extract existing write logic from converter.ts
    claude-writer.ts                    # Write .claude/ structure
    agents-writer.ts                    # Write .agents/ structure
```

### Modified Files

```
src/
  converter.ts     # Add ConversionTarget enum, routing logic, extract writer
  cli.ts           # Add --target/-t flag
  types/index.ts   # Re-export Claude types
  converters/index.ts  # Re-export Claude converters
  index.ts         # Re-export new public API
```

### Type Definitions (`src/types/claude.ts`)

```typescript
// Claude Code Agent frontmatter
interface ClaudeCodeAgentFrontmatter {
  name: string;                    // required
  description: string;             // required
  tools?: string;                  // comma-separated capitalized: "Read,Write,Edit,Bash,Glob,Grep"
  disallowedTools?: string;        // comma-separated
  model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
  permissionMode?: string;         // default: "default"
  maxTurns?: number;               // mapped from OpenCode steps
  skills?: string[];               // skill names this agent owns
}

// Claude Code Skill frontmatter
interface ClaudeCodeSkillFrontmatter {
  name: string;                    // required, 1-64 chars, lowercase-hyphen
  description: string;             // required
  'allowed-tools'?: string;        // comma-separated
  'user-invocable'?: boolean;      // true for standalone tasks
  'disable-model-invocation'?: boolean;  // true for standalone tasks
  // NOT used: context:fork, agent
}
```

### Tool Name Mapping

| OpenCode (bool map key) | Claude (comma-sep value) |
|--------------------------|--------------------------|
| `read` | `Read` |
| `write` | `Write` |
| `edit` | `Edit` |
| `bash` | `Bash` |
| `glob` | `Glob` |
| `grep` | `Grep` |
| `skill` | `Skill` |
| `task` | `Task` |

### Agent → Skill Ownership

Parsed from `<menu>` items in BMAD agent definitions. Each `exec=` or `workflow=` attribute maps to a skill name. Special rules:

- `party-mode` → owned by **all** agents
- `bmad-master` → owns **all** `core` module tasks
- Shared workflows (e.g. `code-review`, `correct-course`) → appear in **all** owning agents' `skills[]`

---

## Implementation Phases

### Phase 1: Foundation (no deps)

#### Task 1.1 — Create Claude Types (`src/types/claude.ts`)
- Define `ClaudeCodeAgentFrontmatter`, `ClaudeCodeSkillFrontmatter`
- Define `ClaudeCodeAgent`, `ClaudeCodeSkill`, `ClaudeCodeConversionResult`
- Mirror the structure of existing `opencode.ts` types
- **Size: S**

#### Task 1.2 — Extract Agent→Skill Ownership Map
- Parse `<menu>` items from `BmadAgent.menu[]` for `exec=` and `workflow=` attributes
- Build ownership map: `Map<agentName, skillName[]>`
- Handle special cases: `party-mode` (all agents), `bmad-master` (all core tasks)
- Handle shared workflows (multiple owners)
- This can be a utility in `src/converters/ownership.ts` or within agent converter
- **Size: M**

### Phase 2: Converters (deps: Phase 1)

#### Task 2.1 — Claude Agent Converter (`src/converters/claude/claude-agent-converter.ts`)
- Input: `BmadAgent` + ownership map → Output: `ClaudeCodeAgent` + `ClaudeCodeSkill`
- Map frontmatter: description (direct), model → inherit, tools → comma-separated capitalized
- Populate `skills[]` from ownership map
- Drop: mode, temperature, hidden, color, top_p
- Reuse `buildAgentPrompt()` and `buildSkillContent()` from existing agent-converter
- **Size: M** — deps: 1.1, 1.2

#### Task 2.2 — Claude Workflow Converter (`src/converters/claude/claude-workflow-converter.ts`)
- Input: `BmadWorkflow` → Output: `ClaudeCodeSkill`
- Frontmatter: name, description only (drop license, compatibility, metadata)
- Reuse content-building logic from existing workflow-converter
- **Size: M** — deps: 1.1

#### Task 2.3 — Claude Task Converter (`src/converters/claude/claude-task-converter.ts`)
- Input: `BmadTask` → Output: `ClaudeCodeSkill`
- Frontmatter: name, description
- If `standalone: true` → set `user-invocable: true` + `disable-model-invocation: true`
- Reuse content-building logic from existing task-converter
- **Size: S** — deps: 1.1

#### Task 2.4 — Claude Converters Index (`src/converters/claude/index.ts`)
- Re-export all 3 Claude converters
- **Size: S** — deps: 2.1, 2.2, 2.3

### Phase 3: Writers + Routing (deps: Phase 2)

#### Task 3.1 — Extract OpenCode Writer (`src/writers/opencode-writer.ts`)
- Extract `writeAgent()` and `writeSkill()` from `converter.ts` into dedicated writer
- No behavior change, pure refactor
- **Size: S**

#### Task 3.2 — Claude Writer (`src/writers/claude-writer.ts`)
- Write `ClaudeCodeAgent` → `.claude/agents/{name}.md`
- Write `ClaudeCodeSkill` → `.claude/skills/{name}/SKILL.md`
- Serialize Claude-specific frontmatter (YAML)
- **Size: M** — deps: 1.1

#### Task 3.3 — Agents Writer (`src/writers/agents-writer.ts`)
- Write to `.agents/agents/{name}.md` and `.agents/skills/{name}/SKILL.md`
- Uses OpenCode frontmatter format (same as existing, different output dir)
- **Size: S** — deps: existing types

#### Task 3.4 — ConversionTarget + Routing in `converter.ts`
- Add `ConversionTarget = 'opencode' | 'claude' | 'agents'` type
- Extend `ConversionOptions` with `target` field (default: `'opencode'`)
- Route `convert()` to correct converter set + writer based on target
- Preserve existing behavior when `target = 'opencode'`
- **Size: M** — deps: 2.4, 3.1, 3.2, 3.3

### Phase 4: CLI + Exports (deps: Phase 3)

#### Task 4.1 — Add `--target` CLI Flag (`src/cli.ts`)
- New flag: `--target` / `-t` with values: `opencode`, `claude`, `agents`
- Default: `opencode`
- Validate input, show in `--help`
- **Size: S** — deps: 3.4

#### Task 4.2 — Update Exports (`src/index.ts`, `src/types/index.ts`, `src/converters/index.ts`)
- Re-export Claude types, converters, and writers
- Export `ConversionTarget` type
- **Size: S** — deps: 2.4, 3.2, 3.3

### Phase 5: Testing + Docs (deps: Phase 4)

#### Task 5.1 — Test Fixtures + Tests
- Create expected output fixtures for Claude and Agents targets
- Test each converter individually
- Integration test: full `convert()` with `target: 'claude'` and `target: 'agents'`
- Verify standalone task mapping (`user-invocable` + `disable-model-invocation`)
- Verify ownership map correctness (skills[] on agents)
- **Size: M**

#### Task 5.2 — Update README
- Document `--target` flag usage
- Add examples for each target format
- **Size: S**

---

## Execution Order (Critical Path)

```
Phase 1:  [1.1] ──┬── [1.2] ──────────────────────────────────┐
                   │                                            │
Phase 2:  [2.2]───┤   [2.1] (needs 1.1+1.2) ──┐               │
          [2.3]───┤                             ├── [2.4] ──┐  │
                   │                             │           │  │
Phase 3:  [3.1]───┤   [3.2] ──────────────────┐ │           │  │
          [3.3]───┤                            ├─┴── [3.4] ─┤  │
                   │                                         │  │
Phase 4:           ├── [4.1] (needs 3.4) ──────────────────┐│  │
                   └── [4.2] (needs 2.4+3.2+3.3) ─────────┤│  │
                                                            ││  │
Phase 5:               [5.1] (needs 4.1) ──── [5.2] ───── DONE
```

### Parallelizable Work

| Parallel Group | Tasks |
|----------------|-------|
| Phase 1 | 1.1 and 1.2 can run in parallel |
| Phase 2 | 2.2 and 2.3 can start once 1.1 is done (before 1.2) |
| Phase 3 | 3.1, 3.2, 3.3 can run in parallel |
| Phase 4 | 4.1 and 4.2 can run in parallel |

---

## Estimated Effort

| Phase | Tasks | Size |
|-------|-------|------|
| Phase 1: Foundation | 2 | S + M |
| Phase 2: Converters | 4 | M + M + S + S |
| Phase 3: Writers + Routing | 4 | S + M + S + M |
| Phase 4: CLI + Exports | 2 | S + S |
| Phase 5: Testing + Docs | 2 | M + S |
| **Total** | **14 tasks** | **~Medium overall** |

---

## Key Principles

1. **Shared parsing, divergent conversion** — BMAD parsers untouched; only converters/writers differ per target
2. **Self-contained output** — no runtime refs to `_bmad/` source
3. **Content reuse** — skill body content is identical across targets; only frontmatter format differs
4. **Backward compatible** — default target is `opencode`, existing behavior unchanged
5. **Module hierarchy preserved** — naming convention `bmad-{module}-{name}` maintained across all targets
