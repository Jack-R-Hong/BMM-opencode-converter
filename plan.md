# BMAD → OpenCode 格式轉換計畫

## 現狀問題

`tests/sources/.opencode/command/` 裡有 61 個 BMAD 產生的 `.md` 檔，全部放在 **`.opencode/command/`** 目錄，但這不是 OpenCode Skill 格式。

**BMAD 產生的格式（command）：**

```
.opencode/command/bmad-agent-bmm-dev.md      ← 薄代理，指向 _bmad/ 原始檔
.opencode/command/bmad-bmm-create-story.md   ← 薄代理
```

- 是 **commands**（slash commands），不是 skills/agents
- 只有 frontmatter（`name`, `description`, `disable-model-invocation`）
- Body 是「LOAD 外部檔案」的指令，不包含實際內容

---

## OpenCode 格式參考（官方文件確認）

### Skill 格式

```
.opencode/skills/{skill-name}/SKILL.md
```

**Frontmatter 欄位：**

| 欄位            | 必填 | 說明                                                                  |
| --------------- | ---- | --------------------------------------------------------------------- |
| `name`          | ✅   | 1-64 chars, lowercase alphanumeric, 單 hyphen 分隔, 須與目錄名一致    |
| `description`   | ✅   | 1-1024 chars                                                          |
| `license`       | ❌   | 授權資訊                                                              |
| `compatibility` | ❌   | 相容性資訊                                                            |
| `metadata`      | ❌   | string-to-string map                                                  |

**載入機制：** Skill 不會自動注入 system prompt。Agent 透過 `skill` tool 按需載入，Skill 列表呈現在 `<available_skills>` XML 中，由 `description` 決定是否被選中。

**Resource 檔案：** Skill 目錄下可放額外檔案，透過 skill resource 機制讀取。

**Name 規範：** `^[a-z0-9]+(-[a-z0-9]+)*$` — 目錄名必須與 frontmatter name 一致。

### Agent 格式

**兩種定義方式：**

1. **opencode.json** — `{ "agent": { "agent-name": { ... } } }`
2. **Markdown** — `.opencode/agents/agent-name.md`

**Agent 類型：**

| 類型       | 說明                    | 觸發方式                |
| ---------- | ----------------------- | ----------------------- |
| `primary`  | Tab 切換的主要 agent    | 使用者主動切換          |
| `subagent` | 被主 agent 或 @mention  | 由 primary 呼叫或 @提及 |
| `all`      | 兩者皆可                | 都可以                  |

**Markdown agent frontmatter：**

```yaml
---
description: Agent 說明（必填）
mode: subagent|primary|all
model: provider/model-id
temperature: 0.1
steps: 50
tools:
  write: false
  edit: false
  bash: false
permission:
  edit: deny
  bash:
    "*": ask
    "git diff": allow
  skill:
    "bmad-*": allow
---
（system prompt body）
```

**重要選項：** description, mode, model, temperature, steps, disable, prompt, tools, permission (edit/bash/webfetch/task/skill), hidden, color, top_p

---

## 轉換計畫

### 核心決策：BMAD 元素 → OpenCode 映射

| BMAD 元素       | → OpenCode 類型   | 理由                                                                      |
| --------------- | ----------------- | ------------------------------------------------------------------------- |
| Agent           | **Agent + Skill** | Agent 定義角色行為（mode/tools/permissions），Skill 承載知識（persona/menu） |
| Workflow        | **Skill**         | Workflow 是指令知識包，由 agent 按需載入                                    |
| Standalone Task | **Skill**         | 同上                                                                      |

**為什麼 Agent 需要拆成 Agent + Skill：**

- OpenCode Agent = 真正的 agent（有 model, tools, permissions, mode）
- BMAD Agent 的 persona + menu + activation 是大量知識內容，塞在 agent system prompt 會過大
- 拆成 Agent（行為定義）+ Skill（知識承載），Agent 的 system prompt 引導它載入對應 Skill

### 1. Skill 產出格式

