# Current Title Remaining Apply

生成时间：2026-06-10

## 输入

- 决策文件：`docs/audit-2026-06/current_title_decisions_remaining_2026_06_10.json`
- 执行脚本：`scripts/fix/apply_current_title_decisions.ts`
- 范围：只处理 `career_review_buckets.json` 中剩余 23 条 `currentTitle` / `People.organization` mismatch。

## 执行结果

- Tavily key pool 用于候选检索；最终只采用本人主页、机构主页、公司/学校 profile、Netflix IR、Mila/Meta/Illinois/minds.ai 等较强来源。
- 19 条来源支持决策已执行到生产 Neon。
- 执行后复跑同一决策文件 dry-run：`alreadyApplied=19` / `updated=0` / `missing=0`。
- `audit_career_normalization.ts` 复核：`currentTitleOrgMismatches` 从 23 降到 4。
- `export_career_review_buckets.ts` 复核：剩余 3 条 `current_title_org_missing_from_people_orgs`，1 条 `missing_known_org`。

## 已执行决策

| 人物 | 处理 |
|---|---|
| Aakash Gupta | `VP of Product @ Apollo.io` 改为 `Creator @ Product Growth` |
| Haofan Wang | `Co-founder & CEO @ InstantID` 改为 `Member of Technical Staff @ Lovart AI` |
| Hugo Larochelle | 改为 `Scientific Director @ Mila`，补 `Mila` |
| Strive Masiyiwa | 补 `Netflix Inc.` |
| 乔恩·巴伦 | 改为 `Principal Research Scientist @ Google DeepMind`，补 `Google DeepMind` |
| 乔治亚·吉奥克萨里 | 改为 `Assistant Professor @ Caltech`，补 `Caltech` |
| 何凯明 | 改为 `Associate Professor @ MIT; Distinguished Scientist @ Google DeepMind`，补 `MIT` / `Google DeepMind` |
| 保罗·德贝维奇 | 改为 `Content Production Research @ Netflix; Scientific Advisor @ Eyeline Studios`，补 `Netflix` / `Eyeline Studios` |
| 克里斯蒂娜·N·图塔诺娃 | 改为 `Research Scientist @ Google`，补 `Google` |
| 卡尔·爱德华·拉斯穆森 | 修正坏值 `professor @ professor` 为 `Professor of Machine Learning @ University of Cambridge` |
| 大卫·洛佩兹-帕兹 | 补 `Meta AI` |
| 奥尼·汉农 | 改为 `Member of Technical Staff @ Anthropic`，补 `Anthropic` |
| 安德烈·姆尼赫 | 改为 `Research Scientist @ Google DeepMind`，补 `Google DeepMind` |
| 德米特里·巴丹瑙 | 改为 `AI Research Scientist @ Periodic Labs; Adjunct Professor @ McGill University; Core Industry Member @ Mila` |
| 杜米特鲁·埃尔汉 | 改为 `Senior Director of Research @ Google DeepMind`，补 `Google DeepMind` |
| Yann Dauphin | `Research Scientist @ Anthropic` 改为 `Research Scientist @ Google DeepMind` |
| 索拉布·古普塔 | 改为 `Associate Professor @ UIUC`，补 `UIUC` |
| 蒂门·蒂勒曼 | 改为 `Co-Founder / Chief Scientist @ minds.ai`，补 `minds.ai` |
| 詹姆斯·马滕斯 | 补 `Google DeepMind` |

## Final Tail Update

2026-06-10 后续已用 `current_title_decisions_final_tail_2026_06_10.json` 处理完 4 条留审项，执行报告见 `docs/audit-2026-06/CURRENT_TITLE_FINAL_TAIL_APPLY.md`。当前 `audit_career_normalization.ts` 复核为 `currentTitleOrgMismatches=0`。

## 原留审项

| 人物 | 当前问题 | 留审原因 |
|---|---|---|
| 伊恩·J·古德费洛 | `Research Director @ Google DeepMind` | 检索到本人 X 指向 stealth startup，DeepMind 只剩演讲代理/弱来源；写成 stealth startup 展示价值低，先不改。 |
| 阿卜杜勒-拉赫曼·穆罕默德 | `Research Scientist @ Google DeepMind` | Google DeepMind 无可靠来源；个人站/Scholar 指向 FAIR，LinkedIn/聚合页又指向 Rembrand/Meta SuperIntelligence Lab，需本人或机构页确认。 |
| 阿舒托什·萨克塞纳 | `Associate Professor @ Cornell University` | Cornell 明显偏旧，但 TorqueAGI/Caspar.AI 只有 LinkedIn、活动页或聚合页线索，缺官方当前职位页。 |
| 詹姆斯·伯格斯特拉 | `CEO @ Hyperopt` | Hyperopt CEO 明显异常；CDL/Kindred/Ocado/LinkedIn 线索互相冲突，未找到可直接写入的当前职位一手源。 |

## 验证

```bash
bun scripts/fix/apply_current_title_decisions.ts \
  --decisions=docs/audit-2026-06/current_title_decisions_remaining_2026_06_10.json

bun scripts/audit/audit_career_normalization.ts \
  --out=docs/audit-2026-06/data/career_normalization_audit.json

bun scripts/audit/export_career_review_buckets.ts \
  --out=docs/audit-2026-06/data/career_review_buckets.json
```
