# Visa Acceptance Agent Toolkit — Web UI (Example)

A minimal React + Express UI to interact with the TypeScript toolkit on SANDBOX: create invoices and pay-by-links, list recent items, and try a simple NL assistant.

Documentation: See the project-level guide at `../../docs/visa-acceptance-agent-toolkit.md` for design notes, extractor behavior, Vercel AI SDK integration, and API examples.

## Prerequisites

- Node.js 18+
- Valid SANDBOX credentials (merchant id, api key id, secret key)
- From the repo root, build the toolkit first (once):

```powershell
Push-Location ..\\..
npm run build
Pop-Location
```

## Setup

```powershell
cd typescript\\examples\\web-ui
npm install
Copy-Item .env.template .env
notepad .env
```

Fill in:

- VISA_ACCEPTANCE_MERCHANT_ID=...
- VISA_ACCEPTANCE_API_KEY_ID=...
- VISA_ACCEPTANCE_SECRET_KEY=...
- VISA_ACCEPTANCE_ENVIRONMENT=SANDBOX
- OPENAI_API_KEY=... (optional; not required for the basic UI)

## Run (two processes managed for you)

```powershell
npm run dev
```

- Frontend: http://localhost:5173 (Vite, will auto-bump if busy)
- Backend API: http://localhost:5178 (Express default, will auto-bump if busy)

Notes:
- The Vite dev server proxies `/api/*` to the backend. Override backend port with env `BACKEND_PORT` (or `PORT`) before running to keep ports consistent.
- You can also set a global API base for non-proxied hosts by defining `window.API_BASE` in `index.html`, e.g.:

```html
<!-- index.html before main.tsx -->
<script>window.API_BASE = 'http://localhost:5216';</script>
```

If you prefer to run separately:

```powershell
npm run client
npm run server
```

## Features

- Create Invoice: amount, currency, email/name, memo, due in N days
- Create Pay-by-Link: amount, currency, memo
- Lists: recent invoices and pay-by-links (refresh)
- AI Assistant: now powered by a unified `/api/assist` endpoint with tool-like behavior
  - List actions (list invoices, list pay links) return immediately in a single step
  - Mutating actions (create invoice/pay-link, send/cancel/update invoice) return a confirmation payload first; the UI lets you review/edit and then confirm
  - The server normalizes outputs so tables are consistent and guarantees “last 5 rows” layout
  - Actions menu provides Copy/Open for links; server enriches missing Created/URL fields when affordable
  - Parse simple prompts like
  - "Create invoice for $100 in EUR to jane@example.com due in 10 days \"Consulting\""

### Prompt examples

You can paste these into the AI Assistant box or click the built-in suggestions:

- Create an invoice for $450 USD for ACME Corp, due in 15 days.
- Find all unpaid invoices over $500
- Update invoice #1034 to change due date to June 1st

Notes:
- The server uses the toolkit's shared `VisaAcceptanceAPI` to execute tools directly.
- Responses are returned as JSON; sensitive fields may be masked by toolkit utilities.

### AI Assistant API (/api/assist)

The UI calls a single endpoint to simplify AI-driven flows:

- Endpoint: `POST /api/assist`
- Request body:

```json
{
  "prompt": "Find unpaid invoices over $500 USD",
  "action": "list-invoices",      // optional: auto classification if omitted
  "confirm": false,                 // default false; set true to execute mutating actions
  "overrides": {                    // optional edited fields for confirmation step
    "status": "SENT",
    "minAmount": 500,
    "currency": "USD"
  }
}
```

- Response shapes:
  - List actions: `{ "type": "result", "action": "list-invoices", "result": { invoices: [...], total: N } }`
  - Mutating actions, first pass: `{ "type": "confirmation", "action": "create-invoice", "fields": { ... }, "missing": [ ... ] }`
  - Mutating actions, after confirm: `{ "type": "result", "action": "create-invoice", "result": { id: "...", ... } }`

