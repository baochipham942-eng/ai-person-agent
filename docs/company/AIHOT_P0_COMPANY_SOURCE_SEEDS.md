# AI HOT P0 CompanySource Seed Packs

Generated from: `docs/audit-2026-06/data/aihot_p0_apply_plan.json`
Plan generated: 2026-06-19T01:55:06.361Z

These packs are incremental CompanySource dry-run seeds. They do not claim complete company profile coverage and do not create CompanyThreadLink rows.

| Company | File | Candidates | Roles | Source Kinds |
| --- | --- | ---: | --- | --- |
| Alibaba DAMO Academy | `docs/company/aihot-p0-company-sources/alibaba-damo-academy.json` | 4 | product_release, technical_thread_link | official_blog_article, product_announcement |
| Anthropic | `docs/company/aihot-p0-company-sources/anthropic.json` | 4 | hiring_team_signal, technical_thread_link | official_blog_article, team_announcement |
| Cloudflare | `docs/company/aihot-p0-company-sources/cloudflare.json` | 3 | hiring_team_signal, product_release, technical_thread_link | official_blog_article, product_announcement, team_announcement |
| Hugging Face | `docs/company/aihot-p0-company-sources/hugging-face.json` | 3 | product_release, technical_thread_link | official_rss_article |
| MiniMax | `docs/company/aihot-p0-company-sources/minimax.json` | 1 | technical_thread_link | official_blog_article |
| Mistral AI | `docs/company/aihot-p0-company-sources/mistral-ai.json` | 3 | hiring_team_signal, partnership_signal | partnership_announcement, team_announcement |
| OpenAI | `docs/company/aihot-p0-company-sources/openai.json` | 3 | product_release, technical_thread_link | official_rss_article |
| xAI | `docs/company/aihot-p0-company-sources/xai.json` | 4 | product_release, technical_thread_link | official_blog_article, product_announcement |
| 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | `docs/company/aihot-p0-company-sources/deepseek.json` | 1 | hiring_team_signal | github_repository |
| 英伟达 | `docs/company/aihot-p0-company-sources/nvidia.json` | 4 | partnership_signal, product_release, technical_thread_link | official_blog_article, partnership_announcement, product_announcement |
| 苹果公司 | `docs/company/aihot-p0-company-sources/apple.json` | 3 | hiring_team_signal, partnership_signal, technical_thread_link | official_rss_article |
| 谷歌 | `docs/company/aihot-p0-company-sources/google.json` | 3 | product_release | official_rss_article |

Validation command:

```bash
for f in docs/company/aihot-p0-company-sources/*.json; do pnpm company:materialize -- --strict --input="$f" --output="/tmp/$(basename "$f" .json)-staging.json"; done
```
