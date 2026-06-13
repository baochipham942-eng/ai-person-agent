# Agent Team Execution Plan

> Date: 2026-06-13
> Scope: finish the remaining AI People product goals without exhausting local memory.

## Current Target

Move the product from local feature completeness to production-trust readiness:

1. Production migrations and ActivityEvent backfill are ready, safe, and evidence-backed.
2. Newsletter can be configured and tested with a small production batch.
3. High-traffic people quality review can be applied in small, auditable batches.
4. Thin topic/org entries are converted into prioritized remediation batches.
5. Every heavy step has a limit, dry-run mode, output artifact, and explicit write guard.

## Hard Boundaries

1. Do not run production writes without explicit confirmation.
2. Do not send real newsletter emails without explicit confirmation.
3. Do not apply influence score changes without an audit log and explicit confirmation.
4. Do not run full-data jobs locally unless a script proves it can page or batch.
5. Do not run multiple heavy database jobs at the same time.
6. Do not start dev servers for agent-side work unless the task is specifically UI verification.

## Local Performance Rules

1. Default CLI limits:
   - Activity backfill dry-run: `--limit=500` or lower.
   - Newsletter dry-run/preflight: `--limit=5 --event-limit=8`.
   - Quality review pack: `--limit=20`.
   - Quality apply dry-run: `--limit=20`.
   - Entity density audit: core 20 entries, remediation output limited to the top queue.
   - Influence calibration: `--limit=24 --batch-size=8`, with `/tmp` summary output.
2. Heavy validation order:
   - `node --check <changed-script>`
   - targeted dry-run with small limits
   - `npm run lint`
   - `npx tsc --noEmit`
   - `npm run build` only once after integration
3. Browser checks:
   - Prefer in-app browser when the Browser control channel is healthy.
   - If Browser control is unavailable, record that and use HTTP/build evidence instead of retry loops.
4. Output artifacts:
   - Write large reports under `/tmp`.
   - Keep repo docs to summaries, commands, counts, and next decisions.

## Influence Calibration Guard

Owner scope:

1. `scripts/influence/*.mjs`
2. `lib/influence*.ts`
3. `app/admin/influence/**`
4. `app/api/admin/influence/**`
5. `docs/PRODUCT_EXECUTION_BOARD_2026_06.md` PG-010

Target:

1. Generate a bounded decision template before any audit write.
2. Replay decisions in dry-run mode with `--summary-output` before `--execute`.
3. Keep production chunks at `--limit<=24` and `--batch-size<=8`.
4. Use `nextResumeAfterPersonId` from the summary for continuation.
5. Apply score changes only after the separate `--execute --apply-score` confirmation.

Validation:

```bash
node --check scripts/influence/calibrate_scores.mjs
npm run influence:calibrate -- --limit=3 --batch-size=2 --status=review --decision-template=/tmp/ai-person-influence-decisions.json --summary-output=/tmp/ai-person-influence-template-summary.json
npm run influence:calibrate -- --decisions=/tmp/ai-person-influence-decisions.json --limit=3 --batch-size=2 --summary-output=/tmp/ai-person-influence-replay-summary.json
```

## Agent Workstreams

### A. Ops and Activity Backfill

Owner scope:

1. `scripts/ops/*.mjs`
2. `scripts/activity/*.mjs`
3. `docs/PRODUCT_EXECUTION_BOARD_2026_06.md` PG-001 to PG-004

Target:

1. Keep production rollout dry-run by default.
2. Ensure ActivityEvent backfill can run in bounded chunks.
3. Ensure rollout evidence clearly states pending migrations and next write command.

Validation:

```bash
node --check scripts/ops/production_rollout.mjs
node --check scripts/activity/materialize_activity_events.mjs
npm run ops:migration-plan -- --output=/tmp/ai-person-migration-plan.json
npm run ops:production-rollout -- --activity-limit=200 --output=/tmp/ai-person-production-rollout-dry-run.json
```

### B. Quality Review Batch Apply

Owner scope:

1. `scripts/audit/quality_review_queue.mjs`
2. `scripts/audit/apply_quality_review_decisions.mjs`
3. `README.md` quality review commands
4. `docs/PRODUCT_EXECUTION_BOARD_2026_06.md` PG-007

Target:

1. Review pack stays small and human-editable.
2. Apply script processes a bounded slice and isolates per-row errors.
3. Dry-run summary shows applied/noop/skipped/errors before any write.