Normalization guarantees:
- Invoices list returns `{ invoices, total }` and supports optional `status` plus server-side post-filter `minAmount`.
- Pay links list returns `{ paymentLinks, total }` and maps status to `ACTIVE`/`INACTIVE` only. When affordable (limit ≤ 5), the server enriches missing `created` and `paymentLink` via per-item detail fetches.

Status semantics:
- Invoices: `DRAFT`, `CREATED`, `SENT`, `PARTIAL`, `PAID`, `CANCELED` (human phrases map to these).
- Pay links: `ACTIVE` or `INACTIVE` only (server/UI sanitize and ignore invoice statuses).

## Troubleshooting

- Ensure the TypeScript toolkit builds successfully (from `typescript/`) before running the UI.
- Verify your `.env` values and that the environment is SANDBOX for testing.
- PowerShell quoting: wrap prompts with quotes when using `$`.

```powershell
# Optional health check (replace with actual backend port if auto-bumped)
Invoke-RestMethod http://localhost:5178/api/health
```

## Push to GitHub & CI (quick start)

Follow these steps to push this repository to GitHub and validate builds via CI before deploying to Vercel.

1) Commit and push your branch (PowerShell):

```powershell
git add .
git commit -m "chore: prepare web-ui for CI and Vercel"
git push origin main
```

2) What the repo CI will do (created workflow):
- Build the TypeScript toolkit (`typescript/`) via its `prepare`/`build` script.
- Install and build the web UI (`typescript/examples/web-ui`) via `vite build`.

3) Quick Vercel notes (after pushing):
- Connect the GitHub repo to Vercel and set the Project Root to `typescript/examples/web-ui`.
- Ensure the following Environment Variables are configured in the Vercel Project Settings (Production / Preview as appropriate):

| Name | Required | Example / Notes |
|---|---:|---|
| VISA_ACCEPTANCE_MERCHANT_ID | Yes | Sandbox merchant id |
| VISA_ACCEPTANCE_API_KEY_ID | Yes | Sandbox api key id |
| VISA_ACCEPTANCE_SECRET_KEY | Yes | Sandbox secret key |
| VISA_ACCEPTANCE_ENVIRONMENT | Yes | SANDBOX |
| OPENAI_API_KEY | No | Optional — enables LLM classification |
| VISA_ACCEPTANCE_API_MOCK | No | `true` to run in demo/mock mode |

4) Note about local `file:` dependency

This project references the local package at `"@visaacceptance/agent-toolkit": "file:../../"` in `package.json`. During Vercel install the package's `prepare` script (which runs `npm run build`) will be executed so the toolkit is available to the web UI. Ensure devDependencies like `tsup` and `typescript` are available during the build (Vercel installs devDependencies by default during build time).

If you prefer to avoid on-build compilation on Vercel, publish `@visaacceptance/agent-toolkit` to a registry and point the web UI `package.json` dependency to the published package instead of `file:`.

## Configure Vercel Project (step-by-step)

When creating a Vercel project for this example, follow these exact steps to avoid common build/runtime issues:

1. In Vercel, click "New Project" → Import from Git.
2. Select the repository you pushed to GitHub.
3. Set the Root Directory to: `typescript/examples/web-ui`.
4. In Build & Output Settings set:
  - Framework Preset: "Other"
  - Build Command: `npm run build`
  - Output Directory: `dist`
5. Under Environment Variables add the required values (copy from the table above):
  - `VISA_ACCEPTANCE_MERCHANT_ID`, `VISA_ACCEPTANCE_API_KEY_ID`, `VISA_ACCEPTANCE_SECRET_KEY`, `VISA_ACCEPTANCE_ENVIRONMENT`
  - Optional: `OPENAI_API_KEY`, `VISA_ACCEPTANCE_API_MOCK`.
6. (Optional) Set the Project's Node.js Version to 18 in the Advanced Settings / Functions settings.
7. Deploy. Vercel will run `npm install` and execute the toolkit `prepare` script to build the local `file:` dependency.

