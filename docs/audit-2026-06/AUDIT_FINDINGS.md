Confirmed: relations have no primary key (matched by `person`+`related`+`type`), the 4 placeholder clusters are singletons, and orgs use `name`/`nameZh`. I have everything needed. Writing the final document.

# 全库审计修复清单 (Change-List)

> 适用范围: `docs/audit-2026-06/data/` 下 `organizations.json` (667 条) / `people.json` (219 条) / `roles.json` (1127 条) / `relations.json` (297 条)
> 数据均为 pretty-printed JSON 数组,无主键 ID 的实体用业务字段联合匹配。本清单按"先低风险高确定 → 后高风险需人工裁定"组织,末尾给统一优先级。

---

## 一、执行摘要

| # | 问题类别 | 数量 | 修复方式 | 主要风险 | 优先级 |
|---|---------|------|---------|---------|--------|
| 1 | 机构译名修复 (英文名混入中文) | 4 条 | 批量脚本:拆 `name`/`nameZh` | 其中 3 条与已有干净记录是重复,须先合并再改名,否则制造孤儿 | P0 |
| 2 | 机构去重合并 | 40 簇 (源 46 簇剔除 6 占位) | 批量脚本:保留 canonical、改 `roles.org` 外键、删冗余 | 误并独立实体会丢归属语义;须保留"研究院 vs 母体""子公司 vs 控股"边界 | P0/P1 |
| 3 | 履历日期修复 | 12 条 | 逐条 UPDATE `roles.start/end` | end<start 类 (2 条) 必改;实习 null 类 (7 条) 为估值,标记来源 | P1 |
| 4 | 关系删除 (幻觉) | 11 条 (可疑 37 中) | DELETE `relations`;26 条 uncertain 全保留 | 删错会丢真实弱关系,故只删 fabricated,uncertain 一条不动 | P1 |
| 5 | 名册数据质量 (排序/字段) | 8 类系统性问题 | 分批:`influenceScore` 重算 + `currentTitle`/`organization`/`roleCategory` 清洗 | influenceScore 重算是评分逻辑改动,需产品确认权重;字段清洗低风险 | P2 |
| 6 | 名册人物补充 | 14 个种子 (源 15 去重) | INSERT `people` 种子 + 后续补 roles/relations | 新增条目需走完整建模,半成品入库会再次拉低排序质量 | P3 |

**关键执行顺序约束**: 类别 1 与类别 2 必须**先做去重合并、再做改名**,因为 4 条译名问题里有 3 条 (Cambricon / DeepSeek / 寒武纪) 同时也是去重簇的成员。若先改名会让去重脚本匹配不到旧 `name`。

---

## 二、机构去重合并 (P0,先执行)

### 2.1 执行原则

- 每簇选一个 **canonical 记录** (优先有 `qid`、`roleCount` 最高的那条) 作为保留项。
- 其余成员记录:把 `roles.org` 里引用旧名的外键改写到 canonical 名,然后删除冗余 org 记录。
- `roleCount` 合并后需重算 (= 改写后指向该 org 的 role 条数),不要简单相加(可能有重复 role)。
- **剔除源数据里的 6 个占位簇** (仅 1 条成员,不构成重复,已核验均为单条): `Mila – Quebec AI Institute`、`DNNresearch Inc.`、`Coursera`、`deeplearning.ai`,以及 reason 里自标 "占位需移除" 的两条。实际有效簇 = **40 簇**。

### 2.2 批量喂脚本的合并表 (canonical ← members)

下表可直接序列化成 JSON/CSV 喂批量脚本。`keep` = 规范名 (canonical),`merge` = 需被改写并删除的旧名。

