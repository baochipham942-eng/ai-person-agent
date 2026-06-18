# Company Evidence Pipeline

Company and institution pages own business, financial, partnership, and product-release evidence through future `CompanySource` records. Knowledge topic pages should not treat earnings calls, IR pages, SEC filings, or annual reports as first-class topic sources. Topic pages may link back to a traceable company-level `company_strategy_context` summary when company strategy helps explain a technical thread.

This directory is the dry-run entry point for company evidence packs. It does not write the database.

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

## Input Schema

`fetch_company_financial_sources.mjs` reads a JSON file shaped like this:

```json
{
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
      "label": "Anthropic News",
      "access": "free_web",
      "notes": "Official newsroom index."
    }
  ]
}
```

Candidate fields:

| Field | Required | Meaning |
|---|---:|---|
| `url` | yes | Candidate page or raw document URL |
| `role` | yes | One of the CompanySource roles above |
| `sourceKind` | yes | More specific type, for example `newsroom_article`, `docs_page`, `sec_10k`, `annual_report_pdf` |
| `label` | no | Human-readable source label |
| `publishedAt` | no | ISO date when known |
| `access` | no | `free_web`, `free_sec`, `api_key_optional`, or `paid_or_rate_limited` |
| `originalFileUrl` | no | Raw PDF/filing/transcript URL when the candidate page is a landing page |
| `notes` | no | Reviewer-facing context |

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

`review_company_evidence_pack.mjs` checks role coverage and source hygiene. It accepts fetch output or the original seed.

```json
{
  "pipeline": "company_evidence_review",
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
node scripts/company/review_company_evidence_pack.mjs --in=/tmp/company-evidence.json
```

Add `--strict` when CI should fail on review issues.

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
