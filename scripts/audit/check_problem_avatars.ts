import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = 'postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const PROBLEM_PEOPLE = [
    '刘知远', '闫俊杰', '汤姆·布朗', '朱军', '李莲',
    '戴文渊', '姚舜禹', '颜水成', '唐杰', '吉滕德拉·马利克',
    '凯文·斯科特', '汤晓鸥', '罗福莉'
];

async function check() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    console.log('=== 同名问题人物头像检查 ===\n');

    for (const name of PROBLEM_PEOPLE) {
        const person = await prisma.people.findFirst({
            where: { name: { contains: name } },
            select: { id: true, name: true, avatarUrl: true, occupation: true }
        });

        if (person) {
            const hasAvatar = !!person.avatarUrl;
            const avatarSource = person.avatarUrl?.includes('wikidata') ? 'Wikidata'
                : person.avatarUrl?.includes('githubusercontent') ? 'GitHub'
                    : person.avatarUrl?.includes('r2.llmxy.xyz') ? 'R2 CDN'
                        : person.avatarUrl?.includes('pbs.twimg') ? 'Twitter'
                            : 'Unknown';

            console.log(`${person.name}:`);
            console.log(`  职业: ${person.occupation?.join(', ') || 'N/A'}`);
            console.log(`  头像: ${hasAvatar ? avatarSource : '❌ 无头像'}`);
            if (person.avatarUrl) {
                console.log(`  URL: ${person.avatarUrl.slice(0, 80)}...`);
            }
            console.log('');
        } else {
            console.log(`${name}: 未找到\n`);
        }
    }

    await prisma.$disconnect();
}

check();