| canonical (保留) | 被合并的旧名 (members) | 备注/边界 |
|---|---|---|
| OpenAI | OpenAI Foundation | 含非营利母体,合并 |
| Google | Google (Google Brain/Google Research); Google – Gemini API / distributed systems & developer tooling; Google – Go team / developer products; Google – Spanner team | **不并** Google Brain / DeepMind / Alphabet |
| Google Brain | Google Brain (Google) | 单独成簇,**不并** Google 主体、**不并** DeepMind |
| Google DeepMind | DeepMind; DeepMind Technologies | **不并** Google Brain (保留源起语义) |
| Alphabet Inc. | Alphabet | **不并** Google (母控股 vs 子公司) |
| Apple Inc. | Apple | — |
| Amazon | Amazon.com | **不并** AWS (子品牌,无 qid 关联) |
| Baidu | Baidu, Inc. | **不并** Baidu Research (AI Group) |
| Qualcomm | Qualcomm Incorporated; Qualcomm Technologies, Inc. (QTI) | QTI 严格是子公司,实务混用故并 |
| Meta | Meta (Facebook); Meta Superintelligence Labs; Facebook; Meta AI | **不并** FAIR (单独成簇,见下) |
| Facebook AI Research (FAIR) | Facebook AI Research; Facebook Artificial Intelligence Research; FAIR Montreal | 与 Meta 本体分开,保留研究院语义 |
| Microsoft Research Asia | Microsoft Research Asia (MSRA) | **不并** Microsoft / Microsoft Research |
| Tesla, Inc. | Tesla | — |
| Twitter / X Corp. | Twitter; Twitter (now X Corp.); Twitter, Inc. / X Corp.; X.com | **不并** xAI (独立公司) |
| Safe Superintelligence Inc. | Safe Superintelligence Inc | 仅句点差异 |
| Thinking Machines Lab | Thinking Machines | Mira Murati 2025 新公司,与 1980s 同名超算公司无关 |
| Vector Institute | Vector Institute for Artificial Intelligence | — |
| Canadian Institute for Advanced Research (CIFAR) | CIFAR (Canadian Institute for Advanced Research) | **不并** Canada CIFAR AI Chairs Program (项目) |
| Massachusetts Institute of Technology (MIT) | Massachusetts Institute of Technology; MIT | **不并** MIT Sloan |
| Stanford University | Stanford Artificial Intelligence Lab (SAIL); Stanford University, Computer Science Department; Stanford University, Sequoia Professor; Stanford Vision Lab | **不并** Stanford HAI (见下);本簇只收系/讲席/通用实验室 |
| Stanford Institute for Human-Centered AI (HAI) | Stanford HAI | 独立品牌研究院,**不并** Stanford 本体 |
| University of California, Berkeley | UC Berkeley; Berkeley RISE Lab | — |
| New York University | NYU Courant Institute of Mathematical Sciences | **不并** NYU Tandon (有独立 qid) |
| Carnegie Mellon University | Carnegie Mellon University Computer Science Department; NeuLab @ LTI/CMU | — |
| Johns Hopkins University | The Johns Hopkins University | **不并** Center for Talented Youth |
| Indian Institute of Technology Kanpur | Indian Institute of Technology, Kanpur | 仅逗号差异 |
| University of Illinois Urbana–Champaign | University of Illinois at Urbana-Champaign; University of Illinois at Urbana–Champaign | 仅 "at" / 连字符差异 |
| University of British Columbia | SBS & University of British Columbia | 证据偏弱,SBS 疑为脏前缀 |
| Cambricon Technologies | Cambricon Technologies (中科寒武纪科技股份有限公司) | **同时是译名修复项,见 §3** |
| Institute of Computing Technology, Chinese Academy of Sciences | Chinese Academy of Sciences, Institute of Computing Technology; Institute of Computing Technology, Chinese Academy of Sciences (CAS ICT) | 中科院计算所 |
| University of Science and Technology of China (USTC) | University of Science and Technology of China | — |
| DeepSeek | DeepSeek (杭州深度求索人工智能基础技术研究有限公司) | **同时是译名修复项,见 §3**;**不并** High-Flyer / 幻方 |
| Econet Wireless | Econet Wireless (later Econet Group / Cassava Technologies) | — |
| Dalle Molle Institute for AI Research (IDSIA) | Dalle Molle Institute for Artificial Intelligence Research | — |
| Dropbox | Dropbox Inc. | — |
| Netflix | Netflix Inc. | — |
| Future of Humanity Institute | Future of Humanity Institute (Oxford University) | **不并** University of Oxford |
| Machine Intelligence Research Institute (MIRI) | Machine Intelligence Research Institute | — |
| Leverhulme Centre for the Future of Intelligence | Leverhulme Centre for the Future of Intelligence (CFI) | — |
| Accademia di Belle Arti di Firenze | Academy of Fine Arts, Florence | 英文名 ↔ 意大利文原名 |
| King's College, Cambridge | King's College | 弱合并;**不并** King's College, New Zealand |

