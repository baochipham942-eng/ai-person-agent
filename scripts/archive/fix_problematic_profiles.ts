
import { prisma } from '../lib/db/prisma';


async function main() {
    // 1. Fix Zhang Peng (Zhipu AI)
    console.log('Fixing Zhang Peng...');
    const zhangPeng = await prisma.people.findFirst({
        where: {
            OR: [
                { name: '张鹏' },
                { name: { contains: 'Zhang Peng' } }
            ]
        }
    });

    if (zhangPeng) {
        // Remove wrong GitHub links (from source aaasoft)
        await prisma.rawPoolItem.deleteMany({
            where: {
                personId: zhangPeng.id,
                sourceType: 'github'
            }
        });
        console.log(`Deleted incorrect GitHub items for Zhang Peng (${zhangPeng.id})`);

        // Update info
        await prisma.people.update({
            where: { id: zhangPeng.id },
            data: {
                name: '张鹏',
                description: '智谱AI CEO，清华大学计算机系博士。主导研发了GLM系列大模型，致力于让机器像人一样思考。',
                avatarUrl: null, // Clear wrong female avatar
                occupation: ['CEO', 'Entrepreneur', 'Researcher'],
                organization: ['Zhipu AI', 'Tsinghua University']
            }
        });
        console.log('Updated Zhang Peng profile.');
    } else {
        console.log('Zhang Peng not found.');
    }

    // 2. Fix Ding Jie
    console.log('\nFixing Ding Jie...');
    const dingJie = await prisma.people.findFirst({
        where: {
            OR: [
                { name: '丁洁' },
                { name: { contains: 'Ding Jie' } }
            ]
        }
    });

    if (dingJie) {
        // Remove wrong GitHub links (from source zhuleejun)
        await prisma.rawPoolItem.deleteMany({
            where: {
                personId: dingJie.id,
                sourceType: 'github'
            }
        });
        console.log(`Deleted incorrect GitHub items for Ding Jie (${dingJie.id})`);

        // Update info
        await prisma.people.update({
            where: { id: dingJie.id },
            data: {
                name: '丁洁',
                description: '明尼苏达大学统计学院副教授，研究领域涵盖生成式AI、Agentic AI及AI安全性。MorphMind联合创始人。',
                occupation: ['Associate Professor', 'Researcher'],
                organization: ['University of Minnesota'],
                // Assuming we don't have a direct URL for her UMN avatar that works without scraping, 
                // we might leave it or if we had one we'd set it. 
                // For now, removing the wrong one (if it was wrong) or keeping existing if it was correct (but user said it was wrong).
                // I will clear it to be safe if it was the wrong person's photo.
                avatarUrl: null,
            }
        });
        console.log('Updated Ding Jie profile.');
    } else {
        console.log('Ding Jie not found.');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
