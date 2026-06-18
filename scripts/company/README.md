# Company Evidence Pipeline

Company and institution pages own business, financial, partnership, and product-release evidence through future `CompanySource` records. Knowledge topic pages should not treat earnings calls, IR pages, SEC filings, or annual reports as first-class topic sources. Topic pages may link back to a traceable company-level `company_strategy_context` summary when company strategy helps explain a technical thread.

This directory is the dry-run entry point for company evidence packs. It does not write the database.

The P1 dry-run contract lives at `docs/company/company-source-contract.schema.json`. This round intentionally keeps Prisma migration deferred: the review goal is to prove source ownership, role coverage, URL hygiene, and thread-readiness boundaries before turning candidate evidence into durable `CompanySource` rows.

## Source Roles

| CompanySource role | Page use | Typical source | Access |
|---|---|---|---|
| `official_strategy` | Company narrative, AI strategy, research direction | Company blog/newsroom, CEO letter | Free web |
| `product_release` | Product surface, feature boundaries, release cadence | Product pages, docs, changelog, launch posts | Free web |
| `financial_signal` | Funding, revenue/capex priorities, risk factors, investor framing | Financing announcement, IR page, earnings transcript, SEC filing, annual report | SEC and company IR are often free; transcript vendors and private-market databases may need API/key |
| `partnership_signal` | Strategic partnerships and distribution | Company or partner announcement | Free web |
| `hiring_team_signal` | Team expansion, hiring direction, leadership changes | Hiring pages, role posts, team announcements | Free web |
| `technical_thread_link` | Company-to-thread relationship record | `/threads/[slug]` link metadata, backed by `CompanySource` | Internal link |

Use `sourceKind` for the finer source type: `official_blog`, `product_docs`, `product_changelog`, `financing_announcement`, `partnership_announcement`, `earnings_transcript`, `sec_10k`, `annual_report_pdf`, or `investor_presentation`.

Private companies often have no public SEC annual report or earnings transcript. Mark those unavailable financial source kinds under `notAvailableRoles` rather than forcing weak substitutes.

## Input Contract

`fetch_company_financial_sources.mjs` reads a JSON file shaped like this:

```json
{
  "schemaVersion": "company-source-seed/v1",
  "mode": "dry-run",
  "contract": "docs/company/company-source-contract.schema.json",
  "company": {
    "name": "Anthropic",
    "slug": "anthropic",
    "aliases": ["Claude"],
    "homepage": "https://www.anthropic.com",
    "publicCompany": false
  },
  "notAvailableRoles": [
    {
      "role": "financial_signal",
      "sourceKind": "sec_annual_report",
      "reason": "Private company; no public SEC annual report seed."
    }
  ],
  "candidates": [
    {
      "url": "https://www.anthropic.com/news",
      "role": "official_strategy",
      "sourceKind": "newsroom_index",
      "title": "Anthropic News",
      "label": "Anthropic News",
      "access": "free_web",
      "readinessUse": "company_strategy_context_only",
      "excludedFromTopicReadiness": true,
      "notes": "Official newsroom index."
    }
  ],
  "companyStrategyContexts": [
    {
      "id": "csc_anthropic_loop_engineering",
      "threadSlug": "loop-engineering",
      "threadTitle": "Loop Engineering",
      "relationType": "productizes",
      "summary": "Company-level background only.",
      "sourceIds": ["cs_anthropic_newsroom"],
      "excludedFromTopicReadiness": true,
      "readinessNote": "Do not count this context toward thread required roles."
    }
  ],
  "threadReadinessExports": []
}
```

Candidate fields:

| Field | Required | Meaning |
|---|---:|---|
| `url` | yes | Candidate page or raw document URL |
| `role` | yes | One of the CompanySource roles above |
| `sourceKind` | yes | More specific type, for example `newsroom_article`, `docs_page`, `sec_10k`, `annual_report_pdf` |
| `title` | yes | Stable CompanySource title |
| `label` | no | Human-readable source label |
| `publishedAt` | no | ISO date when known |
| `access` | no | `free_web`, `free_sec`, `api_key_optional`, or `paid_or_rate_limited` |
| `originalFileUrl` | no | Raw PDF/filing/transcript URL when the candidate page is a landing page |
| `readinessUse` | yes | `company_page_only` or `company_strategy_context_only` |
| `excludedFromTopicReadiness` | yes | Must be `true` for CompanySource dry-run records |
| `notes` | no | Reviewer-facing context |

`companyStrategyContexts` are thread backlinks, not thread evidence. Each context must carry `sourceIds` and `excludedFromTopicReadiness=true`. Financial, IR, earnings, SEC, annual report, and financing sources stay `company_page_only`.

## Fetch Output Schema

The fetcher writes JSON to stdout by default:

