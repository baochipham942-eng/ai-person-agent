# Post-Ingest Content Guard

Generated at: 2026-06-18T09:37:26.269Z
Status: failed

## Steps

| Step | Result | Command |
| --- | --- | --- |
| prune unresolved refresh | passed | `node scripts/audit/export_prune_tail_review_unresolved.mjs --out=docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json --report-out=docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md` |
| career normalization refresh | passed | `bun scripts/audit/audit_career_normalization.ts --out=docs/audit-2026-06/data/career_normalization_audit.json` |
| career buckets refresh | passed | `bun scripts/audit/export_career_review_buckets.ts --input=docs/audit-2026-06/data/career_normalization_audit.json --out=docs/audit-2026-06/data/career_review_buckets.json` |
| relation review refresh | passed | `bun scripts/audit/export_relation_review.ts --out=docs/audit-2026-06/data/relation_review.json` |
| relation buckets refresh | passed | `bun scripts/audit/export_relation_review_buckets.ts --input=docs/audit-2026-06/data/relation_review.json --out=docs/audit-2026-06/data/relation_review_buckets_after_org_review_second.json` |
| card reaggregation current verify | passed | `node scripts/fix/apply_card_reaggregation_plan.mjs --out=docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_log.json --archive=docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_archive.json --report-out=docs/audit-2026-06/CARD_REAGGREGATION_CURRENT_VERIFY.md` |
| conservative rewrite dry-run | passed | `bun scripts/fix/apply_product_review_decisions.ts --decisions=docs/audit-2026-06/data/exa_source_quality_review_dir/conservative_rewrite_decisions_draft.json` |
| content guard | failed | `node scripts/audit/check_content_review_guardrails.mjs` |

## Output Tails

### prune unresolved refresh

```text
{
  "out": "docs/audit-2026-06/data/prune_tail_review_unresolved_rows.json",
  "reportOut": "docs/audit-2026-06/PRUNE_TAIL_REVIEW_UNRESOLVED.md",
  "summary": {
    "curatedUnresolvedRows": 220,
    "existingRawPoolItems": 30,
    "latestKeepRowsExcluded": 28,
    "reviewUnresolvedRows": 0,
    "dependencyRows": 0
  },
  "bySourceType": {},
  "byCuratedDecision": {}
}
```

### career normalization refresh

```text
Career normalization audit written: docs/audit-2026-06/data/career_normalization_audit.json
{
  "organizations": 626,
  "roles": 1169,
  "people": 283,
  "duplicateOrgClusters": 0,
  "positionLikeOrganizations": 0,
  "duplicateRoleGroups": 0,
  "vagueRoles": 0,
  "peopleOrganizationDuplicates": 0,
  "currentTitleOrgMismatches": 0
}
```

### career buckets refresh

```text
Career review buckets written: docs/audit-2026-06/data/career_review_buckets.json
{
  "positionLike": {},
  "vagueRoles": {},
  "currentTitleMismatches": {}
}
```

### relation review refresh

```text
Exported relation review: /Users/linchen/Downloads/ai/ai-person-agent/docs/audit-2026-06/data/relation_review.json
total=207 trusted=78 confirmedByRoles=129 needsReview=0
```

### relation buckets refresh

```text
Relation review buckets written: docs/audit-2026-06/data/relation_review_buckets_after_org_review_second.json
{
  "totalNeedsReview": 0,
  "byBucket": {},
  "byType": {},
  "bySource": {}
}
```

### card reaggregation current verify

```text
{
  "out": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_log.json",
  "archive": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_current_verify_archive.json",
  "reportOut": "docs/audit-2026-06/CARD_REAGGREGATION_CURRENT_VERIFY.md",
  "summary": {
    "generatedAt": "2026-06-18T09:37:20.574Z",
    "mode": "dry-run",
    "strategy": "archive-active",
    "generationId": "card-reaggregation:2026-06-18T09:37:12.399Z",
    "planIn": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan.json",
    "reviewIn": "docs/audit-2026-06/data/exa_source_quality_review_dir/card_reaggregation_plan_mimo_review.json",
    "peopleConsidered": 5,
    "peopleEligible": 5,
    "existingCards": 27,
    "replacementCards": 24,
    "skippedPeople": 0
  }
}
```

### conservative rewrite dry-run

