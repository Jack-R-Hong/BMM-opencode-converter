## 4. BMAD → Target Conversion Matrix

### 4.1 Output Directory by Target

| Target | Agents Dir | Skills Dir |
|--------|-----------|------------|
| `opencode` | `.opencode/agents/` | `.opencode/skills/` |
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
| **Agent skills** | _(N/A — no skills field)_ | **`skills: [bmad-bmm-create-prd, ...]`** | _(N/A)_ |
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
