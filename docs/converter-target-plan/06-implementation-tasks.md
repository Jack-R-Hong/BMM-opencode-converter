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