> **需人工裁定的弱合并 (脚本里标 `needs_review=true`,不要自动执行)**:
> - **IBM ← IBM Research**: 源数据自标 "弱合并",IBM Research 有独立 qid (Q3146518)。建议**保留两条不并**,把 role 归属交人工判定。
> - **University of British Columbia ← SBS & UBC**: 证据弱,合并前人工确认 SBS 不是独立机构。
> - **King's College ← King's College, Cambridge**: 无地点限定的 "King's College" 需人工确认不指向新西兰那所。

### 2.3 脚本思路 (伪 SQL)

```sql
-- 对每个 (keep, merge_name) 对:
-- 1) 改 role 外键
UPDATE roles SET org = :keep WHERE org = :merge_name;
-- (orgZh 同步,若 merge 记录的 orgZh 更规范,可一并回填 keep 记录的 nameZh)
-- 2) 删冗余 org
DELETE FROM organizations WHERE name = :merge_name;
-- 3) 重算 keep 的 roleCount
UPDATE organizations o SET roleCount =
  (SELECT count(*) FROM roles r WHERE r.org = o.name) WHERE o.name = :keep;
```

JSON 数组实现:读 organizations.json → 建 `merge_name → keep` 映射 → 遍历 roles.json 改 `org` 字段 → 从 orgs 删除所有 `merge_name` 记录 → 重算 `roleCount` → 写回。

---

## 三、机构译名修复 (P0,在去重之后)

英文 `name` 字段被塞入了中文。修复 = 把中文移到 `nameZh`,`name` 留纯英文。**前 3 条须先完成 §2 去重 (旧名记录已被删),只剩 canonical 记录待改名;第 4 条 StepFun 是独立改名,无重复。**

| 当前 name (脏) | 改后 name (英文) | 改后 nameZh (中文) | 操作 |
|---|---|---|---|
| Cambricon Technologies (中科寒武纪科技股份有限公司) | Cambricon Technologies | 中科寒武纪科技股份有限公司 | 已在 §2 合并删除,canonical 即 `Cambricon Technologies`,只需回填 nameZh |
| DeepSeek (杭州深度求索人工智能基础技术研究有限公司) | DeepSeek | 杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek） | 同上,canonical=`DeepSeek`,回填 nameZh |
| Hangzhou Huanfang Technology Co Ltd (幻方量化) | Hangzhou Huanfang Technology Co., Ltd. (High-Flyer) | 杭州幻方科技有限公司（幻方量化 / High-Flyer） | 独立改名;**不与 DeepSeek 合并** (母体量化基金,不同法人) |
| Stepfun 阶跃星辰 | StepFun | 阶跃星辰 | 独立改名;`name` 拆出中文 |

```sql
UPDATE organizations SET name='StepFun', nameZh='阶跃星辰' WHERE name='Stepfun 阶跃星辰';
UPDATE organizations SET name='Hangzhou Huanfang Technology Co., Ltd. (High-Flyer)',
  nameZh='杭州幻方科技有限公司（幻方量化 / High-Flyer）'
  WHERE name='Hangzhou Huanfang Technology Co Ltd (幻方量化)';
-- Cambricon / DeepSeek: 去重后 canonical 已是纯英文名,补 nameZh 即可
UPDATE organizations SET nameZh='中科寒武纪科技股份有限公司' WHERE name='Cambricon Technologies';
UPDATE organizations SET nameZh='杭州深度求索人工智能基础技术研究有限公司（深度求索 / DeepSeek）' WHERE name='DeepSeek';
```

> 注意:改名后须同步 `roles.org` 中引用 `Stepfun 阶跃星辰` / `Hangzhou Huanfang...(幻方量化)` 旧值的外键。

---

## 四、履历日期修复 (P1)

`roles` 表无主键,用 `person + org + role` 联合定位 (源附了行号便于人工核对)。分两类:

### 4.1 end < start —— 逻辑不可能,必改 (2 条)

