# Agent guide

Registration and sign-in app for Drop Dead Gorgeous, embedded in the Shopify theme via iframe. Two-way synced with Lovable on `main`.

## Rules (always applied)

- [`.cursor/rules/lovable-sync-workflow.mdc`](.cursor/rules/lovable-sync-workflow.mdc): branch, PR, squash-merge workflow, the never-do list, secrets, testing, deploy unknowns.
- [`.cursor/rules/theme-boundary.mdc`](.cursor/rules/theme-boundary.mdc): the theme repo is read-only, where the postMessage contract lives.

## Read before working

| File | What it is |
|------|------------|
| [`mem/index.md`](mem/index.md) | Lovable's memory: core constraints and feature notes. Read it, don't edit it. |
| [`CODE_INDEX.md`](CODE_INDEX.md) | Hand-written file map by directory and concern, edge functions grouped by purpose. Check it before grepping. |
| [`.cursor/codebase-index.md`](.cursor/codebase-index.md) | Generated symbol index (`path:line` for components, hooks, functions) and import graph. |
| [`PROBLEM_SOLUTION_LOG.md`](PROBLEM_SOLUTION_LOG.md) | Past bugs and root causes. Check it before debugging. Newer Shopify login / invite findings are in `mem/` instead. |
| [`HANDOFF.md`](HANDOFF.md) | Original architecture, schema, and storage handoff (December 2024). |

## When sources disagree

`HANDOFF.md` is the oldest doc and parts are out of date (its "What needs integration" list and auth notes predate the Shopify integration). Prefer `mem/index.md`, then `CODE_INDEX.md`, then the code itself.

Lovable edits don't update either index. If a file you need isn't listed, regenerate `.cursor/codebase-index.md` (command at the top of `CODE_INDEX.md`) and add the file to `CODE_INDEX.md` in the same PR.

## Postmessage contract

Source of truth: `C:\Users\alexm\dawn-migration\docs\contracts\apply-spa-login-handoff.md` (theme repo, read-only). See the theme boundary rule.
