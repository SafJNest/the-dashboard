# Portable Engineering Kit — v0.3

This version is **copy-ready**: `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` live at the package root and reference `docs/agent-memory/`.

## Put it into a NEW repository

Copy only the three root adapters and the `docs/agent-memory/` directory to the root of your target project. The minimal Codex-only installation needs `AGENTS.md` and `docs/agent-memory/`. For Claude and Gemini include their corresponding root file.

**Existing repository:** NEVER blindly overwrite existing `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`. Keep existing instructions and append/merge the new references. Prefer `@AGENTS.md` in `CLAUDE.md` (supported on recent Claude Code) and `@./AGENTS.md` in `GEMINI.md`; check your tool version.

After copying, start a fresh Codex/Claude/Gemini session at the project root, ask it to read the instructions and **analyze the real repository in read-only mode**. Then have it propose and, only after your approval, fill `PROJECT_CONTEXT.md` with facts about this project. Confirm the initial small change adheres to your style before trusting larger tasks.

`optional/beebot` is historical context for Beebot ONLY. `optional/subagents` contains optional specialized read-only analysis agents; do not install them by default. Installing an optional subagent does not guarantee that the main agent will call it. Use explicit delegation for the first test.

## What is what?

- `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`: **instructions for the main agent**, not standalone executable agents.
- `docs/agent-memory`: reusable preferences and project-specific context; normal Markdown, read according to the entry instructions.
- `optional/subagents`: actual *delegated agent definitions*; install only if useful and if supported by your client.

## What applies across languages?

`GLOBAL_CODING_CONTRACT.md` and `WORKFLOW_AND_APPROVALS.md` are language-agnostic. `JAVA_STYLE_AND_PATTERNS.md` includes the actual example supplied by the owner; adapt its organization to JavaScript, TypeScript, Shopify Liquid, etc. Do not transfer Java syntax or Java-specific persistence APIs. Shopify Liquid/Storefront conventions require a new project-specific supplement.

## Costs and safety

Subagents increase total tokens in comparable runs, but can reduce noise in the coordinator's context and improve parallel research throughput. Measure per-task total tokens, duration, quality and regressions. Do not claim guaranteed token savings. No credentials or full raw exported conversation are bundled.