| person | org | role | 现值 | 改为 | 依据 |
|---|---|---|---|---|---|
| Emad Mostaque | University of Oxford | Student | start=2004-12-31, end=2000-12-30 | start=2000-12-31, end=2004-12-30 | 牛津应 2000 入学、2004 毕业,start/end 颠倒 |
| 苏姿丰 | 麻省理工学院 | 电机工程博士 | start=2014-10-08, end=1994-01-01 | start=1990-01-01, end=1994-01-01 | 苏 1994 已博士毕业进 TI,start=2014 明显错 |

### 4.2 start == end (零时长) —— 补 endDate 或置 null (5 条)

| person | org | role | 现值 | 建议 |
|---|---|---|---|---|
| Yann Dubois | University of Amsterdam | Researcher | 2018-01-01 / 2018-01-01 | 短期访问补 end=2018-12-01,或不详则 end=null |
| Yann Dubois | SBS & University of British Columbia | Researcher | 2017-01-01 / 2017-01-01 | 补 2017 内某月 end,或 end=null |
| Yann Dubois | EPFL | Researcher | 2016-01-01 / 2016-01-01 | 补合理 end,或 end=null |
| Leslie Kaelbling | Brown University | Faculty | 1999-01-01 / 1999-01-01 | 按实际离职年补 end,在职则 end=null |
| Aidan Gomez | Google Brain | Intern | 2016-12-31 / 2019-12-30 | 实习跨 3 年异常:缩为单次 (end≈2017) 或改 role 为 Student Researcher |

### 4.3 实习类 end=null (视同至今) —— 补估算结束日 (5 条)

实习不应持续至今。**这批 end 是估值,脚本里 `source` 字段标注 `audit-estimate` 以区分原始数据。**

| person | org | role | 建议 end |
|---|---|---|---|
| Boris Power | Microsoft Research | Research Intern | 2013-09-01 |
| Dylan Field | LinkedIn | Intern | 2010-09-01 |
| Andrej Karpathy | Google Research | 实习生 | 2013-09-01 |
| Andrej Karpathy | Google Brain | 实习生 | 2011-09-01 |
| Andrej Karpathy | Google DeepMind | 实习生 | 2015-09-01 |

```sql
-- 示例 (end<start):
UPDATE roles SET start='2000-12-31', end='2004-12-30'
  WHERE person='Emad Mostaque' AND org='University of Oxford' AND role='Student';
-- 示例 (实习补估值,标记来源):
UPDATE roles SET end='2013-09-01', source='audit-estimate'
  WHERE person='Boris Power' AND org='Microsoft Research' AND role='Research Intern';
```

> 提示:§2 去重把 `Google Brain` / `Google DeepMind` 保留为独立 canonical,Karpathy 这几条实习的 `org` 不受去重影响,可正常定位。

---

## 五、关系删除清单 (P1)

可疑 37 条中判定 **fabricated 共 11 条,全部删除**;其余 **26 条 uncertain 一条不删** (保守保留)。删除用 `person + related + type` 联合定位。

### 5.1 删除 (fabricated, 11 条)

| person | related | type | 删除理由 (摘要) |
|---|---|---|---|
| Andrej Karpathy | Hugo Larochelle | colleague | 职业线无同期同机构交集,仅 2016 同台公开课讲者,非同事 |
| Andrej Karpathy | 德米特里·巴丹瑙 (Dzmitry Bahdanau) | colleague | 完全无交集,唯一互动是 2022 邮件请教,非共事 |
| Andrej Karpathy | 丹·克莱因 (Dan Klein) | collaborator | Stanford vs Berkeley 两体系,无合著/师生/共事 |
| Lukasz Kaiser | Shane Legg | colleague | Google Brain vs DeepMind 隔离组织,合并前 Kaiser 已离职 |
| Demis Hassabis | 黄仁勋 (Jensen Huang) | colleague | 仅跨公司业务伙伴/行业同侪,非同事 |
| Ilya Sutskever | Emad Mostaque | collaborator | 仅同签 2023 AI 风险公开信,理念对立,非合作者 |
| Ilya Sutskever | Paul Graham | collaborator | 仅经 Altman 间接关联,无直接合作 |
| Ilya Sutskever | 戴文渊 | collaborator | 学术/职业线零重叠 |
| Ilya Sutskever | Scott Wu | collaborator | 疑似 Jeffrey Wu / Scott Gray 姓名混淆产物 |
| Dario Amodei | Emad Mostaque | colleague | 仅同签行业公开信,非同事 |
| Jeremy Howard | Jan Leike | collaborator | 领域不交,Leike 发表列表无 Howard |

