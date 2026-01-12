/**
 * 添加从人物关系中识别到的缺失人物
 * 这些人物是 AI 领域核心人物的导师/学生，有明确的 Wikidata QID
 *
 * 用法: npx tsx scripts/enrich/add_missing_relations_people.ts [--tier=1|2|3] [--dry-run]
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { getWikidataEntityWithTranslation } from '../../lib/datasources/wikidata';
import { downloadAndStoreAvatar } from '../../lib/storage/avatarStorage';

interface PersonToAdd {
  qid: string;
  name: string;
  note: string;
  mentor: string;
}

// 第一梯队：必须添加（14 人）- AI 领域核心人物
const TIER1_PEOPLE: PersonToAdd[] = [
  { qid: 'Q26703063', name: 'Ian J. Goodfellow', note: 'GAN 发明人，DeepMind 研究科学家', mentor: 'Yoshua Bengio' },
  { qid: 'Q33374357', name: 'Pieter Abbeel', note: 'UC Berkeley 教授，Covariant 创始人，机器人学习先驱', mentor: '吴恩达' },
  { qid: 'Q28016131', name: 'Ruslan Salakhutdinov', note: 'CMU 教授，苹果 AI 研究主管', mentor: 'Geoffrey Hinton' },
  { qid: 'Q50380592', name: 'Jimmy Ba', note: '多伦多大学教授，Adam 优化器共同发明人', mentor: 'Geoffrey Hinton' },
  { qid: 'Q59753117', name: 'Timnit Gebru', note: 'DAIR Institute 创始人，AI 伦理领袖', mentor: '李飞飞' },
  { qid: 'Q103323713', name: 'Jia Deng', note: 'Princeton 教授，ImageNet 创建者之一', mentor: '李飞飞' },
  { qid: 'Q130972871', name: 'Jon Barron', note: 'Google 研究科学家，NeRF 先驱', mentor: '吉滕德拉·马利克' },
  { qid: 'Q125681012', name: 'Jim Fan', note: 'NVIDIA 高级研究科学家，具身 AI', mentor: '李飞飞' },
  { qid: 'Q32267895', name: 'Hugo Larochelle', note: 'Google Brain 研究科学家，CIFAR AI Chair', mentor: 'Yoshua Bengio' },
  { qid: 'Q51036169', name: 'Raia Hadsell', note: 'DeepMind VP Research，机器人学习', mentor: 'Yann LeCun' },
  { qid: 'Q44585452', name: 'Yee Whye Teh', note: 'DeepMind 首席研究科学家，贝叶斯深度学习', mentor: 'Geoffrey Hinton' },
  { qid: 'Q5213816', name: 'Dan Klein', note: 'UC Berkeley 教授，NLP 先驱', mentor: 'Christopher Manning' },
  { qid: 'Q17517312', name: 'Pietro Perona', note: 'Caltech 教授，计算机视觉先驱', mentor: '吉滕德拉·马利克' },
  { qid: 'Q30226019', name: 'Alexei A. Efros', note: 'UC Berkeley 教授，图像合成先驱', mentor: '吉滕德拉·马利克' },
];

// 第二梯队：强烈推荐（17 人）- 有重要学术或产业贡献
const TIER2_PEOPLE: PersonToAdd[] = [
  { qid: 'Q39381662', name: 'Dzmitry Bahdanau', note: 'Attention 机制先驱，Apple ML', mentor: 'Yoshua Bengio' },
  { qid: 'Q28017237', name: 'Pascal Vincent', note: 'Denoising Autoencoders，Meta AI', mentor: 'Yoshua Bengio' },
  { qid: 'Q103331735', name: 'James Bergstra', note: 'Theano 创始人，Hyperopt 作者', mentor: 'Yoshua Bengio' },
  { qid: 'Q21062156', name: 'Radford M. Neal', note: '多伦多大学教授，贝叶斯学习先驱', mentor: 'Geoffrey Hinton' },
  { qid: 'Q29381202', name: 'Carl Edward Rasmussen', note: '剑桥教授，高斯过程先驱', mentor: 'Geoffrey Hinton' },
  { qid: 'Q103330536', name: 'Tijmen Tieleman', note: 'RMSprop 算法发明人', mentor: 'Geoffrey Hinton' },
  { qid: 'Q57267422', name: 'Kristina N. Toutanova', note: 'Google 研究科学家，BERT 作者之一', mentor: 'Christopher Manning' },
  { qid: 'Q29351282', name: 'Minh-Thang Luong', note: 'Google 研究科学家，序列到序列', mentor: 'Christopher Manning' },
  { qid: 'Q103323628', name: 'Justin Johnson', note: '密歇根大学教授，视觉推理', mentor: '李飞飞' },
  { qid: 'Q55395293', name: 'Pranav Rajpurkar', note: 'Harvard 教授，SQuAD 创建者，医疗 AI', mentor: '吴恩达' },
  { qid: 'Q103250619', name: 'Zico Kolter', note: 'CMU 教授，AI 安全与鲁棒性', mentor: '吴恩达' },
  { qid: 'Q28018597', name: 'Honglak Lee', note: 'LG AI Research，密歇根大学教授', mentor: '吴恩达' },
  { qid: 'Q81200310', name: 'Shakir Mohamed', note: 'DeepMind 研究科学家，VAE', mentor: 'Zoubin Ghahramani' },
  { qid: 'Q113415018', name: 'David Duvenaud', note: '多伦多大学教授，Neural ODEs', mentor: 'Zoubin Ghahramani' },
  { qid: 'Q114574746', name: 'Yarin Gal', note: '牛津大学教授，不确定性量化', mentor: 'Zoubin Ghahramani' },
  { qid: 'Q52555649', name: 'Serge Belongie', note: 'Cornell 教授，哥本哈根 DIKU 主任', mentor: '吉滕德拉·马利克' },
  { qid: 'Q126287507', name: 'Jacob Steinhardt', note: 'UC Berkeley 教授，AI 安全', mentor: 'Percy Liang' },
];

// 第三梯队：可以添加（30 人）- 活跃研究者
const TIER3_PEOPLE: PersonToAdd[] = [
  { qid: 'Q47012846', name: 'Razvan Pascanu', note: 'DeepMind 研究科学家', mentor: 'Yoshua Bengio' },
  { qid: 'Q102254370', name: 'Çağlar Gülçehre', note: 'DeepMind 研究科学家', mentor: 'Yoshua Bengio' },
  { qid: 'Q57306218', name: 'Dumitru Erhan', note: 'Google Brain 研究科学家', mentor: 'Yoshua Bengio' },
  { qid: 'Q107942991', name: 'Yann Dauphin', note: 'Meta AI，语言模型研究', mentor: 'Yoshua Bengio' },
  { qid: 'Q56101436', name: "Marc'Aurelio Ranzato", note: 'Google DeepMind，稀疏编码', mentor: 'Yann LeCun' },
  { qid: 'Q28017427', name: 'Andriy Mnih', note: 'DeepMind 研究科学家', mentor: 'Geoffrey Hinton' },
  { qid: 'Q26702597', name: 'Richard S. Zemel', note: '多伦多大学教授，机器学习', mentor: 'Geoffrey Hinton' },
  { qid: 'Q18684996', name: 'Brendan J. Frey', note: '多伦多大学教授，深度基因组学', mentor: 'Geoffrey Hinton' },
  { qid: 'Q62072700', name: 'Christopher K. I. Williams', note: '爱丁堡大学教授，机器学习', mentor: 'Geoffrey Hinton' },
  { qid: 'Q103330492', name: 'James Martens', note: 'DeepMind 研究科学家，优化理论', mentor: 'Geoffrey Hinton' },
  { qid: 'Q64843560', name: 'Nitish Srivastava', note: 'Dropout 论文共同作者', mentor: 'Geoffrey Hinton' },
  { qid: 'Q103330519', name: 'George Edward Dahl', note: 'Google 研究科学家，语音识别', mentor: 'Geoffrey Hinton' },
  { qid: 'Q103330528', name: 'Navdeep Jaitly', note: 'Apple 研究科学家，语音识别', mentor: 'Geoffrey Hinton' },
  { qid: 'Q103330544', name: 'Abdel-rahman Mohamed', note: 'Amazon/Meta 研究科学家，语音 AI', mentor: 'Geoffrey Hinton' },
  { qid: 'Q102985281', name: 'Samuel Ryan Bowman', note: 'NYU 教授，NLI 基准创建者', mentor: 'Christopher Manning' },
  { qid: 'Q57414435', name: 'Juan Carlos Niebles', note: 'Salesforce VP AI Research', mentor: '李飞飞' },
  { qid: 'Q103323622', name: 'Yuke Zhu', note: 'UT Austin 教授，机器人学习', mentor: '李飞飞' },
  { qid: 'Q91869540', name: 'Serena Yeung-Levy', note: 'Stanford 教授，医疗 AI', mentor: '李飞飞' },
  { qid: 'Q59748100', name: 'Hao Su', note: 'UCSD 教授，3D 视觉', mentor: '李飞飞' },
  { qid: 'Q24141782', name: 'Ashutosh Saxena', note: 'Caspar AI 创始人，康奈尔教授', mentor: '吴恩达' },
  { qid: 'Q50359455', name: 'Awni Hannun', note: '百度/苹果研究科学家，语音 AI', mentor: '吴恩达' },
  { qid: 'Q65999557', name: 'Katherine A. Heller', note: 'Google/Duke 教授，贝叶斯 ML', mentor: 'Zoubin Ghahramani' },
  { qid: 'Q102519065', name: 'David Lopez-Paz', note: 'Meta AI 研究科学家', mentor: 'Zoubin Ghahramani' },
  { qid: 'Q32268843', name: 'Iain Murray', note: '爱丁堡大学教授，MCMC 专家', mentor: 'Zoubin Ghahramani' },
  { qid: 'Q93006', name: 'Paul Debevec', note: 'Google 高级科学家，计算摄影', mentor: '吉滕德拉·马利克' },
  { qid: 'Q102715448', name: 'Georgia Gkioxari', note: 'Caltech 教授，目标检测', mentor: '吉滕德拉·马利克' },
  { qid: 'Q102715527', name: 'Bharath Hariharan', note: 'Cornell 教授，语义分割', mentor: '吉滕德拉·马利克' },
  { qid: 'Q103059747', name: 'Saurabh Gupta', note: 'UIUC 教授，机器人视觉', mentor: '吉滕德拉·马利克' },
  { qid: 'Q103139288', name: 'Shubham Tulsiani', note: 'CMU 教授，3D 重建', mentor: '吉滕德拉·马利克' },
  { qid: 'Q84877519', name: 'Kelvin Guu', note: 'Google 研究科学家，REALM 作者', mentor: 'Percy Liang' },
];

async function addPerson(person: PersonToAdd, dryRun: boolean): Promise<'added' | 'skipped' | 'failed'> {
  try {
    // 检查 QID 是否已存在
    const existing = await prisma.people.findUnique({ where: { qid: person.qid } });
    if (existing) {
      console.log(`  ⏭️ 已存在: ${existing.name}`);
      return 'skipped';
    }

    // 从 Wikidata 获取详细信息
    const entity = await getWikidataEntityWithTranslation(person.qid);
    if (!entity) {
      console.log(`  ⚠️ Wikidata 无数据: ${person.qid}`);
      return 'failed';
    }

    if (dryRun) {
      console.log(`  🔍 [DRY-RUN] 将添加: ${entity.label}`);
      console.log(`     描述: ${entity.description || 'N/A'}`);
      console.log(`     头像: ${entity.imageUrl ? '有' : '无'}`);
      return 'added';
    }

    // 下载头像
    let localAvatarUrl: string | null = null;
    if (entity.imageUrl) {
      localAvatarUrl = await downloadAndStoreAvatar(entity.imageUrl, person.qid);
    }

    // 创建人物记录
    const newPerson = await prisma.people.create({
      data: {
        qid: person.qid,
        name: entity.label,
        aliases: entity.aliases || [],
        description: entity.description || null,
        whyImportant: person.note,
        avatarUrl: localAvatarUrl,
        occupation: entity.occupation || [],
        organization: entity.organization || [],
        officialLinks: entity.officialLinks || [],
        status: 'pending',
        completeness: 0,
      }
    });

    console.log(`  ✅ 创建成功: ${newPerson.name}`);
    console.log(`     Wikidata: https://www.wikidata.org/wiki/${person.qid}`);
    return 'added';

  } catch (error) {
    console.error(`  ❌ 失败: ${error}`);
    return 'failed';
  }
}

async function main() {
  const args = process.argv.slice(2);
  const tierArg = args.find(a => a.startsWith('--tier='));
  const tier = tierArg ? parseInt(tierArg.split('=')[1]) : 1;
  const dryRun = args.includes('--dry-run');

  let peopleToAdd: PersonToAdd[];
  switch (tier) {
    case 1:
      peopleToAdd = TIER1_PEOPLE;
      break;
    case 2:
      peopleToAdd = TIER2_PEOPLE;
      break;
    case 3:
      peopleToAdd = TIER3_PEOPLE;
      break;
    default:
      peopleToAdd = [...TIER1_PEOPLE, ...TIER2_PEOPLE, ...TIER3_PEOPLE];
  }

  console.log('🚀 添加从人物关系中识别的缺失人物\n');
  console.log(`梯队: ${tier === 1 ? '第一梯队（必须添加）' : tier === 2 ? '第二梯队（强烈推荐）' : tier === 3 ? '第三梯队（可以添加）' : '全部'}`);
  console.log(`人数: ${peopleToAdd.length}`);
  console.log(`模式: ${dryRun ? '试运行（不写入）' : '正式运行'}\n`);

  let added = 0, skipped = 0, failed = 0;

  for (let i = 0; i < peopleToAdd.length; i++) {
    const person = peopleToAdd[i];
    console.log(`[${i + 1}/${peopleToAdd.length}] ${person.name} (${person.qid})`);
    console.log(`  导师: ${person.mentor}`);

    const result = await addPerson(person, dryRun);
    if (result === 'added') added++;
    else if (result === 'skipped') skipped++;
    else failed++;

    // 避免 API 限流
    if (!dryRun) {
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 处理完成');
  console.log(`  ✅ 新增: ${added}`);
  console.log(`  ⏭️ 跳过: ${skipped}`);
  console.log(`  ❌ 失败: ${failed}`);
  console.log('='.repeat(50));

  if (!dryRun && added > 0) {
    console.log('\n💡 下一步操作:');
    console.log('  1. npx tsx scripts/enrich/recrawl_robust.ts      # 补全职业历史');
    console.log('  2. npx tsx scripts/enrich/fetch_related_people.ts # 建立人物关系');
    console.log('  3. npx tsx scripts/enrich/enrich_topics_highlights.ts  # AI 话题标签');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
