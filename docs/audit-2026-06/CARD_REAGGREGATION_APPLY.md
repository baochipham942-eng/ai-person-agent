# Card Reaggregation Apply

Generated at: 2026-06-10T08:41:45.056Z

## Result

Top 5 card reaggregation has been executed person-by-person. Each execute run used `--person` and archived that person's previous cards for rollback/review.

## Counts

| Metric | Value |
| --- | ---: |
| people executed | 5 |
| old cards replaced | 68 |
| new cards inserted | 24 |
| MiMo keep cards applied | 21 |
| MiMo rewrite cards applied | 3 |
| MiMo human_review cards skipped | 1 |
| verification mismatched people | 0 |

## People

| Person | Old Cards | New Cards | Report | Archive |
| --- | ---: | ---: | --- | --- |
| Yoshua Bengio | 12 | 5 | `docs/audit-2026-06/CARD_REAGGREGATION_APPLY_YOSHUA_BENGIO.md` | `docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_yoshua_bengio_archive.json` |
| 周明 | 18 | 3 | `docs/audit-2026-06/CARD_REAGGREGATION_APPLY_ZHOU_MING.md` | `docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_zhou_ming_archive.json` |
| 杨植麟 | 15 | 5 | `docs/audit-2026-06/CARD_REAGGREGATION_APPLY_YANG_ZHILIN.md` | `docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_yang_zhilin_archive.json` |
| 闫俊杰 | 9 | 6 | `docs/audit-2026-06/CARD_REAGGREGATION_APPLY_YAN_JUNJIE.md` | `docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_yan_junjie_archive.json` |
| 亚历克·拉德福德 | 14 | 5 | `docs/audit-2026-06/CARD_REAGGREGATION_APPLY_ALEC_RADFORD.md` | `docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_apply_alec_radford_archive.json` |

## Verification

Database verification compared current Card rows with the MiMo-reviewed keep/rewrite set by title, content, sourceUrl, type, and importance:

- Yoshua Bengio: expected 5, actual 5, missing 0, extra 0.
- 周明: expected 3, actual 3, missing 0, extra 0.
- 杨植麟: expected 5, actual 5, missing 0, extra 0.
- 闫俊杰: expected 6, actual 6, missing 0, extra 0.
- 亚历克·拉德福德: expected 5, actual 5, missing 0, extra 0.

## Safety

- `human_review` cards were skipped.
- `rewrite` cards used MiMo-provided conservative rewritten text.
- Each person's delete-and-insert replacement now runs inside a Neon transaction in `scripts/fix/apply_card_reaggregation_plan.mjs`.
