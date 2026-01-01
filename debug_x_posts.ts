import { prisma } from './lib/db/prisma';

async function check() {
    // 找 Sam Altman 的 X 帖子
    const sam = await prisma.people.findFirst({
        where: { name: { contains: 'Sam Altman' } }
    });

    if (!sam) {
        console.log('Sam Altman not found');
        return;
    }

    const xItems = await prisma.rawPoolItem.findMany({
        where: { personId: sam.id, sourceType: 'x' },
        take: 15
    });

    console.log('Sam Altman X Posts:');
    xItems.forEach((x, i) => {
        const hasUrl = x.text?.startsWith('http') || x.text?.startsWith('//');
        const cleanText = (x.text || '').replace(/(^|\s)(https?:\/\/\S+|\/\/\S+)/g, '').trim();
        console.log(i + 1 + '. Title:', x.title?.slice(0, 60));
        console.log('   Text:', x.text?.slice(0, 80));
        console.log('   StartsWithUrl:', hasUrl, '| CleanText empty:', !cleanText);
        console.log('   -> Would show "分享链接"?', !cleanText && hasUrl);
        console.log('');
    });
}

check().catch(console.error).finally(() => prisma.$disconnect());
