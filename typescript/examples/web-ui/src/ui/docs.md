# Visa Acceptance Agent Toolkit — Embedded Guide

This is a trimmed, in-app reference of the implementation guide. Use the "Open full doc" button to view the full rendered documentation on GitHub.

## Overview

This POC demonstrates a small integration that uses:

- A local plain-JS extractor to parse free-text prompts into structured fields (`inferFromText` + `wordsToNumber`).
- The Visa Acceptance Agent Toolkit (server-side tools) to perform actions like creating invoices and payment links.
- Optional Vercel AI SDK integration where a model can be given tool access to call the toolkit directly (tool-calling pattern).

## Key UI features

- AI Agent Assistant panel — accepts NL prompts, extracts fields, and either prompts the user for missing fields or executes actions via the demo API.
- Create Invoice and Create Pay-by-Link forms (PURCHASE and DONATION modes).
- Smoke tests (Run Smoke Test) that exercise health, list/create/get flows and an AI dry-run.

## Extractor quick reference

- inferFromText(text): returns an object with optional keys: `amount`, `currency`, `memo`, `linkType`, `minAmount`, `maxAmount`.
- Recognizes numeric formats (commas, decimals), word numbers ("twenty-five"), and ranges ("between X and Y", "X to Y").
- Toggle `DEBUG` in `src/ui/extractor.js` to enable conditional console logging for debugging locally.

## How the UI uses the extractor

1. Client posts prompt to `/api/extract-fields` (server-side heuristics).
2. Client runs `inferFromText` locally and merges results with server response.
3. The UI prompts for missing fields or builds a payload for creation.

## Vercel AI SDK (tool-driven) summary

- Register toolkit tools with Vercel AI SDK using `tools: toolkit.getTools()`.
- The model can call tools like `createInvoice` and `createPaymentLink`; tool responses are structured JSON.

## Note about embedded markdown rendering

This in-app viewer uses a lightweight markdown-to-HTML routine to keep the UI self-contained. It supports headings, lists, code blocks, links, bold/italic, and inline code. For the full documentation (tables, images, and richer formatting), open the full doc on GitHub.


