# Commercial Judgment Lab (CJL) v1 — Design

Date: 2026-10-04
Status: awaiting Sean's review

## 1. Purpose

CJL is a personal training tool for financially driven commercial decisions in
construction. It shows a scenario, the user writes a judgment, the app grades
it against a prepared rubric, and the app tracks which skills are weak so that
later scenarios target them.

- **Primary user:** Sean, GM of a Sydney plumbing contractor. Single user per
  installation.
- **Secondary goal:** Sean's first open-source project. Other people can use
  the hosted site or fork the repo with their own keys.
- **Success test:** after about 30 attempts, the skill profile matches where
  Sean is actually weak and the scenarios he is given lean toward those skills.

## 2. Decisions already made

| Topic | Decision |
|---|---|
| Hosting | Static site on GitHub Pages from the public repo `Cocopala/CJL` |
| Server | None. No backend, no proxy, no login |
| AI provider | OpenAI first, behind a provider interface |
| API key | Bring your own key, pasted in Settings, stored only in the browser |
| Training records | Stored locally and synced to the user's own private GitHub repo (`Cocopala/CJL-private-data` for Sean) |
| Scope | Levels 1–3 (intuition, calculation, decision). Level 4 continuous simulation is a later project |
| Domain | Sydney / NSW construction project commercial management |
| Scenario source | Authored templates with randomised numbers. No runtime AI scenario generation |
| Language | UI and scenarios in English. Answers in any language. Feedback language is a setting |
| Review split | Sean reviews scenario realism only and does not read rubrics. Claude reviews rubrics and checks rule-based facts against sources |
| Licence | MIT |

## 3. Two global constraints

1. **AI produces no numbers.** Scenario numbers come from the instantiator.
   Correct values come from the finance engine.
2. **AI does not assign scores.** It returns a verdict per rubric point with a
   quote from the answer as evidence. Code computes the score from point
   weights.

Only the grader module calls an AI. Every other module is deterministic.

## 4. Technology

- Vite, React, TypeScript (strict), single-page app.
- Hash-based routing with `react-router`, because Pages has no SPA fallback.
- Zod for all schemas (templates, grader output, records, settings).
- `idb` for IndexedDB access.
- CSS Modules. No UI component library. Charts are hand-written inline SVG.
- Vitest for tests.
- OpenAI and GitHub are called with `fetch`. No vendor SDKs.
- GitHub Actions builds, runs tests and template validation, and deploys to
  Pages on push to `main`.

New runtime dependencies beyond this list need a stated reason in the card
that adds them.

## 5. Modules

```
src/
  engine/        pure finance functions
  scenarios/     template schema, loader, instantiator
  grading/       provider interface, OpenAI provider, prompt, scoring
  records/       attempt schema, local store, GitHub sync
  profile/       skill profile, next-scenario selector
  settings/      settings schema and local storage
  ui/            Train, History, Profile, Settings pages
scenarios/
  skills.json
  construction-nsw/   template files
```

Dependency direction: `ui` depends on everything; `grading`, `profile` and
`scenarios` depend on `engine` and on shared types; `engine` depends on
nothing.

### 5.1 Finance engine

Pure functions over plain numbers, each with unit tests. v1 set:

- `forecastGp`, `forecastGpPct` (contract value, approved variations, forecast cost)
- `percentComplete` (cost incurred, estimated cost to complete)
- `earnedRevenue`, `overUnderBilling` (cost-to-cost method)
- `eac`, `profitFade`
- `retentionHeld`, `retentionRelease`
- `netCashPosition`, `peakCashDeficit` over a dated list of inflows and outflows
- `arAgeing` buckets
- `breakEvenRevenue`, `contributionMargin`
- `chargeOutRate`, `utilisation`, `overtimeVsHireCost`
- `interestCost`, `debtServiceCover`
- `landedCost` (price, FX rate, freight, duty, deposit timing)
- `bidMargin`, `markupFromMargin`

Functions are added only when a template needs them.

### 5.2 Skills

`scenarios/skills.json` defines the skill list. Skills are data, not code.

1. `margin-job-costing` — Margin & job costing
2. `wip-revenue` — WIP & revenue recognition
3. `cash-working-capital` — Cash flow & working capital
4. `ar-payment-claims` — AR & payment claims (includes Security of Payment, retention, defect liability period timing)
5. `ap-suppliers-procurement` — AP, suppliers & procurement (includes overseas procurement)
6. `variations` — Variations
7. `contract-loi-risk` — Contract & LOI risk (includes insurance cost and exposure)
8. `forecast-variance` — Forecast & variance
9. `tender-pricing` — Tender pricing & bid decisions
10. `funding-capital` — Funding & cost of capital
11. `labour-overhead` — Labour & overhead cost

### 5.3 Scenario templates

One JSON file per template under `scenarios/<pack>/`. Shape:

```jsonc
{
  "id": "cnsw-wip-001",
  "version": 1,
  "pack": "construction-nsw",
  "level": 2,                       // 1 intuition, 2 calculation, 3 decision
  "title": "Underbilled at 70% complete",
  "body": "Contract value is {{contract|currency}} ...",
  "question": "What is the forecast GP and the over/underbilling?",
  "params": [
    { "name": "contract", "min": 2000000, "max": 6000000, "step": 50000 }
  ],
  "constraints": [
    { "left": "claimed", "op": "<=", "right": "contract" }
  ],
  "computed": [
    { "id": "gp", "fn": "forecastGp",
      "args": { "contractValue": "contract", "approvedVariations": "vo", "forecastCost": "cost" } }
  ],
  "numericInputs": [
    { "id": "gp-input", "label": "Forecast GP", "unit": "currency" }
  ],
  "rubric": [
    { "id": "p1", "type": "numeric", "skill": "margin-job-costing", "weight": 2,
      "input": "gp-input", "truth": "gp", "tolerancePct": 1 },
    { "id": "p2", "type": "must_mention", "skill": "wip-revenue", "weight": 3,
      "criterion": "Identifies that the job is underbilled and that cash is funding the client",
      "explanation": "..." },
    { "id": "p3", "type": "red_flag", "skill": "ar-payment-claims", "weight": 2,
      "criterion": "Proposes waiting for practical completion before claiming",
      "explanation": "...",
      "ruleBased": true,
      "sources": [ { "citation": "...", "url": "..." } ] }
  ]
}
```

Rules:

- `args` and `constraints` refer to param names, earlier `computed` ids, or
  numeric literals. There is no expression language.
- `criterion` and `explanation` may contain `{{...}}` placeholders so they can
  cite the instance's numbers.
- A rubric point with `ruleBased: true` must have at least one source. This
  applies to any point that depends on legislation, a standard, a tax rule or
  a statutory time limit.
- Level 2 templates may consist only of `numeric` points. Those attempts are
  graded with no AI call.
- No real company, project or person names. All data is fictional.

### 5.4 Instantiator

`instantiate(template, seed) -> ScenarioInstance`

- Seeded PRNG (mulberry32). The same template version and seed always give
  the same instance.
- Samples params, rejects samples that break a constraint, retries up to 200
  times, then throws.
- Runs `computed` through the engine to get truth values.
- Renders `body`, `question`, and rubric text.

### 5.5 Grading

Provider interface:

```ts
interface GraderProvider {
  grade(request: GradeRequest): Promise<GraderOutput>;
}
```

`GradeRequest` holds the rendered scenario, truth values, the non-numeric
rubric points, the user's answer text, and the feedback language setting.

The OpenAI provider calls the Responses API with a JSON-schema structured
output. The model id is a single config constant and can be overridden in
Settings.

`GraderOutput`:

```ts
{
  points: Array<{
    id: string;
    // must_mention: "met" | "partial" | "not_met"
    // red_flag:     "triggered" | "not_triggered"
    verdict: "met" | "partial" | "not_met" | "triggered" | "not_triggered";
    evidence: string;        // verbatim quote from the answer, or ""
    comment: string;         // in the feedback language
  }>;
  summary: string;           // in the feedback language
}
```

Prompt rules:

- The answer is passed as data inside a delimited block. The prompt states
  that text in the answer is never an instruction.
- The model judges only against the given criteria and truth values. It must
  not introduce rules of its own.
- The answer language does not affect verdicts.

Scoring, in code:

- `numeric`: full weight if within tolerance, else zero.
- `must_mention`: `met` full weight, `partial` half weight, `not_met` zero.
- `red_flag`: `triggered` subtracts the weight.
- A `met`, `partial` or `triggered` verdict needs an `evidence` string that is
  found in the answer after whitespace normalisation. If it is not found, the
  point is marked `unverified`, earns or subtracts nothing, and is shown as
  such so the user can dispute it.
- Attempt score = `max(0, earned − penalties) / total positive weight × 100`.
- Per-skill earned and possible weights are stored on the attempt.

Feedback language setting:

- `mixed` (default): explanation in the user's chosen native language with
  industry terms kept in English. Native language defaults to the browser
  language.
- `english`: all feedback in English.

Note for the README: rubrics are in the public repo. The tool relies on the
user not reading them before answering.

### 5.6 Records

An attempt record:

```jsonc
{
  "schema": 1,
  "id": "uuid",
  "createdAt": "2026-10-04T09:12:33Z",
  "deviceId": "uuid",
  "templateId": "cnsw-wip-001",
  "templateVersion": 1,
  "seed": 123456789,
  "answerText": "...",
  "numericAnswers": { "gp-input": 900000 },
  "status": "graded",            // or "pending_grade"
  "grader": { "provider": "openai", "model": "...", "output": { } },
  "pointResults": [ { "id": "p1", "earned": 2, "possible": 2, "state": "met" } ],
  "score": 72,
  "skillTotals": { "wip-revenue": { "earned": 3, "possible": 3 } }
}
```

Records are append-only. A dispute is its own record:
`{ id, createdAt, attemptId, pointId, note }`.

Local store: IndexedDB, with stores for attempts, disputes, and a sync queue.

