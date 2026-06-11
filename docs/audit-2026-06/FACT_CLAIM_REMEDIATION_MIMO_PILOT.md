# Fact Claim Remediation by MiMo

Generated at: 2026-06-09T13:24:57.137Z
Model: mimo-v2.5-pro

Total problem issues: 2340
Selected issues: 20
Remediations: 20

## Actions

| Action | Count |
| --- | --- |
| refetch_source | 7 |
| close_historical_role | 7 |
| rewrite_conservative | 6 |

## Safety

| Safety bucket | Count |
| --- | --- |
| manual_or_source_required | 20 |

## Top People

| Person | Total | Safe | Actions | Samples |
| --- | --- | --- | --- | --- |
| Arvind Krishna | 5 | 0 | {"close_historical_role":3,"refetch_source":2} | career_role/close_historical_role: 该职位状态为‘now’，但实际为1990年的入职记录，属于历史职位。需要关闭当前展示，并补充结束日期。<br>career_role/close_historical_role: 该职位状态为‘now’，但实际为1989年开始的早期职位，属于历史职位。需要关闭当前展示，并补充结束日期。<br>career_role/close_historical_role: 该职位状态为‘now’，但实际为1989年开始的早期职位，属于历史职位。需要关闭当前展示，并补充结束日期。 |
| Aidan Gomez | 3 | 0 | {"rewrite_conservative":2,"refetch_source":1} | career_role/rewrite_conservative: 履历显示职位为当前（now），但人物当前身份为CEO，信息过时。需保守改写，将结束时间设为2021年，并重抓来源确认。<br>career_role/rewrite_conservative: 履历显示职位为当前（now），但人物已毕业创业，信息过时。需保守改写，将结束时间设为2018年，并重抓来源确认。<br>career_role/refetch_source: 履历缺乏可靠来源支持，且与人物当前主要身份不符。需重抓来源以核实该履历的真实性。 |
| Bob McGrew | 3 | 0 | {"refetch_source":2,"close_historical_role":1} | career_role/refetch_source: 该职位来源仅为LLM提取，缺乏可靠证据支持其当前在PayPal担任工程师。需要重新抓取可靠来源进行验证。<br>career_role/close_historical_role: 该职位状态为‘now’，但根据公开信息，Bob McGrew已于2024年离职。需要关闭当前展示，并补充结束日期。<br>career_role/refetch_source: 该军事职位缺乏权威来源确认，且与当前职业背景关联性不明确。需要重抓来源以验证。 |
| Cristiano Amon | 2 | 0 | {"refetch_source":1,"close_historical_role":1} | career_role/refetch_source: 该领导职位信息来源不足，无法确认准确性。需要重抓来源以验证。<br>career_role/close_historical_role: 该工程师职位显示为当前，但其当前是高通公司总裁兼首席执行官，工程师职位已过时。需要确认结束日期以标记为历史角色。 |
| Alexander Amini | 1 | 0 | {"refetch_source":1} | career_role/refetch_source: 履历缺乏可靠来源支持，且职位描述模糊。需重抓来源以核实该履历的真实性。 |
| Arthur Mensch | 1 | 0 | {"rewrite_conservative":1} | career_role/rewrite_conservative: 履历显示职位为当前（now），但人物已离职创立Mistral AI，信息过时。需保守改写，将结束时间设为2023年4月，并重抓来源确认。 |
| Ashok Elluswamy | 1 | 0 | {"close_historical_role":1} | career_role/close_historical_role: 该职位显示为当前，但根据其当前职位（AI副总裁），此职位可能已过时。需要确认结束日期以标记为历史角色。 |
| Boris Cherny | 1 | 0 | {"rewrite_conservative":1} | career_role/rewrite_conservative: 职位显示为当前（now），但人物当前头衔已变更。根据保守改写原则，将结束时间设为过去，并改写为过去时态履历。 |
| Boris Power | 1 | 0 | {"rewrite_conservative":1} | career_role/rewrite_conservative: 职位显示为当前（now），但人物当前头衔已变更。根据保守改写原则，将结束时间设为过去，并改写为过去时态履历。 |
| Chamath Palihapitiya | 1 | 0 | {"rewrite_conservative":1} | career_role/rewrite_conservative: 职位显示为当前（now），但人物当前头衔已变更。根据保守改写原则，将结束时间设为过去，并改写为过去时态履历。 |
| Christopher Manning | 1 | 0 | {"close_historical_role":1} | career_role/close_historical_role: 该学生身份显示为当前，但其当前是斯坦福大学教授，学生身份已过时。需要确认结束日期以标记为历史角色。 |

## Safe Auto-Apply Candidates

| Person | Type | Target | Action | Reason |
| --- | --- | --- | --- | --- |

## Manual / Source Required Queue

