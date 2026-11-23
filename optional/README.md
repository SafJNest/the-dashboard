# Optional extras

- `beebot/`: project-only historic evidence. **Do not copy into unrelated projects**. For Beebot, merge the files deliberately and update their references from current source.
- `subagents/`: one example read-only investigator for each CLI. To install, copy the **contents** of `subagents/` into the repository root, preserving hidden `.codex/`, `.claude/`, `.gemini/` directories. This is optional. No subagent is required to benefit from the base kit.
- Codex: `.codex/agents/architecture-explorer.toml` (agent name `architecture_explorer`); explicitly ask Codex to spawn it for a broad analysis. Claude: `.claude/agents/architecture-explorer.md` (name `architecture-explorer`); use an explicit request or `@architecture-explorer`. Gemini: `.gemini/agents/architecture-explorer.md`, use `@architecture-explorer` where supported.
- Subagent definitions may require a fresh session after installation. When testing, inspect the agent list and activity rather than assuming auto-launch.
