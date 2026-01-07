
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const TARGET_NAMES = [
    "Boris Cherny", "Aidan Gomez", "Paul Graham", "Lukasz Kaiser",
    "周伯文", "Mark Zuckerberg", "闫俊杰", "Eliezer Yudkowsky",
    "Marian Croak", "Rob Bensinger", "丁洁", "丹尼尔格罗斯",
    "亚历克斯克里泽夫斯基", "周明", "妮基帕尔玛", "张鹏",
    "徐立", "陈冕"
];

const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('=== Avatar Audit ===');

    for (const name of TARGET_NAMES) {
        const person = await prisma.people.findFirst({ where: { name } });
        if (!person) {
            console.log(`❌ [${name}]: Not found`);
            continue;
        }

        const url = person.avatarUrl;
        const isPlaceholder = url?.includes('placeholder') || !url;
        const displayUrl = url ? (url.length > 50 ? url.substring(0, 50) + '...' : url) : 'NULL';

        console.log(`[${name}]: ${isPlaceholder ? '❌' : '✅'} ${displayUrl}`);
    }

    await prisma.$disconnect();
}

main();
