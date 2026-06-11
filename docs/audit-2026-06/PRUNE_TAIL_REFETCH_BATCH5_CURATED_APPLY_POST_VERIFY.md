# Refetch Source Apply

Generated at: 2026-06-10T15:05:45.657Z
Mode: dry-run
Input: docs/audit-2026-06/data/prune_tail_refetch_tavily_mimo_batch5_curated.jsonl

## Counts

| Metric | Value |
| --- | --- |
| input rows | 20 |
| eligible source rows | 25 |
| selected source rows | 25 |
| skipped source/decision rows | 3 |
| existing RawPoolItems | 25 |
| raw inserted | 0 |
| raw updated | 25 |
| keep audits inserted | 0 |
| keep audits already existed | 25 |

## Decisions

| Decision | Count |
| --- | --- |
| augment_source | 16 |
| replace_source | 9 |

## Source Types

| Source type | Count |
| --- | --- |
| official | 2 |
| exa | 22 |
| podcast | 1 |

## Top Hosts

| Host | Count |
| --- | --- |
| time.com | 3 |
| forbes.com | 2 |
| bbc.com | 1 |
| blogs.microsoft.com | 1 |
| britannica.com | 1 |
| cnbc.com | 1 |
| hwchung2.github.io | 1 |
| jbd.dev | 1 |
| mustafa-suleyman.ai | 1 |
| nobelprize.org | 1 |
| npr.org | 1 |
| openuk.uk | 1 |
| podcasts.apple.com | 1 |
| spanner.fyi | 1 |
| stability.ai | 1 |
| stvp.stanford.edu | 1 |
| technologyreview.com | 1 |
| ted.com | 1 |
| tedai-vienna.ted.com | 1 |
| theguardian.com | 1 |
| wbur.org | 1 |
| wired.com | 1 |

## Sample Applied Rows

| Person | Decision | Type | Title | Host | Raw | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| Daniela Amodei | augment_source | official | Daniela Amodei (Anthropic) – 'Helpful, Honest, Harmless' AI | stvp.stanford.edu | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk | forbes.com | would_update_raw | keep_audit_exists |
| Elon Musk | augment_source | exa | Elon Musk \| SpaceX, Tesla, xAI, X, & PayPal \| Britannica Money | britannica.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk among experts urging a halt to AI training | bbc.com | would_update_raw | keep_audit_exists |
| Elon Musk | replace_source | exa | Elon Musk Signs Open Letter Urging AI Labs to Pump the Brakes | time.com | would_update_raw | keep_audit_exists |
| Elon Musk | augment_source | exa | Elon Musk, AI and the antichrist: the biggest tech stories of 2025 \| Technology... | theguardian.com | would_update_raw | keep_audit_exists |
| Elon Musk | augment_source | exa | Walter Isaacson On Musk's Legacy and His Biography | time.com | would_update_raw | keep_audit_exists |
| Elon Musk | augment_source | exa | Who is part of Elon Musk’s DOGE, and what are they doing? : NPR | npr.org | would_update_raw | keep_audit_exists |
| Emad Mostaque | augment_source | exa | Emad Mostaque, Founder, Stability AI from State of Open: The UK in 2024 Phase O... | openuk.uk | would_update_raw | keep_audit_exists |
| Emad Mostaque | augment_source | exa | Stability AI Announcement — Stability AI | stability.ai | would_update_raw | keep_audit_exists |
| Emad Mostaque | augment_source | exa | Stability AI Founder Emad Mostaque Tanked His Billion-Dollar Startup | forbes.com | would_update_raw | keep_audit_exists |
| Emad Mostaque | augment_source | podcast | AI Will End Human Jobs: Emad M…–Digital Disruption with Geoff Nielson – Apple P... | podcasts.apple.com | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | augment_source | exa | AI pioneer Geoff Hinton: “Deep learning is going to be able to do ... | technologyreview.com | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | replace_source | exa | Geoffrey Hinton: AI Is the Next Industrial Revolution | time.com | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | augment_source | exa | The ‘Godfather of AI’ says we can’t afford to get it wrong \| On Point with Megh... | wbur.org | would_update_raw | keep_audit_exists |
| Geoffrey Hinton | augment_source | exa | Transcript from an interview with Geoffrey Hinton - NobelPrize.org | nobelprize.org | would_update_raw | keep_audit_exists |
| Hyung Won Chung | augment_source | exa | Another High-Profile OpenAI Researcher Departs for Meta \| WIRED | wired.com | would_update_raw | keep_audit_exists |
| Hyung Won Chung | augment_source | exa | Hyung Won Chung | hwchung2.github.io | would_update_raw | keep_audit_exists |
| Jaana Dogan | augment_source | exa | About · jbd.dev | jbd.dev | would_update_raw | keep_audit_exists |
| Jaana Dogan | augment_source | exa | About · spanner.fyi | spanner.fyi | would_update_raw | keep_audit_exists |
| Lukasz Kaiser | replace_source | exa | Lukasz Kaiser: What if AI stops guessing and starts reasoning? | ted.com | would_update_raw | keep_audit_exists |
| Lukasz Kaiser | replace_source | exa | TEDAI 2026 | tedai-vienna.ted.com | would_update_raw | keep_audit_exists |
| Mira Murati | replace_source | exa | Ex-OpenAI CTO Mira Murati raises $2 billion for new AI startup - CNBC | cnbc.com | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | exa | Mustafa Suleyman | mustafa-suleyman.ai | would_update_raw | keep_audit_exists |
| Mustafa Suleyman | replace_source | official | Mustafa Suleyman, DeepMind and Inflection Co-founder, joins Microsoft to lead C... | blogs.microsoft.com | would_update_raw | keep_audit_exists |

## Safety

- Additive only: this script does not delete existing RawPoolItem rows.
- It does not rewrite representative works, cards, roles, products, or People fields.
- Rows with hard blockers are skipped by default; low-authority selected sources are skipped by default.
