# Card Source Manual Apply

Generated at: 2026-06-10T21:15:33.439Z
Mode: dry-run
Input: docs/audit-2026-06/data/card_source_manual_decisions_after_refetch.json
Archive: docs/audit-2026-06/data/card_source_manual_apply_dry_run_archive.json
Stage: manual_card_source_after_refetch

## Counts

| Metric | Value |
| --- | ---: |
| decisions | 12 |
| applicable | 12 |
| applied | 0 |
| skipped | 0 |

## Actions

| Action | Count |
| --- | ---: |
| delete_raw_pool_item | 5 |
| archive_card | 4 |
| update_raw_item | 2 |
| update_card_source | 1 |

## Rows

| Person | Action | Target | Applicable | Applied | Reason |
| --- | --- | --- | --- | --- | --- |
| Mustafa Suleyman | update_card_source | 创建以AI为先的消费者产品公司 | yes | no | 原卡片来源是 Greylock Web3 投资文章，与 Mustafa Suleyman 和 Inflection AI 无关；库内已有 keep 来源明确说明 Suleyman 与 Reid Hoffman 启动 conversational AI startup Inflection AI。 |
| 桑达尔·皮查伊 | archive_card | 计划2026年推出AI智能眼镜，押注下一代硬件 | yes | no | 卡片来源标题和正文聚焦 DeepMind CEO Demis Hassabis，不支持桑达尔·皮查伊个人卡片；本库没有可直接支持该智能眼镜卡片全部表述的同人 keep 来源。 |
| Greg Brockman | archive_card | 利用编码智能体实现快速交付 | yes | no | 来源是过短 X 动态，latest QA verdict 为 reject，无法支撑“方法论/工作范式转变”级别卡片。 |
| Greg Brockman | archive_card | 后台运行 Codex 以平衡工作与家庭 | yes | no | 来源偏生活化调侃，latest QA verdict 为 reject，信息密度不足，不适合作为活跃人物卡。 |
| Greg Brockman | archive_card | 用 GPT-5.2 自动编译报告 | yes | no | 来源是过短 X 动态，latest QA verdict 为 reject，无法支撑自动编译报告方法卡片。 |
| Chris Olah | update_raw_item | Christopher Olah colah | yes | no | GitHub Users API 直接确认 Christopher Olah 的 bio 包含卡片引用的 quote，并提供 Anthropic/OpenAI/Google Brain 背景；原 RawPoolItem 只是网页抓取失败导致内容薄。 |
| 亚历克·拉德福德 | update_raw_item | Alec Radford Newmu | yes | no | GitHub Users API 确认 Newmu 账号为 Alec Radford 且 company 为 OpenAI；原 RawPoolItem 是 GitHub 网页抓取失败，不应继续保留 reject 状态。 |
| Mustafa Suleyman | delete_raw_pool_item | Privacy and Scalability for Web3 | yes | no | 卡片已改挂到 Inflection AI 相关 keep 来源；原 RawPoolItem 为 Greylock Web3 投资文章，与人物和 AI 主题无关。 |
| 桑达尔·皮查伊 | delete_raw_pool_item | DeepMind CEO为谷歌攻关AI杀手级应用 | yes | no | 关联卡片已归档；原 RawPoolItem 聚焦 DeepMind CEO Demis Hassabis，与桑达尔·皮查伊错挂。 |
| Greg Brockman | delete_raw_pool_item | how to leverage coding agents to ship fast: | yes | no | 关联卡片已归档；来源为过短 X 动态，latest QA reject，信息密度不足。 |
| Greg Brockman | delete_raw_pool_item | Codex for spending time with family while work happens in the background: | yes | no | 关联卡片已归档；来源偏生活化调侃，latest QA reject，缺乏行业参考价值。 |
| Greg Brockman | delete_raw_pool_item | GPT-5.2 for compiling reports: | yes | no | 关联卡片已归档；来源为过短 X 动态，latest QA reject，无法支撑方法卡片。 |