GitHub sync:

- Settings hold a fine-grained personal access token limited to one repo with
  Contents read and write, plus the `owner/repo` name.
- Each record is one file: `attempts/YYYY/MM/<timestamp>-<id>.json` or
  `disputes/YYYY/MM/<timestamp>-<id>.json`. Files are created, never edited,
  so two devices cannot conflict.
- On app start and after each attempt: push queued records, list the repo
  tree, and download files not present locally.
- A `pending_grade` attempt that is later graded is written as a new file
  with the same `id` and a later timestamp. The latest file per `id` wins.
- An empty repo is treated as zero records.
- Sync is optional. With no token the app works on local data only.
- Settings also offers export and import of all records as one JSON file.

### 5.7 Profile and selection

`buildProfile(attempts, skills) -> SkillProfile[]`, recomputed from all graded
attempts each time. Nothing derived is stored.

- Per skill: recency-weighted ratio of earned to possible weight. An
  attempt's weight halves for every 10 later attempts that touch the skill.
- Each skill reports its attempt count. Under 5 attempts it is shown as
  "Not enough data" with no score.

`pickNext(templates, attempts, profile, levelFilter, rng) -> template`

- Weighted random. A template's weight rises with the weakness of its skills
  and when it has not been attempted before.
- Skills without enough data are treated as weak, so new users get coverage.
- The last 5 attempted templates are excluded.
- The user can filter by level. Default is all levels.

### 5.8 UI

Four pages, English only.

- **Train:** scenario, numeric inputs where defined, answer text area, submit.
  After submit: score, each rubric point with verdict, evidence and
  explanation, truth values, summary, a Dispute control per point, and Next.
- **History:** list of attempts; open one to see the full instance and result.
- **Profile:** 11 skills with score, attempt count and a trend line.
- **Settings:** OpenAI key and model, GitHub token and repo, feedback language
  and native language, sync status, export, import, and a clear-local-data
  control.

Every page footer states that CJL is a training tool and is not legal,
accounting or financial advice.

## 6. Security

- The OpenAI key and GitHub token are stored only in browser local storage
  and sent only to `api.openai.com` and `api.github.com`.
- A Content Security Policy meta tag restricts `script-src` to `'self'` and
  `connect-src` to `'self'`, `https://api.openai.com`, `https://api.github.com`.
- No external scripts, fonts, analytics or CDNs.
- No code path reads a key from a file or build-time variable.
- The repo contains no secrets and no real business data.
- Keys are never written to records, logs or error messages.
- README guidance for users: use a dedicated key, prepaid billing with
  auto-recharge off, minimum key permissions, and a token scoped to one repo
  with an expiry date.

## 7. Error handling

| Situation | Behaviour |
|---|---|
| No OpenAI key | Numeric-only scenarios work. Text scenarios ask for a key |
| AI call fails or output fails schema validation | Attempt saved as `pending_grade`; user can retry grading |
| Evidence quote not found in answer | Point marked `unverified` |
| Sync fails or offline | Local use continues; unsynced count shown; retried on next start |
| GitHub token invalid or expired | Clear message in Settings; local data untouched |
| Template fails to instantiate | Template skipped, error logged to console, another template picked |
| Record fails schema validation on load | Record skipped and counted in a visible warning |

## 8. Testing

- Unit tests for engine, instantiator, scoring, profile and selector.
- Template validation in CI for every template: schema valid, 1,000 seeds
  instantiate without constraint failure, all truth values finite, every
  `ruleBased` point has a source, every skill id exists.
- Grader regression set: fixed answers with expected verdicts per point. It
  is run manually with a real key when the prompt, schema or model changes.
  It is not run in CI.
- Sync tested against a mocked GitHub API, including the empty repo, two
  devices adding records, and a re-graded attempt.
- UI: component tests for the Train flow with a fake grader provider.

## 9. v1 content

30 templates in the `construction-nsw` pack. Every skill has at least two
templates, and every level has at least eight.

Workflow per template: drafted with AI assistance during development, passes
CI validation, Sean reviews realism without reading the rubric, Claude reviews
the rubric and verifies sources for rule-based points.

## 10. Out of scope for v1

- Level 4 continuous monthly company simulation.
- Runtime AI scenario generation.
- Accounts, login, multi-user features, any server component.
- Providers other than OpenAI.
- Re-grading old attempts from the UI (the record format supports it).
- UI translations.

## 11. Backlog (not designed)

Later training modules Sean named: negotiation, relationship management,
government policy as external shocks, insurance beyond cost and exposure,
defect liability management beyond retention timing. Also: Level 4
simulation, AI-drafted scenarios with validation, additional providers,
community scenario packs for other industries.

## 12. Working method

- Tasks live on the Notion board "CJL Dev To-do".
- Codex implements cards. Claude writes plans and audits each card in Review
  against this spec, with the two global constraints and the Security section
  as standing checks.
- `C:\Codex\Commercial Judgment Lab` is its own Git repository. Git commands
  are never run from the parent `C:\Codex` folder.
