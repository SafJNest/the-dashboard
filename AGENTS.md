# Engineering instructions — portable

These instructions apply to development tasks in this repository, regardless of language.

1. Before implementing changes, read `docs/agent-memory/GLOBAL_CODING_CONTRACT.md` and `docs/agent-memory/WORKFLOW_AND_APPROVALS.md`. For substantial Java work, also read `docs/agent-memory/JAVA_STYLE_AND_PATTERNS.md` as an example of the owner's preferred organization; apply its *principles* to other languages, not its Java syntax.
2. Read `docs/agent-memory/PROJECT_CONTEXT.md`, then verify the current code, existing instructions/ADRs, dependencies, tests, and worktree state. If the context file is incomplete, inspect and propose changes to it; do not invent project facts or assume this is Beebot.
3. A request to analyze, discuss, or show examples is read-only. Implement only when explicitly asked or after the proposed scope is approved. Preserve existing behavior, public contracts, and local style. No speculative abstraction layers.
4. Prefer an entrypoint that gathers useful context, expresses business decisions clearly, and delegates effects to existing domain functions (see the supplied EventHandler example). Be explicit and readable in JavaScript, TypeScript, Liquid, and Java; adapt to the real language and framework.
5. Validate diff, tests and risks; state what was not tested. Commit and push only on distinct explicit authorization.
6. Subagent policy: **do not spawn agents merely because they are available**. Keep small and sequential work in the main thread. On large, independent, read-heavy work, consider 1–2 narrowly scoped subagents when supported, keeping raw logs out of the main context. Avoid parallel writes to overlapping files. Explain delegation if used.

Project-specific instructions and fresh source code take precedence over historical examples when they conflict. Never import Beebot-specific architecture into another codebase automatically.
