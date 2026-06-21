/**
 * 用「代表作反查」批量解 review 队列里常见名研究者的 OpenAlex author ID。
 *
 * 背景：OpenAlex 按名搜对常见名(Ashish Vaswani / Tom Brown…)返回一堆同名其他人，机构过滤也不灵。
 * 可靠解法=搜本人**标志性论文** works?search=<title>，在该论文 authorships 里按**英文名匹配**取
 * 对应作者的 author.id（绑定具体论文绕开重名）。本脚本把 review 队列的人逐个这么解。
 *
 * 安全：①只对「确信代表作 + 确信本人是作者」的人做（PAPER_MAP 手工 curated）；
 *      ②论文里匹配不到该名的作者就跳过（不瞎写）；③dry-run 默认；④幂等（有 ID 跳过）；
 *      ⑤OpenAlex budget 限额时该条标 budget 跳过，不误判。写身份 ID 需 --execute。
 *
 * 用法：
 *   npx tsx scripts/enrich/resolve_ids_by_landmark.ts            # dry-run
 *   npx tsx scripts/enrich/resolve_ids_by_landmark.ts --execute  # 写库
 *   npx tsx scripts/enrich/resolve_ids_by_landmark.ts --only="Ashish Vaswani,Tom Brown"
 */
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { prisma } from '@/lib/db/prisma';