```text
Product review decisions mode: dry-run
would update Emad Mostaque
  topics: ["开源","多模态","AIGC/生成式媒体","AI 产品化"] -> ["开源","多模态","创意生成","产品"]
  topicDetails: [{"rank":24,"topic":"开源","reason":"领导 Stability AI 开源文生图基础模型 Stable Diffusion，推动生成式AI民主化。"},{"rank":4,"topic":"多模态","reason":"推动 Stability AI 平台发展，涵盖图像、音频等多模态生成模型。"},{"rank":1,"topic":"AIGC/生成式媒体","reason":"通过 Stable Diffusion 和 Stable Audio Open 等工具，赋能全球创意工作者。"},{"rank":16,"topic":"AI 产品化","reason":"作为 Stability AI 创始人，主导开发了 Stable Diffusion 系列核心产品。"}] -> [{"rank":24,"topic":"开源","reason":"领导 Stability AI 开源文生图基础模型 Stable Diffusion，推动生成式AI民主化。"},{"rank":4,"topic":"多模态","reason":"推动 Stability AI 平台发展，涵盖图像、音频等多模态生成模型。"},{"rank":1,"topic":"创意生成","reason":"通过 Stable Diffusion 和 Stable Audio Open 等工具，赋能全球创意工作者。"},{"rank":16,"topic":"产品","reason":"作为 Stability AI 创始人，主导开发了 Stable Diffusion 系列核心产品。"}]
  remove products: (none)
  remove topics: (none)
  evidence: https://www.youtube.com/watch?v=o1TcHAafUMs
  note: source-quality:cmjuumw1k0h9wrmtb7etg1n65: 来源将Stable Diffusion创造者直接归因于个人，但这是团队成果。应保守改写以反映其领导角色而非个人创造。 (products=Stable Diffusion)
would update Greg Brockman
  topics: ["大语言模型","AI 产品化","开源","AGI"] -> ["大语言模型","产品","开源","AGI"]
  topicDetails: [{"rank":5,"topic":"大语言模型","reason":"作为OpenAI联合创始人，领导了GPT-4和ChatGPT等核心大语言模型的开发与产品化。"},{"rank":1,"topic":"AI 产品化","reason":"主导推出ChatGPT，并推动OpenAI API和Codex等产品的发布，将研究转化为全球性服务。"},{"rank":4,"topic":"开源","reason":"早期推动OpenAI Gym等项目开源，后战略转向闭源以支持ChatGPT等产品的规模化。"},{"rank":1,"topic":"AGI","reason":"作为OpenAI联合创始人兼前总裁，其核心使命是安全地创建和部署造福人类的通用人工智能。"}] -> [{"rank":5,"topic":"大语言模型","reason":"作为OpenAI联合创始人，领导了GPT-4和ChatGPT等核心大语言模型的开发与产品化。"},{"rank":1,"topic":"产品","reason":"主导推出ChatGPT，并推动OpenAI API和Codex等产品的发布，将研究转化为全球性服务。"},{"rank":4,"topic":"开源","reason":"早期推动OpenAI Gym等项目开源，后战略转向闭源以支持ChatGPT等产品的规模化。"},{"rank":1,"topic":"AGI","reason":"作为OpenAI联合创始人兼前总裁，其核心使命是安全地创建和部署造福人类的通用人工智能。"}]
  remove products: (none)
  remove topics: (none)
  evidence: https://openai.com/product/gpt-4
  note: source-quality:cmjv15o73003wftmgxiy3v3p5: 来源是公司产品页面，未提及个人贡献，属于过度归因。建议保守改写，强调其领导角色而非直接归因。 (products=GPT-4, cards=GPT-4在安全性和事实性上大幅改进)
already applied: Guillaume Lample
already applied: Noam Shazeer
would update 桑达尔·皮查伊
  topics: ["大语言模型","Transformer","AI 产品化","AI 基础设施"] -> ["大语言模型","Transformer","产品","基础设施"]
  topicDetails: [{"rank":39,"topic":"大语言模型","reason":"作为CEO推动Gemini系列大模型的研发与发布，重塑谷歌AI产品矩阵。"},{"rank":16,"topic":"Transformer","reason":"主导将Transformer架构从研究转化为搜索、助手等核心产品的底层技术。"},{"rank":24,"topic":"AI 产品化","reason":"领导Google Chrome、Android、Google Drive及Bard等AI产品的整合与商业化。"},{"rank":9,"topic":"AI 基础设施","reason":"推动TPU等AI专用硬件及云基础设施的部署，支撑谷歌AI规模化应用。"}] -> [{"rank":39,"topic":"大语言模型","reason":"作为CEO推动Gemini系列大模型的研发与发布，重塑谷歌AI产品矩阵。"},{"rank":16,"topic":"Transformer","reason":"主导将Transformer架构从研究转化为搜索、助手等核心产品的底层技术。"},{"rank":24,"topic":"产品","reason":"领导Google Chrome、Android、Google Drive及Bard等AI产品的整合与商业化。"},{"rank":9,"topic":"基础设施","reason":"推动TPU等AI专用硬件及云基础设施的部署，支撑谷歌AI规模化应用。"}]
  remove products: (none)
  remove topics: (none)
  evidence: https://www.theverge.com/2023/12/6/23990466/google-gemini-llm-ai-model
  note: source-quality:cmju15wcj0b2mrmtbzgbz4yic: 来源是公司级产品新闻，未提及个人，直接归因过度。采用审核建议的保守改写，将个人角色限定为领导公司发布。 (products=Gemini)
{
  "mode": "dry-run",
  "decisions": 5,
  "matched": 5,
  "missing": 0,
  "alreadyApplied": 2,
  "updated": 0,
  "cardsUpdated": 0
}
```

### content guard

```text
Content review guardrails failed:
- cards.existingCards: expected 27 to equal 24
```

## Scope

- Queries DB and refreshes audit artifacts only.
- Does not fetch remote sources, call models, delete RawPoolItem, or mutate product tables.
- Intended to run after new imports, source writes, relation/career writes, or card generation.