```json
{
  "pipeline": "company_evidence",
  "dryRun": true,
  "company": {},
  "sources": [
    {
      "id": "sha256...",
      "url": "https://example.com",
      "finalUrl": "https://example.com",
      "canonicalUrl": "https://example.com",
      "role": "official_strategy",
      "sourceKind": "newsroom_article",
      "title": "Page title",
      "snippet": "Short text preview",
      "text": "Extracted readable text",
      "textLength": 1234,
      "metadata": {
        "host": "example.com",
        "status": 200,
        "contentType": "text/html",
        "fetchedAt": "2026-06-18T00:00:00.000Z",
        "access": "free_web",
        "documentLinks": []
      },
      "fetch": {
        "ok": true,
        "status": 200,
        "error": null
      }
    }
  ]
}
```

Run it:

```bash
node scripts/company/fetch_company_financial_sources.mjs --input=docs/company/anthropic-evidence-seed.json --limit=3
```

Useful flags:

| Flag | Default | Meaning |
|---|---|---|
| `--input=<path>` | `docs/company/anthropic-evidence-seed.json` | Seed file |
| `--out=<path>` | none | Write JSON to file instead of stdout |
| `--limit=<n>` | all | Fetch only the first n candidates |
| `--timeout-ms=<n>` | `15000` | Per-URL timeout |
| `--max-text-chars=<n>` | `12000` | Cap stored extracted text |
| `--no-text` | false | Emit snippets and lengths without full `text` |

## Review Output Schema

`review_company_sources.mjs` is the P1 review gate. It accepts fetch output or the original seed and checks:

- Required role coverage: `official_strategy`, `product_release`, `financial_signal`, `partnership_signal`, `hiring_team_signal`.
- Duplicate source IDs and canonical URLs.
- Unknown roles and missing required fields.
- Financial / IR placement: company page only, excluded from topic readiness, no strategy-context reference.
- `company_strategy_context` must include valid `sourceIds`.
- `threadReadinessExports` must stay empty.

```json
{
  "pipeline": "company_sources_review",
  "review": {
    "pass": true,
    "sourceCountsByRole": {
      "official_strategy": 1
    },
    "unknownRoles": [],
    "duplicateUrls": [],
    "missingOriginalFileLinks": [],
    "thinSources": [],
    "fetchFailures": []
  }
}
```

Run it:

```bash
node scripts/company/review_company_sources.mjs --input=docs/company/anthropic-evidence-seed.json --strict
```

Add `--strict` when CI should fail on review issues.

`review_company_evidence_pack.mjs` remains a lighter backward-compatible hygiene check for older evidence-pack outputs.

## Staging Materialize Preview

`materialize_company_sources.mjs` turns the reviewed dry-run pack into a stable staging artifact shaped like the future `CompanySource` and `CompanyThreadLink` rows. By default it does not write the database. Execute mode requires the `CompanySource` migration to be applied and refuses production or unconfirmed remote databases.

Before any migration or execute attempt, run the rollout preflight:

```bash
pnpm company:preflight -- --input=docs/company/anthropic-evidence-seed.json --output=/tmp/company-source-preflight.json
```

Default preflight does not query the database. After `DATABASE_URL` points to a confirmed local/dev/staging database, add `--check-db`:

```bash
pnpm company:preflight -- --check-db --input=docs/company/anthropic-evidence-seed.json --output=/tmp/company-source-preflight-db.json
```

Run it:

```bash
pnpm company:materialize -- --input=docs/company/anthropic-evidence-seed.json --strict --output=/tmp/company-sources-staging.json
```

The output includes:

- `dryRunResult.companySources`: future `CompanySource` row previews, with canonical URL hashes and company-page readiness boundaries.
- `dryRunResult.companyThreadLinks`: company-to-thread backlinks backed by company evidence IDs.
- `dryRunResult.p0ViewModelPreview`: the shape the company page can consume without treating company evidence as topic readiness.

After applying the migration to a local or confirmed dev/staging database, execute mode can upsert reviewed rows:

```bash
pnpm company:materialize -- --execute --create-organization --input=docs/company/anthropic-evidence-seed.json --output=/tmp/company-sources-apply.json
```

Remote dev/staging databases require `--allow-remote-dev`. Production and Vercel environments are refused.

## Access Boundary

Allowed by default:

- Company official sites, docs, changelogs, blog/newsroom pages.
- Company IR pages and annual report PDFs.
- SEC EDGAR pages and company submissions API, with fair-access user agent.
- Partner company announcements.

Do not use by default:

- Paid transcript databases.
- Private-market valuation databases.
- xAI/Grok/X Search balances or any secret key.
- Writes into `RawPoolItem`, `KnowledgeSource`, `CompanySource`, or other production tables.
