## Visa Acceptance Agent Toolkit — AI agent quickstart

Audience: AI coding agents working in this repo. Goal: be productive fast with the right entry points, workflows, and conventions.

## Big picture

- Two integration surfaces, shared core:
  - Vercel AI SDK tools: `VisaAcceptanceAgentToolkit#getTools()` for function-calling flows.
  - MCP server: same tools exposed for MCP runners.
- Source of truth for behavior lives in examples; treat them as the contract for NL wrappers, hints, and audit logging.

## Key files and boundaries

- Core types/utilities: `src/shared/*` (API client, config, tool definitions, normalizers).
- AI SDK runtime: `src/ai-sdk/toolkit.ts` (implements `VisaAcceptanceAgentToolkit` and `getTools()`); built entrypoints under `typescript/ai-sdk/*`.
- MCP runtime: `src/modelcontextprotocol/toolkit.ts`; built entrypoints under `typescript/modelcontextprotocol/*`.
- Example CLIs (canonical behavior): `typescript/examples/ai-sdk/*` (e.g., `nl-invoice.ts`, `interactive-nl.ts`).
- Web UI demo: `typescript/examples/web-ui` (unified `/api/assist` with confirmation step for mutating actions).

## Environment & configuration

- Env vars only (no hard-coding): `VISA_ACCEPTANCE_MERCHANT_ID`, `VISA_ACCEPTANCE_API_KEY_ID`, `VISA_ACCEPTANCE_SECRET_KEY`, `VISA_ACCEPTANCE_ENVIRONMENT` (default SANDBOX).
- Configure allowed actions when constructing the toolkit (mirror across AI SDK and MCP):
  - Invoices: `create|update|list|get|send|cancel`
  - Payment links: `create|update|list|get`

## Dev workflows (Windows PowerShell)

- Build (from `typescript/`):
  - `npm install`; `npm run build` (tsup → ESM/CJS + types).
- Run examples (from `typescript\examples\ai-sdk`):
  - `Copy-Item .env.template .env`; fill SANDBOX creds; `npm run check`.
  - NL create: `npm run nl:invoice -- "Create an invoice for 450 EUR for ACME Corp, due in 15 days."`
  - Interactive: `npm run nl:interactive -- "Create an invoice for 250 EUR …"` (writes `audit-log.jsonl`).
- Tests/smoke:
  - `npm run smoke:direct`; `npm run test:smoke` (ai-sdk). Playwright in `examples/web-ui`: `npm run test:playwright`.
- MCP (quick): `npx -y @visaacceptance/mcp --tools=all --merchant-id=... --api-key-id=... --secret-key=...`.
  - PowerShell note: quote prompts; `$` expands in double quotes.

## Patterns that matter

- AI-first with deterministic local fallback: examples parse and validate locally if model/tool calls fail and emit targeted “Try:” hints (currency, due dates, amounts).
- Date phrases supported in examples: “in N days/weeks”, “due next Friday”, “end of month”, “next business day”, ISO `YYYY-MM-DD`.
- Output normalization for UI: server enriches lists (e.g., payment link URL/created) when affordable; invoices/pay-links return `{ invoices|paymentLinks, total }`.
- Parity: when adding tools, keep AI SDK and MCP options in sync; mirror `actions` shape and wire through `getTools()`.

## Integration points & deps

- Uses `cybersource-rest-client` and `axios` to call Visa Acceptance SANDBOX; treat these as real network integrations (creds required in dev/CI).
- External runtimes: `@modelcontextprotocol/sdk`, `ai` (Vercel AI), `openai` (optional in examples; flows still work via local fallback).

## Quick map (scripts → files)

- `nl:invoice` → `typescript/examples/ai-sdk/nl-invoice.ts`
- `nl:interactive` → `typescript/examples/ai-sdk/interactive-nl.ts`
- `nl:pl` → `typescript/examples/ai-sdk/nl-paymentlink.ts`
- Smoke: `smoke-run.js` / `smoke.ts` in `examples/ai-sdk`

If something’s unclear, share the command/output you tried and the action (e.g., `nl:invoice:update`); we’ll point to the exact function or file.