Notes:
- If you prefer not to build the local package on Vercel, publish `@visaacceptance/agent-toolkit` to a registry and update the web UI `package.json` to reference the published version.
- If the build fails with missing build-time tools, ensure the toolkit's devDependencies (e.g., `tsup`) are available during Vercel's install step.


## Smoke tests (matrix-aware)

Run a compact smoke test suite adapted to this demo API. It honors the provided matrix where possible and marks unsupported behaviors as SKIP.

```powershell
# Default API base: http://localhost:5216
npm run smoke

# Or specify API base explicitly
$env:API_BASE = 'http://localhost:5216'; npm run smoke
```

What it checks (summary):
- A) Pre-flight: /api/health, basic list; auth is marked SKIP in this sandbox if not enforced
- B) CRUD happy paths: list/create/update invoice, list/create pay-link; idempotency replay attempts
- C) Validation: a couple of 400/422 scenarios
- D) Agent: best-effort dry-run via /api/ai; records actions if exposed
- E) Concurrency & rate-limit: idempotent replay under concurrency and presence of rate-limit headers

Notes:
- The demo API differs from the matrix (e.g., invoice update uses `POST /api/invoices/:id/update` and pay-link update may be unsupported); the runner adapts and reports SKIP where a behavior isn’t available.
- Exit code fails fast only for pre-flight health/list failures; other missing features don’t block dev and are reported.

Playwright tests

- A minimal Playwright test is included to verify the Docs button and that `window.REPO_DOCS_URL` is exposed on the page. The test opens the local `index.html` (file://) and clicks the header Docs button. It does not require a running dev server.

Run them with:

```powershell
cd typescript\examples\web-ui
npm install
npx playwright install
npm run test:playwright
```

Additional AI flows are covered by Playwright tests in `tests/ai-agent-list.spec.ts` (mock mode):

- Pay links: last 5 active links — returns immediately (single step)
- Invoices: unpaid invoices over $500 USD — returns immediately (single step)

To run only these tests:

```powershell
$env:VISA_ACCEPTANCE_API_MOCK='true'; npx playwright test tests/ai-agent-list.spec.ts --reporter=list
```

If you prefer to include Playwright in CI, install Playwright in the job and run `npx playwright install --with-deps` to ensure browsers are available.

## Deploy to Vercel

This example can be deployed as a Vercel project (root = this folder). It serves the Vite build from `dist` and mounts the Express API as a single serverless function at `/api/index.ts`.

Deploy button (replace <OWNER>/<REPO> with your repo path if you forked):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F<OWNER>%2F<REPO>&root-directory=typescript%2Fexamples%2Fweb-ui)

Manual steps:

1) Create a new Vercel project and set Root Directory to `typescript/examples/web-ui`.
2) Environment Variables (Project Settings → Environment Variables):
   - `VISA_ACCEPTANCE_MERCHANT_ID`
   - `VISA_ACCEPTANCE_API_KEY_ID`
   - `VISA_ACCEPTANCE_SECRET_KEY`
   - `VISA_ACCEPTANCE_ENVIRONMENT=SANDBOX` (or `PRODUCTION` later)
   - `OPENAI_API_KEY` (optional; enables AI classification)
   - `VISA_ACCEPTANCE_API_MOCK` (optional; `true` for demo/mock mode)
3) Build settings (from `vercel.json` or manual): Build Command `npm run build`; Output Directory `dist`.
4) Deploy.

Notes:
- The SPA calls `/api/*` relative paths. `vercel.json` rewrites `/api/(.*)` to `api/index.ts` and everything else to `/index.html`.
- This example depends on `@visaacceptance/agent-toolkit`. In this monorepo it’s referenced as a local `file:` dependency and includes a `prepare` script, so Vercel will build it during install. You may also point the dependency to a published package if preferred.
- On cold start, the first call may be slightly slower while the function initializes.
- Check `/api/health` for readiness and missing env details.