**路徑：** `.opencode/skills/bmad-{module}-{name}/SKILL.md`

**Frontmatter：**

```yaml
---
name: bmad-{module}-{name}
description: "{description}"
---
```

**Content 必須自包含** — 不能用「LOAD 外部檔案」。

### 2. 內容自包含策略

現在 command body 是：

```markdown
LOAD the full agent file at: {project-root}/_bmad/bmm/agents/dev.md
```

這在 skill 格式下**完全無效** — skill content 是直接注入的文字。

**方案比較：**

| 方案                   | 做法                                                           | 優缺點                                                                                     |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **A: 內聯展開**        | 轉換時把 `_bmad/` 原始內容直接嵌入 SKILL.md                   | ✅ 完全自包含，最可靠<br/>❌ SKILL.md 會很大                                                 |
| **B: @filepath 引用**  | 保留 `_bmad/` 目錄，SKILL.md 用 `@filepath` 引用              | ✅ 乾淨分離<br/>❌ 需確認路徑解析行為                                                       |
| **C: Resource 檔案**   | 把原始 md 放在 skill 同目錄下作為 resource                     | ✅ OpenCode 原生支援<br/>❌ 每個 skill 都帶副本                                              |

**建議：方案 A（內聯展開）**

- 最可靠，不依賴路徑解析
- Skill 就是一個自包含的指令文件
- Workflow skill 可把 `instructions.md` + `template.md` 合併進來

### 3. Agent 產出格式

**路徑：** `.opencode/agents/bmad-{module}-{agent-name}.md`

**Frontmatter：**

```yaml
---
description: "{agent description}"
mode: subagent
permission:
  skill:
    "bmad-{module}-*": allow
---
```

**Body（system prompt）：**

```markdown
You are {persona.role}.

Load the skill "{skill-name}" for your full instructions, persona, and available commands.
```

Agent 保持輕量，知識內容全部在 Skill 裡。

### 4. opencode.json 整合（可選）

也可把 agent 定義寫在 `opencode.json`：

```json
{
  "agent": {
    "bmad-bmm-architect": {
      "description": "BMad System Architect (Winston)",
      "mode": "subagent",
      "prompt": "You are Winston, a System Architect. Load skill 'bmad-bmm-architect' for full instructions.",
      "permission": {
        "skill": {
          "bmad-bmm-*": "allow"
        }
      }
    }
  }
}
```

### 5. 具體改動清單

| 檔案                                      | 改動                                                                |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `src/types/opencode.ts`                  | 更新 `OpenCodeAgent` frontmatter 加入 permission/mode 欄位          |
| `src/writers/opencode-writer.ts`         | Agent 寫入 permission/mode；Skill 保持 name/description             |
| `src/converters/agent-converter.ts`      | 拆分：Agent（輕量 system prompt）+ Skill（自包含 persona/menu/activation） |
| `src/converters/workflow-converter.ts`   | 生成自包含 skill content（嵌入 instructions + template）            |
| `src/converters/task-converter.ts`       | 生成自包含 skill content（嵌入 task 內容）                          |
| 移除 command 輸出邏輯                     | 不再輸出到 `.opencode/command/`，全部輸出為 skill + agent            |
| 新增 `opencode.json` writer（可選）      | 把 agent 定義也寫到 opencode.json                                   |

### 6. Skill Name 規範對照

| BMAD 來源                    | OpenCode Skill Name            | 目錄名                          |
| ---------------------------- | ------------------------------ | ------------------------------- |
| `bmm/agents/architect`       | `bmad-bmm-architect`           | `bmad-bmm-architect/`           |
| `bmm/workflows/create-arch`  | `bmad-bmm-create-architecture` | `bmad-bmm-create-architecture/` |
| `core/tasks/help`            | `bmad-help`                    | `bmad-help/`                    |
| `cis/agents/brainstorming`   | `bmad-cis-brainstorming-coach` | `bmad-cis-brainstorming-coach/` |

所有名稱須符合：`^[a-z0-9]+(-[a-z0-9]+)*$`