```sql
DELETE FROM relations WHERE person='Andrej Karpathy' AND related='Hugo Larochelle' AND type='colleague';
DELETE FROM relations WHERE person='Andrej Karpathy' AND related='德米特里·巴丹瑙(Dzmitry Bahdanau)' AND type='colleague';
DELETE FROM relations WHERE person='Andrej Karpathy' AND related='丹·克莱因(Dan Klein)' AND type='collaborator';
DELETE FROM relations WHERE person='Lukasz Kaiser' AND related='Shane Legg' AND type='colleague';
DELETE FROM relations WHERE person='Demis Hassabis' AND related='黄仁勋(Jensen Huang)' AND type='colleague';
DELETE FROM relations WHERE person='Ilya Sutskever' AND related='Emad Mostaque' AND type='collaborator';
DELETE FROM relations WHERE person='Ilya Sutskever' AND related='Paul Graham' AND type='collaborator';
DELETE FROM relations WHERE person='Ilya Sutskever' AND related='戴文渊' AND type='collaborator';
DELETE FROM relations WHERE person='Ilya Sutskever' AND related='Scott Wu' AND type='collaborator';
DELETE FROM relations WHERE person='Dario Amodei' AND related='Emad Mostaque' AND type='colleague';
DELETE FROM relations WHERE person='Jeremy Howard' AND related='Jan Leike' AND type='collaborator';
```

> `related` 字段含中文括注的 (Bahdanau / Dan Klein / 黄仁勋),须**用源数据里的完整原值精确匹配**,否则 DELETE 命中失败。建议脚本先 SELECT 计数 = 1 再 DELETE,防误删。

### 5.2 保留 (uncertain, 26 条,不动)

全部 uncertain 判定保留,典型如下 (理由:有真实弱关系或边界情况,删了会丢真信息):
- Karpathy ↔ 吴恩达 (advisor):rotation 导师 + CS229A 助教,真实但 "主导师" 标签不准 → **保留,可后续把 type 改为更准的弱关系标签**。
- Karpathy ↔ Demis Hassabis (colleague):2015 DeepMind 实习有一级来源,但实习生 vs CEO 不算同事 → 保留。
- Karpathy ↔ Raia Hadsell (colleague):2015 同处 DeepMind 同方向,缺直接署名 → 保留。
- Jeremy Howard ↔ Marc Andreessen (collaborator):a16z 机构级资助 + 同立场反 SB1047,无个人合作 → 保留。

> 处置建议:uncertain 不删,但可在 schema 加一个 `review_status` 字段标 `uncertain`,前端展示时弱化或标注 "关系待核",避免和 real 关系等权呈现。

---

## 六、名册数据质量修复 (P2)

`people.json` (219 条) 的系统性问题,分三个可独立推进的子任务。

### 6.1 influenceScore 重算 (需产品确认权重,最高决策成本)

**根因**:现评分系统性偏学术 (citation/h-index/学术声望),对产业领袖严重低估。

| 子问题 | 现状证据 | 修复动作 |
|---|---|---|
| Top 12 全是研究员/教授 | Karpathy 90.91、Bengio 84.58、LeCun 84.49… | 引入"产业影响力"维度 (公司规模/市场地位/资本影响),不能只奖励学术指标 |
| 产业 CEO 低估 | Altman 59.83、黄仁勋 51.6、扎克伯格 43.8、皮查伊 43.8、纳德拉 23.75、Jassy 10、苏姿丰 14.95 | 纳德拉/皮查伊/黄仁勋应进 Top 20 |
| 梁文锋仅 10 分 | 全表最离谱低估,且 title 错成 'R&D Staff @ HKBU COMP' | 重算分 + 修 title (DeepSeek 创始人) |
| 86 条 influenceScore=0 | Pachocki、Mark Chen、Tri Dao、David Silver、Sergey Levine、Chelsea Finn、Tianqi Chen、王小川、陈天石全 0 | **0 分 ≠ 真实排名,是"未计算"占位**。先把 0 分批量标 `score_status='pending'` 单独隔离,再补算,避免污染中下段排序 |

