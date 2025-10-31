# Visa Acceptance Agent Toolkit — AI SDK Examples

This folder contains runnable examples that turn natural‑language prompts into Visa Acceptance actions using Vercel’s AI SDK, with robust local fallbacks and an interactive flow.

## Prerequisites

- Node.js v18 or higher
- npm or yarn
- Visa Acceptance merchant account with API credentials

## Setup (Windows PowerShell)

1) Install dependencies

```powershell
npm install
```

2) Create your .env file

```powershell
Copy-Item -Path ".env.template" -Destination ".env"
```

3) Edit `.env` and fill in:

- `VISA_ACCEPTANCE_MERCHANT_ID` – your Visa Acceptance merchant ID (sandbox)
- `VISA_ACCEPTANCE_API_KEY_ID` – your API key ID (sandbox)
- `VISA_ACCEPTANCE_SECRET_KEY` – your secret key (sandbox)
- `VISA_ACCEPTANCE_ENVIRONMENT=SANDBOX`
- `OPENAI_API_KEY` – required for the AI SDK model calls

4) Verify configuration

```powershell
npm run check
```

You should see environment = SANDBOX and all required variables present.

## Scripts (Windows PowerShell)

All scripts run against SANDBOX using credentials from `.env`.

- Create via NL
	- Invoice: `npm run nl:invoice -- "Create an invoice for 450.00 EUR to billing@acme.example for ACME Corp, due in 15 days."`
	- Payment Link: `npm run nl:pl -- "Create a payment link for 129.99 USD for ACME Plus."`

- Interactive creator
	- `npm run nl:interactive -- "Create an invoice for 250.00 EUR to bob@example.com for Bob, due in 10 days"`
	- Prompts for missing fields, confirms a summary, provides a retry option, and writes an audit record to `audit-log.jsonl` on success.

- Read/report (NL)
	- Invoices: `npm run nl:invoice:list -- "list last 10 invoices"`
	- Payment Links: `npm run nl:pl:list -- "list last 5 payment links"`
	- Output is shown as a compact table (ID, STATUS, AMOUNT, DUE for invoices; ID, STATUS, AMOUNT for links).

- Invoice operations (NL)
	- Get: `npm run nl:invoice:get -- "get invoice NL123456"`
	- Send: `npm run nl:invoice:send -- "send invoice NL123456"`
	- Cancel: `npm run nl:invoice:cancel -- "cancel invoice NL123456"`
	- Update: `npm run nl:invoice:update -- "update invoice NL123456 due on 2025-11-15 \"Consulting Q4\""`
		- You can include amount/currency if needed: `amount $240.00 USD`.
 - Payment Link operations (NL)
	- Create: `npm run nl:pl -- "Create a payment link for 129.99 USD for ACME Plus."`
	- List: `npm run nl:pl:list -- "list last 5 payment links"`
	- Get: `npm run nl:pl:get -- "get payment link PL123456"`
	- Update: `npm run nl:pl:update -- "update payment link PL123456 set amount to 25.00 for \"New Item\""`

 - Invoice operations (NL)
	- Get: `npm run nl:invoice:get -- "get invoice NL123456"`
	- Send: `npm run nl:invoice:send -- "send invoice NL123456"`
	- Cancel: `npm run nl:invoice:cancel -- "cancel invoice NL123456"`
	- Update: `npm run nl:invoice:update -- "update invoice NL123456 due on 2025-11-15 \"Consulting Q4\""`
		- You can include amount/currency if needed: `amount $240.00 USD`.

## Features

- AI‑first tool calling with graceful fallback to deterministic local parsing
- Helpful “Try:” error suggestions on common validation issues
	- Example hints: “Use a 3‑letter ISO currency code like USD or EUR (uppercase).”, “Choose a future dueDate in YYYY‑MM‑DD (e.g., in 10 days).”
- Date phrase support: “in N days/weeks”, “due on YYYY‑MM‑DD”, “due next Friday”, “end of month”, “next business day”
- Audit log written to `audit-log.jsonl` by the interactive flow

## PowerShell quoting tip

`$` can be expanded by PowerShell; prefer quoting prompts. For example:

```powershell
npm run nl:invoice -- "Create an invoice for 100 USD for Jane"
```

## Troubleshooting

- Verify SANDBOX env with `npm run check`.
- If an AI tool call fails, the example falls back to local parsing and prints a “Try:” hint.
- If `nl:invoice:update` reports missing amount/currency, add them to your prompt or ensure the invoice already has them.

## Smoke & tests

- Run the smoke sequence that executes direct example scripts sequentially (uses local `.env` if present):

	```powershell
	npm run smoke:direct
	```

Playwright (web UI)

- The web UI includes a Playwright test that verifies the Docs button and documentation link. From the `typescript/examples/web-ui` folder run:

	```powershell
	npm run test:playwright
	```

Note: Install Playwright and its browsers before running the Playwright tests by running `npm install` and `npx playwright install` in the `typescript/examples/web-ui` folder.

Troubleshooting smoke runner

- If you see errors about `spawnSync npx ENOENT` when running the Jest smoke test or `smoke:direct`, your environment may not have `npx` on PATH. Possible workarounds in PowerShell:

	```powershell
	# Option 1: run the smoke runner directly (already used by smoke:direct)
	node smoke-run.js

	# Option 2: run example scripts using the local ts-node binary
	.\node_modules\.bin\ts-node --transpile-only direct-invoice-create.ts

	# Option 3: invoke Node with ts-node/register (no global npx required)
	node -r ts-node/register direct-invoice-create.ts
	```

- In CI, ensure the job uses a Node/npm image that exposes `npx` (npm v7+). Alternatively install `ts-node` as a devDependency (already present) and call the local binary as shown above.