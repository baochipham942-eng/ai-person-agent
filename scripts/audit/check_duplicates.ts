
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
    console.log('=== Checking Duplicates ===');
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    const TARGETS = ['丁洁', '徐立', '张鹏', '周明'];

    for (const name of TARGETS) {
        const people = await prisma.people.findMany({
            where: { name: { contains: name } },
            select: { id: true, name: true, aliases: true, _count: { select: { rawPoolItems: true } } }
        });

        if (people.length > 0) {
            console.log(`\nFound ${people.length} records for "${name}":`);
            people.forEach(p => {
                console.log(` - [${p.id}] Name: "${p.name}", Aliases: ${JSON.stringify(p.aliases)}, Items: ${p._count.rawPoolItems}`);
            });
        }
    }

    await prisma.$disconnect();
}

main();
