
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function main() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const altman = await prisma.people.findFirst({
            where: { name: { contains: 'Sam Altman' } },
            include: {
                roles: {
                    include: { organization: true }
                }
            }
        });

        if (altman && altman.roles.length > 0) {
            console.log('\nRoles with Organization:');
            altman.roles.forEach((r: any, i: number) => {
                console.log(`\n[${i + 1}] ID: ${r.id}`);
                console.log(`    Role: ${r.role}`);
                console.log(`    RoleZh: ${r.roleZh}`);
                console.log(`    Org Name: ${r.organization?.name}`);
                console.log(`    Org NameZh: ${r.organization?.nameZh}`);
                console.log(`    Dates: ${r.startDate} - ${r.endDate}`);
            });
        }
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