```sql
-- 第一步隔离 (低风险,可立刻做):
UPDATE people SET score_status='pending' WHERE influenceScore = 0;  -- 命中 86 条
-- 重算逻辑需新权重表,属产品决策,不在本清单内固化
```

### 6.2 字段清洗 (低风险,可立即批量修)

**currentTitle 抓取错位** (LLM 抓到早期/无关职位):

| person | 错误 currentTitle | 正确 |
|---|---|---|
| Mira Murati | Employee @ Goldman Sachs | Founder/CEO @ Thinking Machines Lab |
| Alec Radford (亚历克·拉德福德) | Indico Data Solutions | (前 OpenAI,补正确现职) |
| Wojciech Zaremba | Google Brain | Co-founder @ OpenAI |
| 苏姿丰 / James Manyika | board of directors member | 苏=AMD CEO;Manyika=Google SVP |
| 张鹏 (智谱) | Center for Excellence in Molecular Plant Sciences | 智谱 CEO |
| Rachel Thomas | 城市记录员 @ City of Newberg | fast.ai 联合创始人 |
| Arvind Krishna | Federal Reserve Bank | IBM CEO |

**organization 数组去重** (同机构出现两次):Karpathy 的 "OpenAI基金会" 重复、Manning 的 "斯坦福大学" 重复 → 数组内去重。

```sql
-- organization 去重 (JSON 实现:对每条 people 的 organization 数组做 set 去重)
```

**roleCategory 纠错** (干扰按角色加权排序):
- 错标 `researcher` 应为 `founder`:Demis Hassabis、姚顺雨、季逸超、闫俊杰 (MiniMax CEO)、杨植麟 (Kimi CEO)。
- 错标 `founder` 但实为学术/研究岗:彼得·阿比尔、Sam McCandlish → 核对后改。

### 6.3 时效性更新 (中风险,需逐人核实)

库 title 多停留 2023–2024,未反映 2025 人才流动:OpenAI→Meta 超智实验室、Thinking Machines/SSI 组队、Qwen 团队 Lin Junyang 离职等。建议与 6.2 的 title 清洗合并一轮处理。

---

## 七、名册人物补充种子清单 (P3)

源 15 个建议中,梁文锋(已在库,属修复非新增)排除,**实际新增 14 个**。下表可直接作为 `people` 表 INSERT 种子 (`influenceScore` 先置 `pending`,待 6.1 统一重算;`status='seed'` 标记半成品)。

| name | roleCategory | organization | currentTitle | area / 入库理由 |
|---|---|---|---|---|
| Aravind Srinivas | founder | Perplexity | Co-founder & CEO | AI 原生搜索标杆,冲击 Google 范式;库内完全缺失 |
| Deepak Pathak | founder | Skild AI | Founder & CEO | 具身智能产业新锐 (融资 20 亿+),补学术派之外的产业侧 |
| Brett Adcock | founder | Figure AI | Founder & CEO | 人形机器人商业化标杆 (估值 390 亿);库内无人形机器人创始人 |
| Michael Truell | founder | Anysphere (Cursor) | Co-founder & CEO | AI coding 最热赛道一号位;库内只有 Boris Cherny |
| Shengjia Zhao (赵晟佳) | researcher | Meta Superintelligence Labs | Chief Scientist | GPT-4/o1 核心,2025 标志性人才流动;Meta AI 科学一号位缺失 |
| Noam Brown | researcher | OpenAI | 推理研究负责人 | o1/o3 推理奠基人;推理方向领军缺失 |
| Lilian Weng (翁丽莲) | founder | Thinking Machines Lab | Co-founder | 前 OpenAI 安全 VP;**注意核对库内 "李莲" (score 40) 是否同人,去重优先** |
| Tim Brooks | researcher | Google DeepMind | 世界模型团队负责人 | Sora 共同负责人转 DeepMind;世界模型方向几乎空白 |
| Justin Johnson | founder | World Labs | Co-founder | **注意核对库内 "贾斯汀·约翰逊" (score 0) 同人,去重/更新优先** |
| Ben Mildenhall | founder | World Labs | Co-founder | NeRF 发明者;空间智能/3D 生成核心 |
| Liam Fedus | founder | Periodic Labs | Co-founder | 前 OpenAI 后训练 VP;AI4Science 新热点代表 |
| Junyang Lin (林俊旸) | researcher/founder | (前 阿里通义千问) | 前 Qwen 技术负责人 | 中西方开源生态桥梁;中国开源大模型技术一号位缺失 |
| Bindu Reddy | founder | Abacus.AI | Co-founder & CEO | agentic AI 平台 + 产业意见领袖;补女性产业创始人多样性 |

