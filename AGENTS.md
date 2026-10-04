# CJL Agent Instructions

Codex · 2026-10-05 · Execution — constraints copied verbatim from the approved plan.

## Global Constraints

- AI produces no numbers. Scenario numbers come from the instantiator; correct values come from the finance engine.
- AI does not assign scores. It returns a verdict per rubric point with a verbatim quote; code computes the score.
- Only `src/grading/` may call an AI API. Only `src/records/sync/` may call the GitHub API.
- The OpenAI key and GitHub token live only in browser local storage and are sent only to `https://api.openai.com` and `https://api.github.com`. They never appear in records, logs, thrown error messages, or the repo.
- No external scripts, fonts, analytics or CDNs. No vendor SDKs; use `fetch`.
- Runtime dependencies are limited to: `react`, `react-dom`, `react-router`, `zod`, `idb`. Adding another needs a stated reason on the card.
- No real company, project or person names anywhere in the repo. All scenario data is fictional.
- UI and scenario text are English.
- All percentages in engine inputs and outputs are numbers on a 0–100 scale (20 means 20%).
- All money is AUD, whole dollars, formatted `en-AU` with no decimals.
- Git commands run only inside `C:\Codex\Commercial Judgment Lab`, never from `C:\Codex`.
- Every page footer shows: "CJL is a training tool. It is not legal, accounting or financial advice."


## Public Repository Hygiene

Claude · 2026-10-05 · Added at the repo owner's request after PR #1.

This repository is public. Everything pushed to GitHub is readable by anyone and is hard to remove afterwards.

- PR titles and descriptions, commit messages, issues, code comments and docs refer to work by task ID only (`CJL-1`). Never paste Notion links or any other private workspace URL.
- Do not name people in PRs, commit messages, issues or comments. Write "the repo owner" or "the maintainer". The only places a name belongs are the commit author field and the `LICENSE` copyright line.
- The link goes one way: put the branch, PR URL and commit SHA on the Notion card, never the Notion URL on GitHub.
- Commit as `user.name = Sean Yu` with the GitHub noreply email already set in this repo's local git config. Do not change either, and never use a real email address.
- Before opening or updating a PR, re-read the description for links, names, email addresses and local paths outside this repo.

Read `docs/superpowers/specs/2026-10-04-cjl-v1-design.md` before changing code.
