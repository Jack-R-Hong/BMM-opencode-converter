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