const MAILTO = 'ai-person-agent@example.com';
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** 归一：小写去标点。matchName 用来在 authorship 里认出本人。 */
function norm(s: string): string {
  return (s || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

interface Entry {
  person: string;   // DB 主名（中文或英文，用于定位人物）
  matchName: string;// 论文 authorship 里要匹配的英文名
  paper: string;    // 标志性论文标题（搜得到、且本人确为作者）
}

// 手工 curated：每条都是「确信代表作 + 确信本人是作者」。matchName 用论文署名形式。
const PAPER_MAP: Entry[] = [
  { person: '李飞飞', matchName: 'Fei-Fei Li', paper: 'ImageNet: A Large-Scale Hierarchical Image Database' },
  { person: '阿希什·瓦斯瓦尼', matchName: 'Ashish Vaswani', paper: 'Attention Is All You Need' },
  { person: '利昂·琼斯', matchName: 'Llion Jones', paper: 'Attention Is All You Need' },
  { person: '汤姆·布朗', matchName: 'Tom Brown', paper: 'Language Models are Few-Shot Learners' },
  { person: 'Noam Brown', matchName: 'Noam Brown', paper: 'Superhuman AI for multiplayer poker' },
  { person: '姚顺宇', matchName: 'Shunyu Yao', paper: 'ReAct: Synergizing Reasoning and Acting in Language Models' },
  { person: '乔尔·皮诺', matchName: 'Joelle Pineau', paper: 'Deep Reinforcement Learning that Matters' },
  { person: '帕斯卡尔·文森特', matchName: 'Pascal Vincent', paper: 'Extracting and composing robust features with denoising autoencoders' },
  { person: '沙基尔·穆罕默德', matchName: 'Shakir Mohamed', paper: 'Variational Inference with Normalizing Flows' },
  { person: '雷亚·哈德塞尔', matchName: 'Raia Hadsell', paper: 'Progressive Neural Networks' },
  { person: '乔治亚·吉奥克萨里', matchName: 'Georgia Gkioxari', paper: 'Mask R-CNN' },
  { person: '彼得罗·佩罗纳', matchName: 'Pietro Perona', paper: 'One-shot learning of object categories' },
  { person: '大卫·洛佩兹-帕斯', matchName: 'David Lopez-Paz', paper: 'Gradient Episodic Memory for Continual Learning' },
  { person: '奥尼·汉农', matchName: 'Awni Hannun', paper: 'Deep Speech: Scaling up end-to-end speech recognition' },
  { person: '阿卜杜勒-拉赫曼·穆罕默德', matchName: 'Abdelrahman Mohamed', paper: 'wav2vec 2.0: A Framework for Self-Supervised Learning of Speech Representations' },
  { person: '乔治·爱德华·达尔', matchName: 'George Dahl', paper: 'Context-Dependent Pre-Trained Deep Neural Networks for Large-Vocabulary Speech Recognition' },
  { person: '李宏乐', matchName: 'Honglak Lee', paper: 'Convolutional deep belief networks for scalable unsupervised learning of hierarchical representations' },
  { person: '阿列克谢·A·埃夫罗斯', matchName: 'Alexei Efros', paper: 'Unpaired Image-to-Image Translation using Cycle-Consistent Adversarial Networks' },
  { person: '鲁斯兰·萨拉赫丁诺夫', matchName: 'Ruslan Salakhutdinov', paper: 'Dropout: A Simple Way to Prevent Neural Networks from Overfitting' },
  { person: '大卫·杜维诺', matchName: 'David Duvenaud', paper: 'Neural Ordinary Differential Equations' },
  { person: '齐科·科尔特', matchName: 'Zico Kolter', paper: 'Deep Equilibrium Models' },
  { person: '马克·奥雷利奥·兰扎托', matchName: "Marc'Aurelio Ranzato", paper: 'Sequence Level Training with Recurrent Neural Networks' },
  { person: '谢尔盖·贝隆吉', matchName: 'Serge Belongie', paper: 'Microsoft COCO: Common Objects in Context' },
  { person: '塞缪尔·瑞安·鲍曼', matchName: 'Samuel Bowman', paper: 'A large annotated corpus for learning natural language inference' },
  { person: '普拉纳夫·拉杰普尔卡', matchName: 'Pranav Rajpurkar', paper: 'SQuAD: 100,000+ Questions for Machine Comprehension of Text' },
  { person: '保罗·德贝维奇', matchName: 'Paul Debevec', paper: 'NeRF: Representing Scenes as Neural Radiance Fields for View Synthesis' },
  { person: '何凯明', matchName: 'Kaiming He', paper: 'Deep Residual Learning for Image Recognition' },
  { person: '索拉布·古普塔', matchName: 'Saurabh Gupta', paper: 'Cognitive Mapping and Planning for Visual Navigation' },
  { person: '贾佳亚', matchName: 'Jiaya Jia', paper: 'Pyramid Scene Parsing Network' },
  { person: '于克朱', matchName: 'Yuke Zhu', paper: 'Target-driven Visual Navigation in Indoor Scenes using Deep Reinforcement Learning' },
  { person: '吉姆·范', matchName: 'Linxi Fan', paper: 'Voyager: An Open-Ended Embodied Agent with Large Language Models' },
  { person: 'Omar Khattab', matchName: 'Omar Khattab', paper: 'ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT' },
  { person: 'Ofir Press', matchName: 'Ofir Press', paper: 'Train Short, Test Long: Attention with Linear Biases Enables Input Length Extrapolation' },
  { person: 'Guanzhi Wang', matchName: 'Guanzhi Wang', paper: 'Voyager: An Open-Ended Embodied Agent with Large Language Models' },
  { person: 'Anthony Brohan', matchName: 'Anthony Brohan', paper: 'RT-1: Robotics Transformer for Real-World Control at Scale' },
  { person: 'Patrick Lewis', matchName: 'Patrick Lewis', paper: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks' },
  { person: 'Douwe Kiela', matchName: 'Douwe Kiela', paper: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks' },
  { person: 'John Yang', matchName: 'John Yang', paper: 'SWE-bench: Can Language Models Resolve Real-World GitHub Issues?' },
  { person: 'Albert Q. Jiang', matchName: 'Albert Jiang', paper: 'Mistral 7B' },
  { person: 'Zhihong Shao', matchName: 'Zhihong Shao', paper: 'DeepSeekMath: Pushing the Limits of Mathematical Reasoning in Open Language Models' },
  { person: 'Jeff Clune', matchName: 'Jeff Clune', paper: 'Deep Neuroevolution: Genetic Algorithms Are a Competitive Alternative for Training Deep Neural Networks' },
  { person: 'Jürgen Schmidhuber', matchName: 'Jürgen Schmidhuber', paper: 'Long Short-Term Memory' },
  // —— 第二批：剩余可解学术人 ——
  { person: 'Shengjia Zhao', matchName: 'Shengjia Zhao', paper: 'Bias and Generalization in Deep Generative Models: An Empirical Study' },
  { person: 'Nicholas Joseph', matchName: 'Nicholas Joseph', paper: 'A General Language Assistant as a Laboratory for Alignment' },
  { person: 'Evan Hubinger', matchName: 'Evan Hubinger', paper: 'Sleeper Agents: Training Deceptive LLMs that Persist Through Safety Training' },
  { person: 'Trenton Bricken', matchName: 'Trenton Bricken', paper: 'Towards Monosemanticity: Decomposing Language Models With Dictionary Learning' },
  { person: 'Haofan Wang', matchName: 'Haofan Wang', paper: 'InstantID: Zero-shot Identity-Preserving Generation in Seconds' },
  { person: 'Ashutosh Saxena', matchName: 'Ashutosh Saxena', paper: 'Make3D: Learning 3D Scene Structure from a Single Still Image' },
  { person: 'Nathan Lambert', matchName: 'Nathan Lambert', paper: 'RewardBench: Evaluating Reward Models for Language Modeling' },
  { person: 'Noah Shinn', matchName: 'Noah Shinn', paper: 'Reflexion: Language Agents with Verbal Reinforcement Learning' },
  { person: 'Shreya Shankar', matchName: 'Shreya Shankar', paper: 'Operationalizing Machine Learning: An Interview Study' },
  { person: 'Geoffrey Litt', matchName: 'Geoffrey Litt', paper: 'Wildcard: Spreadsheet-Driven Customization of Web Applications' },
  { person: 'Haijun Xia', matchName: 'Haijun Xia', paper: 'Object-Oriented Drawing' },
  { person: 'Kai Greshake', matchName: 'Kai Greshake', paper: 'Not what you have signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection' },
  { person: 'Runxin Xu', matchName: 'Runxin Xu', paper: 'DeepSeek-V3 Technical Report' },
  { person: 'Luo Fuli', matchName: 'Fuli Luo', paper: 'VECO: Variable and Flexible Cross-lingual Pre-training for Language Understanding and Generation' },
  { person: 'Liang Chen', matchName: 'Liang Chen', paper: 'Kimi-VL Technical Report' },
  { person: 'Yibo Miao', matchName: 'Yibo Miao', paper: 'Kimi k1.5: Scaling Reinforcement Learning with LLMs' },
];

async function lookup(entry: Entry): Promise<{ id: string; inst: string[] } | null | 'budget'> {
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(entry.paper)}&per_page=1&mailto=${MAILTO}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (data?.error) return 'budget';
  const work = (data.results || [])[0];
  if (!work) return null;
  const want = norm(entry.matchName);
  for (const au of work.authorships || []) {
    const a = au.author || {};
    const nm = norm(a.display_name || '');
    // 名匹配：归一相等，或姓名词全部包含（处理中间名/缩写差异）
    const wantParts = want.split(' ').filter(Boolean);
    const ok = nm === want || (wantParts.length >= 2 && wantParts.every(p => nm.includes(p)));
    if (ok && a.id) {
      return { id: String(a.id).split('/').pop()!, inst: (au.institutions || []).map((i: any) => i.display_name).filter(Boolean).slice(0, 2) };
    }
  }
  return null;
}

async function main() {
  const execute = process.argv.includes('--execute');
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(',').map(s => s.trim())) : null;
  console.log(`🔎 resolve_ids_by_landmark — ${execute ? '执行写库' : 'DRY-RUN'}（${PAPER_MAP.length} 条 curated）`);
  await prisma.people.count();

  const stats = { resolved: 0, skipHasId: 0, noMatch: 0, notFound: 0, budget: 0, written: 0 };
  for (const entry of PAPER_MAP) {
    if (only && !only.has(entry.person) && !only.has(entry.matchName)) continue;
    const p = await prisma.people.findFirst({ where: { OR: [{ name: entry.person }, { aliases: { has: entry.person } }] }, select: { id: true, name: true, aliases: true, openalexId: true } });
    if (!p) { stats.notFound++; console.log(`  ✗ DB 无此人: ${entry.person}`); continue; }
    if (p.openalexId) { stats.skipHasId++; continue; }

    const r = await lookup(entry);
    await sleep(1500); // 慢速避开 budget 限额
    if (r === 'budget') { stats.budget++; console.log(`  ⏸ ${entry.person}: OpenAlex budget 限额，跳过(稍后重跑)`); continue; }
    if (!r) { stats.noMatch++; console.log(`  - ${entry.person}: 论文里没匹到 ${entry.matchName}（或论文没搜到）`); continue; }

    stats.resolved++;
    console.log(`  ✓ ${entry.person} ⇐ ${r.id} | ${entry.matchName} | 《${entry.paper.slice(0, 30)}…》 inst=${JSON.stringify(r.inst)}`);
    if (!execute) continue;
    try {
      await prisma.people.update({ where: { id: p.id }, data: { openalexId: r.id } });
      stats.written++;
    } catch (e) { console.error(`    ✗ 写入失败 ${entry.person}:`, (e as Error).message); }
  }

  console.log(`\n📊 命中 ${stats.resolved}（已写 ${stats.written}）| 已有ID跳过 ${stats.skipHasId} | 没匹到 ${stats.noMatch} | DB无 ${stats.notFound} | budget跳过 ${stats.budget}`);
  if (!execute) console.log('加 --execute 写库。budget 跳过的稍后重跑本脚本即可(幂等)。');
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
