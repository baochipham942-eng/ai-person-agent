
import { prisma } from './lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
    const names = [
        '黄铁军', '颜水成', '苏华', '肖弘', '朱啸虎', '朱军', '周明',
        '刘知远', '乔尔·皮诺', '丁洁', 'Jason Wei', '戴文渊', '姚舜禹', '季逸超', '杨植麟'
    ];
    // Note: Joelle Pineau might be '乔尔皮诺' or '乔尔·皮诺' in DB. Checking both or fuzzy.

    const people = await prisma.people.findMany({
        where: {
            OR: [
                { name: { in: names } },
                { name: '乔尔皮诺' } // in case dot is missing
            ]
        }
    });

    for (const p of people) {
        let status = 'OK';
        let size = 0;
        if (!p.avatarUrl) {
            status = 'NULL (Default)';
        } else if (p.avatarUrl.startsWith('/avatars/')) {
            const abs = path.join(process.cwd(), 'public', p.avatarUrl);
            if (fs.existsSync(abs)) {
                size = fs.statSync(abs).size;
                if (size < 2000) status = `LOW QUALITY (${size}b)`;
                else status = `LOCAL FILE (${size}b)`;
            } else {
                status = 'MISSING LOCAL FILE';
            }
        } else {
            status = `EXTERNAL URL (${p.avatarUrl.substring(0, 30)}...)`;
        }
        console.log(`${p.name}: ${status} [${p.avatarUrl || 'null'}]`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
