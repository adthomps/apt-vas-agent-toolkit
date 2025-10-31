# Visa Acceptance Agent Toolkit (TypeScript) — Setup Guide

This guide walks you through setting up the TypeScript toolkit locally, configuring SANDBOX credentials, and running the AI SDK examples (natural language and interactive flows).

## 1. Prerequisites

- Node.js 18+
- npm
- Visa Acceptance SANDBOX credentials: Merchant ID, API Key ID, Secret Key

## 2. Install dependencies (root TypeScript package)

From `typescript/`:

```powershell
npm install
```

This installs build tooling (tsup) and dependencies used by the package. A build is run as part of `prepare`.

## 3. Build the toolkit

```powershell
npm run build
```

This compiles the AI SDK and MCP entrypoints (ESM and CJS) and generates type definitions.

## 4. Configure the AI SDK examples

The examples demonstrate natural‑language creation/listing and an interactive assistant.

```powershell
Push-Location ".\examples\ai-sdk"
npm install
Copy-Item -Path ".env.template" -Destination ".env"
notepad .env
```

Fill in:

- VISA_ACCEPTANCE_MERCHANT_ID=...
- VISA_ACCEPTANCE_API_KEY_ID=...
- VISA_ACCEPTANCE_SECRET_KEY=...
- VISA_ACCEPTANCE_ENVIRONMENT=SANDBOX
- OPENAI_API_KEY=... (optional; examples fall back to local parsing if missing)

Verify configuration:

```powershell
npm run check
Pop-Location
```

## 5. Run natural‑language examples

From `typescript/examples/ai-sdk`:

- Create invoice (AI‑first, with fallback):
  ```powershell
  npm run nl:invoice -- "Create an invoice for 450 EUR for ACME Corp, due in 15 days."
  ```
- Create payment link:
  ```powershell
  npm run nl:pl -- "Create a payment link for 129.99 USD for ACME Plus."
  ```
- Interactive assistant (guided collection, confirmation, retry, audit logging):
  ```powershell
  npm run nl:interactive -- "Create an invoice for 250 EUR for Bob, email bob@example.com due in 10 days"
  ```

Web UI AI Assistant (unified endpoint):

- The demo UI uses a single server endpoint `POST /api/assist` to power AI flows.
- List actions return normalized results immediately; mutating actions first return a confirmation payload and then execute when `confirm=true` is posted.
- Payment link list responses are normalized and enriched so UI tables show “Created” and “Actions” reliably.

## 6. Read/report examples (tables)

- Invoices list:
  ```powershell
  npm run nl:invoice:list -- "list last 10 invoices"
  ```
- Payment links list:
  ```powershell
  npm run nl:pl:list -- "list last 5 payment links"
  ```

## 7. Invoice operations (NL wrappers)

- Get:
  ```powershell
  npm run nl:invoice:get -- "get invoice NL123456"
  ```
- Send:
  ```powershell
  npm run nl:invoice:send -- "send invoice NL123456"
  ```
- Cancel:
  ```powershell
  npm run nl:invoice:cancel -- "cancel invoice NL123456"
  ```
- Update (parses due date/description and fetches existing amount/currency when not provided):
  ```powershell
  npm run nl:invoice:update -- "update invoice NL123456 due on 2025-11-15 \"Consulting Q4\""
  ```
  - You can include amount/currency explicitly if needed:
    ```powershell
    npm run nl:invoice:update -- "update invoice NL123456 amount $240.00 USD due on 2025-11-15 \"Consulting Q4\""
    ```

## 8. PowerShell quoting tips

- `$` can be expanded by PowerShell. Always quote prompts that include currency:
  ```powershell
  npm run nl:invoice -- "Create an invoice for 100 USD for Jane"
  ```

## 9. Error suggestions and date phrases

- The examples surface short, reason‑specific suggestions when validation fails (currency format, past due date, amount missing).
- Supported due phrases: “in N days/weeks”, “due on YYYY‑MM‑DD”, “due next Friday”, “end of month”, “next business day”.

## 10. Audit logging

- The interactive assistant appends a JSON line to `audit-log.jsonl` for each successful creation (timestamp, type, summary, id, params).

## 11. Troubleshooting

- Run `npm run check` in the examples folder to verify your SANDBOX env.
- If an AI tool call fails, the examples fall back to a deterministic local parser and print a “Try:” hint where possible (e.g., “Use a 3‑letter ISO currency code like USD or EUR”).
- If `nl:invoice:update` reports missing amount/currency, include them explicitly in your prompt or ensure the invoice already contains them.

## Deploy the example UI to Vercel

See `examples/web-ui/README.md` for step-by-step instructions. In short:

- Root Directory: `typescript/examples/web-ui`
- Build Command: `npm run build`
- Output Directory: `dist`
- Set environment variables: `VISA_ACCEPTANCE_MERCHANT_ID`, `VISA_ACCEPTANCE_API_KEY_ID`, `VISA_ACCEPTANCE_SECRET_KEY`, `VISA_ACCEPTANCE_ENVIRONMENT=SANDBOX`, optional `OPENAI_API_KEY`, optional `VISA_ACCEPTANCE_API_MOCK=true` for demo mode.
