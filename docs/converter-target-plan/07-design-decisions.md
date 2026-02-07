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
