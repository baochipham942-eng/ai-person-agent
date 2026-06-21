# Quality Review Third Pass - 2026-06-13

本轮只生成建议和 dry-run，不应用数据库变更。目标是继续压低 launch gate 里剩余的 high quality queue。

## 门禁口径队列

- 命令：`npm run audit:quality-review -- --limit=80 --max-people=80 --batch-size=10 --severity=high`
- 扫描人物：80
- high 人物：7
- high issue：7
- QA review rows：84
- relation evidence coverage：100%
- activity source coverage：100%
- card source coverage：100%

## 建议决策

- 建议总数：21
- keep：3
- reject：18
- review：0
- 覆盖人物：Elon Musk、杰夫·迪恩、Chris Olah、亚历克·拉德福德、阿希什·瓦斯瓦尼、Hyung Won Chung、Daniela Amodei

## 策略

- X 链接没有抓取正文、只有链接、只有泛化观点或团队称赞时，建议 reject。
- GitHub 仓库列表页只作为导航入口，不作为具体作品证据，建议 reject。
- 本人账号下具体 GitHub repo，且和文本生成、计算机视觉等 AI 方向有关，可以 keep 为低优先级作品线索。
- 官方融资公告属于明确公司里程碑，可以 keep。
- YouTube 登录页、短营销片段或正文不可验证的抓取，建议 reject。

## Dry-run 结果

- 文件：`/tmp/ai-person-quality-decisions-third-pass-high80-suggested.json`
- dry-run：`/tmp/ai-person-quality-apply-third-pass-high80-dry-run.json`
- total：21
- dryRun：21
- applied：0
- skipped：0
- errors：0

## 明细

- Elon Musk | reject | `https://x.com/elonmusk/status/1988662682241618367` | X URL 没有抓取正文，不能支撑公开人物事实。
- Elon Musk | reject | `https://x.com/elonmusk/status/2003983843674800469` | 排名类短动态信息密度低。
- Elon Musk | reject | `https://x.com/elonmusk/status/2003991593259618369` | 观点短句缺少事实和上下文。
- 杰夫·迪恩 | reject | `https://x.com/JeffDean/status/2003528031906971817` | 个人工作感受类短动态，证据价值弱。
- 杰夫·迪恩 | reject | `https://x.com/JeffDean/status/1886852442815652188` | X URL 没有抓取正文。
- 杰夫·迪恩 | reject | `https://x.com/JeffDean/status/1858540085794451906` | X URL 没有抓取正文。
- Chris Olah | reject | `https://x.com/ch402/status/1987731386611167327` | 内容不完整，只能看到片段线索。
- Chris Olah | reject | `https://x.com/ch402/status/1920160214613176555` | 低密度团队活动提及，不足以支撑人物页证据。
- Chris Olah | reject | `https://github.com/colah?tab=repositories` | 仓库列表页是导航页，不是具体作品来源。
- 亚历克·拉德福德 | reject | `https://x.com/AlecRad/status/1064280158264152066` | 旧 X 内容噪声高，人物主体和证据价值都弱。
- 亚历克·拉德福德 | keep | `https://github.com/Newmu/text-generation` | 本人账号官方 repo，和文本生成相关，可作为低优先级作品线索。
- 亚历克·拉德福德 | keep | `https://github.com/Newmu/JSEye` | 本人账号官方 repo，和计算机视觉相关，可作为低优先级作品线索。
- 阿希什·瓦斯瓦尼 | reject | `https://x.com/ashVaswani/status/1999196274155991350` | 团队称赞短动态，缺少具体贡献证据。
- 阿希什·瓦斯瓦尼 | reject | `https://x.com/ashVaswani/status/1997126539188883494` | 只有链接，没有可验证正文。
- 阿希什·瓦斯瓦尼 | reject | `https://x.com/ashVaswani/status/1997446800417140900` | 合作回忆短动态，信息密度低。
- Hyung Won Chung | reject | `https://x.com/hwchung27/status/1800676312916656592` | X link-only，无正文可验。
- Hyung Won Chung | reject | `https://x.com/hwchung27/status/1836842717302943774` | X link-only，无正文可验。
- Hyung Won Chung | reject | `https://x.com/hwchung27/status/1844705450635509802` | X link-only，无正文可验。
- Daniela Amodei | keep | `https://x.com/DanielaAmodei/status/1520075689747116033` | 官方融资公告，属于 Anthropic 公司里程碑。
- Daniela Amodei | reject | `https://www.youtube.com/watch?v=UMF1nf3Iy3Q` | 抓取为 YouTube 登录页，不能作为来源证据。
- Daniela Amodei | reject | `https://www.youtube.com/watch?v=CIXjhPdJE_o` | 短营销/片段型视频，信息密度不足。
