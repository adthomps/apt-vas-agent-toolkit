# Changelog

All notable changes to this project will be documented in this file.

## 2025-10-25

- Added natural-language (NL) creation flows for invoices and payment links (AI-first with robust local fallback).
- Added interactive NL assistant: gathers missing fields, confirms summary, retries on error, writes JSONL audit logs.
- Implemented reason-specific error suggestions for common validation issues (currency, amount, due date, invoice number, email).
- Added NL listing/reporting for invoices and payment links with compact table output.
- Added NL wrappers for invoice operations: get, send, cancel, update (update fetches current invoice when needed).
- Improved date/email parsing and surfaced clearer error messages with structured results.
- Polished listInvoices return shape and masking utilities; normalized list scripts for varied client responses.
- Verified SANDBOX connectivity; added quick smoke runs in examples.
- Documentation: created SETUP.md and IMPLEMENTATION.md; updated READMEs and added quick links.