| Person | Type | Target | Action | Queries | Reason |
| --- | --- | --- | --- | --- | --- |
| Aidan Gomez | career_role | 研究科学家 @ Cohere | rewrite_conservative | Aidan Gomez Cohere research scientist end date<br>Aidan Gomez Cohere career timeline | 履历显示职位为当前（now），但人物当前身份为CEO，信息过时。需保守改写，将结束时间设为2021年，并重抓来源确认。 |
| Aidan Gomez | career_role | Undergraduate Student @ 多伦多大学 | rewrite_conservative | Aidan Gomez University of Toronto graduation year<br>Aidan Gomez undergraduate degree timeline | 履历显示职位为当前（now），但人物已毕业创业，信息过时。需保守改写，将结束时间设为2018年，并重抓来源确认。 |
| Aidan Gomez | career_role | Research Group Lead @ For.ai | refetch_source | Aidan Gomez For.ai role<br>Aidan Gomez For.ai research group lead | 履历缺乏可靠来源支持，且与人物当前主要身份不符。需重抓来源以核实该履历的真实性。 |
| Alexander Amini | career_role | AI/tech professional @ Efficient AI | refetch_source | Alexander Amini Efficient AI role<br>Alexander Amini Efficient AI career | 履历缺乏可靠来源支持，且职位描述模糊。需重抓来源以核实该履历的真实性。 |
| Arthur Mensch | career_role | Staff Research Scientist @ 谷歌DeepMind | rewrite_conservative | Arthur Mensch Google DeepMind end date<br>Arthur Mensch Mistral AI founding timeline | 履历显示职位为当前（now），但人物已离职创立Mistral AI，信息过时。需保守改写，将结束时间设为2023年4月，并重抓来源确认。 |
| Arvind Krishna | career_role | Joined Company @ IBM | close_historical_role | Arvind Krishna IBM career history start date 1990 | 该职位状态为‘now’，但实际为1990年的入职记录，属于历史职位。需要关闭当前展示，并补充结束日期。 |
| Arvind Krishna | career_role | General Manager, Systems and Technology Group's Development and Manufacturing Organization @ IBM | close_historical_role | Arvind Krishna IBM General Manager Systems Technology Group tenure end date | 该职位状态为‘now’，但实际为1989年开始的早期职位，属于历史职位。需要关闭当前展示，并补充结束日期。 |
| Arvind Krishna | career_role | Senior Vice President, Cloud and Cognitive Software @ IBM | close_historical_role | Arvind Krishna IBM Senior Vice President Cloud Cognitive Software tenure end date | 该职位状态为‘now’，但实际为1989年开始的早期职位，属于历史职位。需要关闭当前展示，并补充结束日期。 |
| Bob McGrew | career_role | Engineer @ PayPal | refetch_source | Bob McGrew PayPal Engineer current role official profile LinkedIn | 该职位来源仅为LLM提取，缺乏可靠证据支持其当前在PayPal担任工程师。需要重新抓取可靠来源进行验证。 |
| Bob McGrew | career_role | Chief Research Officer (CRO) @ OpenAI | close_historical_role | Bob McGrew OpenAI departure 2024 announcement | 该职位状态为‘now’，但根据公开信息，Bob McGrew已于2024年离职。需要关闭当前展示，并补充结束日期。 |
| Boris Cherny | career_role | Member of Technical Staff @ Anthropic | rewrite_conservative | Boris Cherny Anthropic 离职时间<br>Boris Cherny Anysphere Cursor 入职时间 | 职位显示为当前（now），但人物当前头衔已变更。根据保守改写原则，将结束时间设为过去，并改写为过去时态履历。 |
| Boris Power | career_role | 专家/研究员 @ OpenAI | rewrite_conservative | Boris Power OpenAI 职位变更<br>Boris Power Head of Applied Research OpenAI 任命时间 | 职位显示为当前（now），但人物当前头衔已变更。根据保守改写原则，将结束时间设为过去，并改写为过去时态履历。 |
| Chamath Palihapitiya | career_role | Founder and CEO @ 社会资本 | rewrite_conservative | Chamath Palihapitiya Social Capital 离职时间<br>Chamath Palihapitiya 8090 CEO 任命时间 | 职位显示为当前（now），但人物当前头衔已变更。根据保守改写原则，将结束时间设为过去，并改写为过去时态履历。 |
| Arvind Krishna | career_role | Director @ Federal Reserve Bank of New York | refetch_source | Arvind Krishna Federal Reserve Bank of New York director<br>纽约联邦储备银行 董事 Arvind Krishna | 履历需要更权威的来源来确认其当前状态和起始时间。根据策略，needs_source 只生成来源重抓任务。 |
| Arvind Krishna | career_role | Director @ Northrop Grumman Corporation | refetch_source | Arvind Krishna Northrop Grumman director<br>诺斯罗普·格鲁曼公司 董事 Arvind Krishna | 履历需要更权威的来源来确认其当前状态和起始时间。根据策略，needs_source 只生成来源重抓任务。 |
| Ashok Elluswamy | career_role | Director of Autopilot Software @ 特斯拉 | close_historical_role | Ashok Elluswamy Tesla Director of Autopilot Software end date<br>Ashok Elluswamy career history Tesla | 该职位显示为当前，但根据其当前职位（AI副总裁），此职位可能已过时。需要确认结束日期以标记为历史角色。 |
| Bob McGrew | career_role | Lieutenant Colonel @ Detachment 201 (Executive Innovation Corps) | refetch_source | Bob McGrew Detachment 201 Executive Innovation Corps Lieutenant Colonel<br>Bob McGrew military career | 该军事职位缺乏权威来源确认，且与当前职业背景关联性不明确。需要重抓来源以验证。 |
| Christopher Manning | career_role | Student @ 斯坦福大学 | close_historical_role | Christopher Manning Stanford University student graduation year<br>Christopher Manning PhD Stanford | 该学生身份显示为当前，但其当前是斯坦福大学教授，学生身份已过时。需要确认结束日期以标记为历史角色。 |
| Cristiano Amon | career_role | Leadership Position @ Velocom | refetch_source | Cristiano Amon Velocom leadership position<br>Cristiano Amon Velocom role | 该领导职位信息来源不足，无法确认准确性。需要重抓来源以验证。 |
| Cristiano Amon | career_role | Engineer @ Qualcomm | close_historical_role | Cristiano Amon Qualcomm engineer end date<br>Cristiano Amon career history Qualcomm | 该工程师职位显示为当前，但其当前是高通公司总裁兼首席执行官，工程师职位已过时。需要确认结束日期以标记为历史角色。 |
