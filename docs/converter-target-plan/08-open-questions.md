## 8. Open Questions

| # | Question | Impact |
|---|----------|--------|
| 1 | Support `--target both` for simultaneous output? | Low effort to add, useful for maintainers publishing to both |
| 2 | Should agent-derived skills use `context: fork` + `agent: {name}`? | Changes skill behavior from reference material to autonomous subagent execution |
| 3 | Map BMAD `standalone: true` to `disable-model-invocation: false` + `user-invocable: true`? | Affects whether Claude can auto-invoke task skills |
| ~~4~~ | ~~Should Claude agents link their associated skill via `skills: [bmad-{module}-{name}]`?~~ | **RESOLVED: YES** — agents link their owned skills via `skills:` array, populated from BMAD `<menu>` items. Applies to both OpenCode and Claude Code targets. |
| 5 | Should shared workflows (party-mode, check-implementation-readiness) be listed in ALL owning agents' `skills[]`, or only in the primary owner? | Affects skill duplication across agents — currently listed in all owning agents per the BMAD `<menu>` source of truth |