> **入库前必做去重核对** (3 个高风险点,否则会制造库内重复人物):
> - **Lilian Weng** vs 库内 **"李莲" (score 40)** —— 极可能同人,若是则走"修复"而非"新增"。
> - **Justin Johnson** vs 库内 **"贾斯汀·约翰逊" (score 0,标 Michigan 助理教授)** —— 同人未更新 World Labs,走"修复"。
> - **梁文锋** 已在库,只修不增 (见 §6.1)。

---

## 八、统一修复优先级排序

| 序 | 任务 | 类别 | 风险 | 阻塞关系 |
|---|---|---|---|---|
| **1** | 机构去重合并 (40 簇,IBM/UBC/King's 三条弱合并标 needs_review 不自动跑) | §2 | 中 (误并丢语义) | 阻塞 §3 改名;先做 |
| **2** | 机构译名修复 (4 条) | §3 | 低 | 依赖 §1 完成 |
| **3** | 关系删除 (11 条 fabricated;uncertain 全留) | §5 | 低 (精确匹配,删前 SELECT 计数) | 独立,可与 §1/§2 并行 |
| **4** | 履历日期 end<start (2 条) | §4.1 | 低 (逻辑必错) | 独立 |
| **5** | influenceScore=0 隔离 (86 条标 pending) | §6.1 | 低 | 阻塞排序可信度;先隔离 |
| **6** | currentTitle / organization / roleCategory 字段清洗 | §6.2 | 低 | 独立,可批量 |
| **7** | 履历日期 实习/零时长 (10 条,标 audit-estimate) | §4.2/4.3 | 低-中 (估值) | 独立 |
| **8** | influenceScore 权重重算 | §6.1 | 高 (评分逻辑改动,需产品定权重) | 依赖 §5 隔离完成 |
| **9** | 名册时效性更新 (2025 人才流动) | §6.3 | 中 (逐人核实) | 可并入 §6 一轮 |
| **10** | 名册补充 14 种子 (先做 Lilian Weng/Justin Johnson 去重核对) | §7 | 中 (半成品入库会再降排序质量) | 依赖 §6.1 评分体系就绪 |

**一句话执行建议**: 先跑 §1→§2 (去重再改名,绑定执行)、§3 删关系、§4.1 改逻辑错日期、§6.1 隔离 0 分 —— 这五件都是低风险高确定、立刻能落,且能马上把"机构脏数据 + 幻觉关系 + 假排名"三个最影响可信度的问题压下去。influenceScore 重算 (§8) 和名册补充 (§10) 风险最高、依赖最多,放最后,且需产品先定权重/去重再动手。

---

**数据文件位置** (均为 pretty-printed JSON 数组,`*.jsonl` 为同源副本):
- `/Users/linchen/Downloads/ai/ai-person-agent/docs/audit-2026-06/data/organizations.json` (667 条,字段 `id/name/nameZh/type/qid/roleCount`)
- `/Users/linchen/Downloads/ai/ai-person-agent/docs/audit-2026-06/data/people.json` (219 条,字段 `id/name/organization/currentTitle/influenceScore/occupation/roleCategory/status/topics`)
- `/Users/linchen/Downloads/ai/ai-person-agent/docs/audit-2026-06/data/roles.json` (1127 条,字段 `person/role/roleZh/org/orgZh/start/end/source/confidence`,无主键,用 `person+org+role` 定位)
- `/Users/linchen/Downloads/ai/ai-person-agent/docs/audit-2026-06/data/relations.json` (297 条,字段 `person/related/type/description/source/confidence`,无主键,用 `person+related+type` 定位)

---
## STATS
