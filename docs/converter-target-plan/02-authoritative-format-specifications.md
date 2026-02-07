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