Validation:

```bash
node --check scripts/audit/quality_review_queue.mjs
node --check scripts/audit/apply_quality_review_decisions.mjs
npm run audit:quality-review -- --limit=20 --decision-template=/tmp/ai-person-quality-decisions.json --review-pack-output=/tmp/ai-person-quality-review-pack.json
npm run audit:quality-apply -- --file=/tmp/ai-person-quality-decisions.json --limit=20
```

### C. Entity Density Remediation

Owner scope:

1. `scripts/audit/entity_density_audit.mjs`
2. `lib/entity-pages.ts`
3. `components/entity/*`
4. `docs/PRODUCT_EXECUTION_BOARD_2026_06.md` PG-009

Target:

1. Keep the audit bounded to core topic/org entries.
2. Emit a remediation queue that can be executed in small batches.
3. Separate missing people, missing activity, and missing works so no agent tries to fix everything at once.

Validation:

```bash
node --check scripts/audit/entity_density_audit.mjs
npm run audit:entity-density -- --output=/tmp/ai-person-entity-density.json --remediation-output=/tmp/ai-person-entity-remediation.json
```

### D. Newsletter Production Config

Owner scope:

1. `scripts/newsletter/*.mjs`
2. `lib/newsletter*.ts`
3. `app/admin/newsletter/**`
4. `app/api/admin/newsletter/**`
5. `docs/PRODUCT_EXECUTION_BOARD_2026_06.md` PG-005 / PG-006

Target:

1. Keep weekly digest generation dry-run by default.
2. Verify delivery schema, provider env, sender, site URL, token secret, and Resend key before any small send.
3. Require `--confirm-newsletter-send` for real sending.
4. Run the same preflight automatically before any real `--send` proceeds.
5. Keep first production batch at `--limit=5 --event-limit=8`.

Validation:

```bash
node --check scripts/newsletter/build_weekly_digest_email.mjs
npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8
npm run newsletter:weekly -- --limit=5 --event-limit=8
```

## Execution Order

1. Integrate low-memory script safeguards.
2. Re-run small dry-runs and refresh the execution board.
3. Ask for confirmation only for the first production write batch:
   - migrations first,
   - ActivityEvent backfill second,
   - newsletter small send third,
   - quality apply fourth.
4. After each write batch, run the matching read-only evidence command before moving on.

## Done Criteria For This Push

1. All remaining P0 tasks have either a safe executable command or an explicit external blocker.
2. Every heavy local command has a bounded default or documented limit.
3. The execution board states the next production action without pretending it has already run.
4. Local verification passes without starting unnecessary long-running processes.

## 2026-06-13 Progress

Completed low-memory safeguards:

1. `scripts/activity/materialize_activity_events.mjs`
   - Reads RawPoolItem rows in bounded batches.
   - Default `--limit=500`, `--batch-size=100`.
   - Supports `--cursor` and emits `nextCursor` for continuation.
2. `scripts/ops/production_rollout.mjs`
   - Passes `--activity-batch-size` and `--activity-cursor` through to ActivityEvent backfill.
   - Keeps production writes behind `--confirm-production`.
3. `scripts/audit/quality_review_queue.mjs`
   - Supports `--batch-size`, `--max-people`, `--resume-offset`, `--summary-output`.
   - Adds bounded per-batch row limits for relation, activity, and QA backlog rows.
4. `scripts/audit/apply_quality_review_decisions.mjs`
   - Supports `--batch-size`, `--resume-offset`, `--summary-output`.
   - Keeps apply mode dry-run unless `--execute` is passed.
5. `scripts/audit/entity_density_audit.mjs`
   - Uses the canonical topic registry.
   - Supports `--top`, `--batch-missing`, `--batch-size`, `--sample-limit`, and `--source-row-limit`.
   - Emits `remediationBatches` and `nextBatchExecutionList`.

Verification completed:

