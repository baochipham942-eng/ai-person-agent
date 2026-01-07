
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('=== Avatar Cleanup ===');

    // 1. Clear Boris Cherny (Wrong person)
    const boris = await prisma.people.findFirst({ where: { name: 'Boris Cherny' } });
    if (boris) {
        await prisma.people.update({ where: { id: boris.id }, data: { avatarUrl: null } });
        console.log(`✅ Cleared Boris Cherny (Prev: ${boris.avatarUrl?.substring(0, 20)}...)`);
    }

    // 2. Clear Yan Junjie (Placeholder)
    const yan = await prisma.people.findFirst({ where: { name: '闫俊杰' } });
    if (yan) {
        await prisma.people.update({ where: { id: yan.id }, data: { avatarUrl: null } });
        console.log(`✅ Cleared Yan Junjie (Prev: ${yan.avatarUrl?.substring(0, 20)}...)`);
    }

    // 3. Clear Zuckerberg if not found properly?
    // He was missing in audit.

    await prisma.$disconnect();
}

main();
