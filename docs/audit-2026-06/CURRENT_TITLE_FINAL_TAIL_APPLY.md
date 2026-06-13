# Current Title Final Tail Apply

生成时间：2026-06-10

## 输入

- 决策文件：`docs/audit-2026-06/current_title_decisions_final_tail_2026_06_10.json`
- 执行脚本：`scripts/fix/apply_current_title_decisions.ts`
- 范围：上一轮保守留审的 4 条 `currentTitle` / `People.organization` mismatch。

## 执行结果

- 4 条来源支持决策已执行到生产 Neon。
- 执行后复跑同一决策文件 dry-run：`alreadyApplied=4` / `updated=0` / `missing=0`。
- `audit_career_normalization.ts` 复核：`currentTitleOrgMismatches=0`。
- `export_career_review_buckets.ts` 复核：`currentTitleMismatches={}`。

## 已执行决策

| 人物 | 处理 | 来源 |
|---|---|---|
| 伊恩·J·古德费洛 | `Research Director @ Google DeepMind` 改为 `Co-founder @ Stealth Startup`，补 `Stealth Startup` | 本人 X 公开简介 |
| 阿卜杜勒-拉赫曼·穆罕默德 | `Research Scientist @ Google DeepMind` 改为 `Co-Founder / AI Advisor @ Rembrand`，补 `Rembrand` | Rembrand 官方团队页 |
| 阿舒托什·萨克塞纳 | `Associate Professor @ Cornell University` 改为 `Founder and CEO @ TorqueAGI`，补 `TorqueAGI` | TorqueAGI 官方站 |
| 詹姆斯·伯格斯特拉 | `CEO @ Hyperopt` 改为 `Director of AI Platform @ Ocado Technology`，补 `Ocado Technology` / `Creative Destruction Lab` | Creative Destruction Lab 官方 mentor 页 |

## 验证

```bash
bun scripts/fix/apply_current_title_decisions.ts \
  --decisions=docs/audit-2026-06/current_title_decisions_final_tail_2026_06_10.json

bun scripts/audit/audit_career_normalization.ts \
  --out=docs/audit-2026-06/data/career_normalization_audit.json

bun scripts/audit/export_career_review_buckets.ts \
  --out=docs/audit-2026-06/data/career_review_buckets.json
```
