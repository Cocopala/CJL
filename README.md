# Commercial Judgment Lab

CJL is a personal training tool for commercial decisions in construction. It uses fictional scenarios, deterministic financial calculations and prepared rubrics to help users practise judgment and identify skills to improve. This first scaffold supplies four placeholder pages; scenario training, grading, settings and record sync will arrive in later tasks.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. Routes are `#/`, `#/history`, `#/profile` and `#/settings`.

```sh
npm run typecheck
npm test
npm run validate:templates
npm run build
npm run check:csp
```

Template validation currently reports a placeholder until Task 4. `npm run preview:scenario` reports that preview tooling is not available yet and exits with a nonzero status.

## Key safety

When Settings is implemented, bring your own dedicated OpenAI key. Use prepaid billing with auto-recharge off and minimum key permissions. For optional sync, use a fine-grained GitHub token restricted to one private records repository, with Contents read/write permission and an expiry date.

Keys and tokens belong only in browser local storage and must be sent only to their respective OpenAI or GitHub API origins. They must never enter source files, build-time variables, records, logs or error messages. Browser storage is accessible to scripts on the same origin: use the app only on a trusted device. The repository must contain no secrets or real business data.

No external scripts, fonts, analytics or CDNs are used. Production builds inject a Content Security Policy; `check:csp` verifies that policy and rejects external script/link assets.

## Public rubrics

Scenario rubrics will be part of the public repository. The training tool relies on users not reading the rubrics before answering.

## CI and deployment

Pull requests and pushes run installation, type checking, tests, template validation, build and CSP checks. Successful pushes to `main` deploy to GitHub Pages. After merge, set repository **Settings → Pages → Source → GitHub Actions**. Hash routing and relative build assets support the repository Pages path.

## Disclaimer

CJL is a training tool. It is not legal, accounting or financial advice.

## Licence

MIT. See [LICENSE](LICENSE).