```bash
node --check scripts/activity/materialize_activity_events.mjs
node --check scripts/ops/production_rollout.mjs
node --check scripts/audit/quality_review_queue.mjs
node --check scripts/audit/apply_quality_review_decisions.mjs
node --check scripts/audit/entity_density_audit.mjs
npm run audit:quality-review -- --limit=10 --batch-size=5 --max-people=20 --relation-row-limit=200 --activity-row-limit=200 --qa-row-limit=80 --summary-output=/tmp/ai-person-quality-summary-agent-team.json --decision-template=/tmp/ai-person-quality-decisions-agent-team.json --review-pack-output=/tmp/ai-person-quality-review-pack-agent-team.json
npm run audit:quality-apply -- --file=/tmp/ai-person-quality-decisions-agent-team.json --limit=10 --batch-size=5 --summary-output=/tmp/ai-person-quality-apply-summary-agent-team.json
npm run audit:entity-density -- --top=8 --batch-size=5 --sample-limit=1 --source-row-limit=40 --output=/tmp/ai-person-entity-density-agent-team.json --remediation-output=/tmp/ai-person-entity-remediation-agent-team.json
npm run ops:migration-plan -- --local-only --output=/tmp/ai-person-migration-plan-agent-team.json
node scripts/ops/production_rollout.mjs --execute-activity-backfill
npm run lint
npx tsc --noEmit
git diff --check
```

Observed results:

1. Quality review small batch scanned 15 people, queued 13 people, found 13 issues, `critical=0`, `high=1`.
2. Quality apply dry-run processed 10 decisions in 2 batches, `noop=10`, `skipped=0`, `errors=0`, `nextResumeOffset=10`.
3. Entity density core 20 audit returned 10 ready and 10 thin. Next batch is 开发者工具/AI Coding, DeepSeek, Hugging Face, Kimi, and Perplexity.
4. Local-only migration SQL scan returned `safeToApply=true`, `destructiveCount=0`, `reviewCount=0`. Local-only scans SQL files and does not represent live production pending status.
5. Rollout write guard blocked `--execute-activity-backfill` without `--confirm-production`, as intended.

PG-009 first batch handoff:

1. `docs/CONTENT_DENSITY_BATCH_2026_06_13_PG009_FIRST.md` turns the first 5 `nextBatchExecutionList` entries into small batches.
2. `scripts/audit/entity_density_audit.mjs` now emits `candidatePackages.groups.people/activity/works` in remediation JSON, so the next agent can start from one batch without reading the whole queue by hand.
3. First execution lane is people: 开发者工具/AI Coding +8, DeepSeek +3, Hugging Face +2, Kimi +4, Perplexity +1.
4. Second lane is activity: 开发者工具/AI Coding +9, DeepSeek +5, Hugging Face +5, Perplexity +4.
5. Third lane is works: 开发者工具/AI Coding +4, DeepSeek +5, Hugging Face +5, Kimi +5, Perplexity +4.
6. This handoff is candidate-only: no database write, no automated broad crawl, no production rollout command.

2026-06-13 continued agent push:

1. Newsletter guarded send path is stricter now:
   - `--send` still requires `--confirm-newsletter-send`.
   - Real send mode automatically runs the same preflight before loading subscriptions or calling the provider.
   - Current preflight fails safely because `NewsletterDeliveryLog` provider columns and site URL are missing.
   - Dry-run returns `subscriptions=0`, `generated=0`, no log write, no email send.
2. Influence calibration is ready for human review in small batches:
   - `--limit` is capped at 24 and `--batch-size` at 8.
   - A 3-person template run returned 3 review candidates and wrote `/tmp/ai-person-influence-summary-agent-team-2.json`.
   - Decision replay processed 3 dry-run decisions with `auditWritten=0`, `applied=0`, `errors=0`.
   - Resume mode found the previous anchor and emitted the next `nextResumeAfterPersonId`.
3. PG-009 candidate package was revalidated:
   - First sandboxed DB attempt could not reach the Neon pooler.
   - The same bounded command passed outside the sandbox with no writes.
   - Core 20 result remains `10 ready / 10 thin`; next batch remains 开发者工具/AI Coding, DeepSeek, Hugging Face, Kimi, Perplexity.
4. Integration checks completed:
   - `node --check` passed for Newsletter, Influence, and Entity Density scripts.
   - `npm run lint`, `npx tsc --noEmit`, and `git diff --check` passed.
   - `npm run build` was intentionally not run in this pass to avoid a heavy local build.

2026-06-13 authorized production push:

1. Production migrations were applied with `npx prisma migrate deploy --schema=prisma/schema.prisma`.
   - Applied ActivityEvent, NewsletterDeliveryLog, InfluenceScoreAuditLog, and newsletter provider migrations.
   - `npx prisma migrate status --schema=prisma/schema.prisma` now reports the database schema is up to date.
   - `/tmp/ai-person-migration-plan-after-authorized.json` reports `pendingMigrations=[]`.
