## 1. Goal

Extend `bmad-opencode-converter` to support **three conversion targets**:

| Target | Output Dir | Notes |
|--------|-----------|-------|
| `opencode` | `.opencode/` | Current behavior (unchanged) |
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
