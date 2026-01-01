import { prisma } from './lib/db/prisma';
import { getBaikePersonInfo, downloadBaikeAvatar } from './lib/datasources/baike';

/**
 * 添加国内 AI 人物（使用百度百科作为数据源）
 */

// 国内 AI 领域知名人物列表
const CHINESE_AI_PEOPLE = [
    // AI 创业者
    { name: '姚舜禹', company: 'Stepfun 阶跃星辰' },
    { name: '季逸超', company: '面壁智能' },
    { name: '杨植麟', company: '月之暗面 Kimi' },
    { name: '朱啸虎', company: '金沙江创投 (AI投资)' },
    { name: '李开复', company: '创新工场、零一万物' },
    { name: '王慧文', company: '光年之外' },
    { name: '闫俊杰', company: 'MiniMax' },
    { name: '戴文渊', company: '第四范式' },
    { name: '周伯文', company: '京东云 AI' },
    { name: '刘知远', company: '清华大学 NLP' },

    // 学术界
    { name: '唐杰', company: '清华大学、智谱AI' },
    { name: '朱军', company: '清华大学、生数科技' },
    { name: '周明', company: '创新工场、澜舟科技' },
    { name: '黄铁军', company: '北京大学、智源研究院' },

    // Manus 相关 (Monica AI)
    { name: '丁洁', company: 'Monica AI' },
];

async function main() {
    console.log('=== 添加国内 AI 人物 ===\n');

    let addedCount = 0;
    let failedCount = 0;

    for (const { name, company } of CHINESE_AI_PEOPLE) {
        console.log(`\n处理: ${name} (${company})`);

        // 检查是否已存在
        const existing = await prisma.people.findFirst({
            where: { OR: [{ name }, { aliases: { has: name } }] }
        });

        if (existing) {
            console.log(`  - 已存在: ${existing.name}`);
            continue;
        }

        // 从百度百科获取信息
        const info = await getBaikePersonInfo(name);

        if (!info) {
            console.log(`  ✗ 百度百科未找到`);
            failedCount++;
            continue;
        }

        console.log(`  简介: ${info.description.slice(0, 50)}...`);
        console.log(`  职业: ${info.occupation.join(', ') || '未知'}`);

        // 生成唯一 ID（没有 Wikidata QID）
        const customQid = `BAIKE_${name.replace(/\s/g, '_')}`;

        // 下载头像
        let avatarUrl: string | null = null;
        if (info.avatarUrl) {
            console.log(`  下载头像: ${info.avatarUrl.slice(0, 50)}...`);
            avatarUrl = await downloadBaikeAvatar(info.avatarUrl, customQid);
            if (avatarUrl) {
                console.log(`  ✓ 头像已保存: ${avatarUrl}`);
            }
        }

        // 创建人物记录
        try {
            const newPerson = await prisma.people.create({
                data: {
                    qid: customQid,
                    name: info.name,
                    aliases: [...info.aliases, name],
                    description: info.description || `${company}`,
                    avatarUrl,
                    occupation: info.occupation.length > 0 ? info.occupation : ['AI 从业者'],
                    organization: info.organization.length > 0 ? info.organization : [company],
                    officialLinks: [],
                    sourceWhitelist: [],
                    status: 'pending',
                    completeness: 0,
                }
            });

            console.log(`  ✓ 创建成功: ${newPerson.name} (${newPerson.id})`);
            addedCount++;
        } catch (error) {
            console.log(`  ✗ 创建失败: ${error}`);
            failedCount++;
        }

        // 避免请求过快
        await new Promise(r => setTimeout(r, 1500));
    }

    console.log(`\n=== 完成 ===`);
    console.log(`成功添加: ${addedCount}`);
    console.log(`失败: ${failedCount}`);

    const total = await prisma.people.count();
    console.log(`当前总人数: ${total}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