2. ActivityEvent first production batch was completed.
   - Dry-run scanned 500 rows and found 500 materializable events.
   - Execute run upserted 500 events with `--limit=500 --batch-size=100`.
   - Next cursor is `edf24e41-4280-4795-84d6-e849c90e0cf3`.
   - Readiness now reports `activity.total=500`, `recent30d=500`, `activity-backfill=ready`.
   - Event mix is article 443, video 22, github 20, podcast 15.
3. Quality review latest pack is ready for human review.
   - `/tmp/ai-person-quality-review-pack-latest20.json`
   - `/tmp/ai-person-quality-decisions-suggested-latest20.json`
   - Suggested decisions dry-run passed with `dryRun=58`, `applied=0`, `skipped=0`, `errors=0`.
4. Influence calibration latest pack is ready for human review.
   - `/tmp/ai-person-influence-decisions-suggested-latest24.json`
   - Suggested replay passed with `dryRun=24`, `auditWritten=0`, `applied=0`, `skipped=0`, `errors=0`.
5. Newsletter config check is unblocked at schema level.
   - `NewsletterDeliveryLog` provider columns are ready.
   - Current env still lacks site URL for default preflight.
   - With a temporary `PRODUCTION_BASE_URL`, dry-run preflight passes.
   - True send still requires Resend API key, verified domain/from email, send switch, and explicit confirmation.
6. PG-009 People candidate package was generated at `docs/CONTENT_DENSITY_PEOPLE_CANDIDATES_2026_06_13.md`.

Blocked before authorized follow-up:

1. Newsletter provider/domain/sender configuration and small real send.
2. Human approval to apply `/tmp/ai-person-quality-decisions-suggested-latest20.json` with `--execute`.
3. Human approval to write Influence audit rows from `/tmp/ai-person-influence-decisions-suggested-latest24.json` with `--execute`.
4. Separate human approval before any Influence `--apply-score`.
5. Optional ActivityEvent continuation from cursor `edf24e41-4280-4795-84d6-e849c90e0cf3`.

2026-06-13 authorized follow-up:

1. Quality review suggested decisions were partially applied.
   - Created `/tmp/ai-person-quality-decisions-keep-only-latest20.json`.
   - Applied only the 8 suggested `keep` rows.
   - Left 50 `review` rows untouched to preserve existing detailed review reasons.
   - `/tmp/ai-person-quality-apply-keep-only-latest20.json` reports `applied=8`, `skipped=0`, `errors=0`.
   - Post-apply review pack reports `critical=0`, `high=2`, `qaReviewRows=118`.
2. Influence audit rows were written without changing scores.
   - Used `/tmp/ai-person-influence-decisions-suggested-latest24.json`.
   - Ran with `--execute` and without `--apply-score`.
   - `/tmp/ai-person-influence-audit-suggested-latest24.json` reports `auditWritten=24`, `applied=0`, `errors=0`.
   - Readiness now reports `influence.audits=24`; latest audit has `appliedScore=null`.
3. ActivityEvent continuation was completed.
   - Continued from cursor `edf24e41-4280-4795-84d6-e849c90e0cf3`.
   - Dry-run found only 27 remaining materializable rows in the 90-day window.
   - Execute run upserted 27 rows and emitted `nextCursor=fe239bb2-5be5-4dbd-812d-998b1b665481`.
   - Readiness now reports `activity.total=527`, `recent30d=527`, `activity-backfill=ready`.
4. Current production readiness:
   - Activity schema/backfill ready.
   - Newsletter schema ready; later local config and send preflight passed, but real-send observation is still pending.
   - Influence schema/audit observation ready.
   - Overall status remains `pending` because Newsletter real-send observation is not done, and the send switch is intentionally closed outside a send window.

Still open after authorized follow-up:

1. Newsletter deployment env sync, subscribed recipient, and small real send.
2. Optional manual review of the remaining 50 quality `review` rows.
3. Separate human approval before any Influence `--apply-score`.

2026-06-13 continued push after Newsletter values:

