# Agent guide

Registration and sign-in app for Drop Dead Gorgeous, embedded in the Shopify theme via iframe. Two-way synced with Lovable on `main`.

## Rules (always applied)

- [`.cursor/rules/lovable-sync-workflow.mdc`](.cursor/rules/lovable-sync-workflow.mdc): branch, PR, squash-merge workflow, the never-do list, secrets, testing, deploy unknowns.
- [`.cursor/rules/theme-boundary.mdc`](.cursor/rules/theme-boundary.mdc): the theme repo is read-only, where the postMessage contract lives.

## Read before working

| File | What it is |
|------|------------|
| [`mem/index.md`](mem/index.md) | Lovable's memory: core constraints and feature notes. Read it, don't edit it. |
| [`CODE_INDEX.md`](CODE_INDEX.md) | File map by directory and concern. Check it before grepping. |
| [`PROBLEM_SOLUTION_LOG.md`](PROBLEM_SOLUTION_LOG.md) | Past bugs and root causes. Check it before debugging. |
| [`HANDOFF.md`](HANDOFF.md) | Original architecture, schema, and storage handoff (December 2024). |

## When sources disagree

`HANDOFF.md` is the oldest doc and parts are out of date (its "What needs integration" list and auth notes predate the Shopify integration). Prefer `mem/index.md`, then `CODE_INDEX.md`, then the code itself. One example: `mem/index.md` says edge functions must inline utilities in `index.ts`, so don't add imports from `supabase/lib/` even though `CODE_INDEX.md` lists it.

## Postmessage contract

Source of truth: `C:\Users\alexm\dawn-migration\docs\contracts\apply-spa-login-handoff.md` (theme repo, read-only). See the theme boundary rule.