1. Newsletter local env was configured without writing secrets into docs.
   - `.env.local` now has `PRODUCTION_BASE_URL=https://people.llmxy.xyz`, provider `resend`, sender `AI 人物库 <newsletter@llmxy.xyz>`, reply-to `newsletter@llmxy.xyz`, Resend API key, and `NEWSLETTER_TOKEN_SECRET`.
   - `NEWSLETTER_SEND_ENABLED=false` remains closed to prevent accidental real sends.
   - `scripts/newsletter/build_weekly_digest_email.mjs` now loads `.env` and `.env.local`.
   - `scripts/ops/readiness.mjs` now also loads `.env` and `.env.local`.
   - App-side readiness URL detection now counts `PRODUCTION_BASE_URL` as a site URL.
2. Newsletter local validation passed.
   - `node --check scripts/newsletter/build_weekly_digest_email.mjs` passed.
   - `npm run newsletter:weekly -- --preflight --limit=5 --event-limit=8` passed.
   - `npm run newsletter:weekly -- --limit=5 --event-limit=8` passed with `subscriptions=0`, `generated=0`.
   - `npm run ops:readiness` reports schema ready, `activity.total=527`, `influence.audits=24`, Newsletter env present except `NEWSLETTER_SEND_ENABLED=true`.
   - Resend API read-only check reports `llmxy.xyz` status `verified`.
   - Send-mode preflight passed with a temporary `NEWSLETTER_SEND_ENABLED=true`; because the command used `--preflight`, it did not send email and did not write logs.
3. Newsletter first real test send completed after dad provided a recipient and authorization.
   - Test subscription `317054513@qq.com` was written with frequency `weekly`.
   - Real send ran with temporary `NEWSLETTER_SEND_ENABLED=true`, `--send`, `--confirm-newsletter-send`, `--limit=5`, and `--event-limit=8`.
   - Result: `generated=1`, `sent=1`, `failed=0`, provider `resend`.
   - Latest delivery log for the test email has `status=sent`, `attempts=1`, and a provider message id.
   - `npm run ops:readiness` now reports `newsletter.sent=1` and `newsletter-send-observation=ready`.
   - Overall readiness remains `pending` only because `NEWSLETTER_SEND_ENABLED=false` is restored as the safe default after the send window.
4. Vercel production env sync completed after CLI re-auth.
   - `.vercel/project.json` links to project `ai-person-agent`.
   - Prior deployment evidence says production is Vercel behind Aliyun FC custom domain `people.llmxy.xyz`.
   - Production env now contains `PRODUCTION_BASE_URL`, `NEWSLETTER_EMAIL_PROVIDER`, `NEWSLETTER_SEND_ENABLED=false`, `RESEND_API_KEY`, `NEWSLETTER_FROM_EMAIL`, `NEWSLETTER_REPLY_TO`, and `NEWSLETTER_TOKEN_SECRET`.
   - A safe Vercel production redeploy was triggered from the existing deployment, not from the dirty local workspace.
   - Redeployed `ai-person-agent-jrgozvmj6-leolins-projects-0fe43c0f.vercel.app` to `ai-person-agent-f4dk8c1x2-leolins-projects-0fe43c0f.vercel.app`; Vercel meta shows `action=redeploy`.
   - Production alias is ready, `https://people.llmxy.xyz/` returns 200, and `/api/person/directory?limit=3` returns `total=252`.
5. Quality second-pass keep+reject suggestions were applied.
   - `docs/QUALITY_REVIEW_SECOND_PASS_2026_06_13.md`
   - `/tmp/ai-person-quality-decisions-second-pass-keep-reject.json`
   - Applied 36 total: `keep=12`, `reject=24`; `review=20` was intentionally omitted.
   - Dry-run passed with `dryRun=36`, `skipped=0`, `errors=0`.
   - Execute passed with `applied=36`, `skipped=0`, `errors=0`.
   - Post-apply review pack reports `critical=0`, `high=2`, `qaReviewRows=82`.
6. PG-009 activity and works candidate package was generated.
   - `docs/CONTENT_DENSITY_ACTIVITY_WORKS_CANDIDATES_2026_06_13.md`
   - 46 candidates total: Activity 23, Works 23.
   - No database writes, no production rollout, no dev server.
7. Current remaining blockers:
   - Confirm future Newsletter recipient scope before the next real send.
   - Decide whether Influence scores should ever be applied to `People.influenceScore`; audit rows already exist.
8. Local resource cleanup state:
   - The stuck `npx vercel env ls production` process was killed.
   - No ai-person-agent, Vercel, pnpm, newsletter, or quality script process remains running.
   - `node_modules` is present so Prisma scripts can keep running; `.pnpm-store` is ignored in git to prevent status/diff blowups.
