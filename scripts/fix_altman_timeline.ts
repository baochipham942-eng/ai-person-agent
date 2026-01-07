
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

    const idsToDelete = [
        'cmjw6bggt002vdtlk62usrt1n', // Role: employee, Org: président-directeur général
        'cmjw6bhj6002ydtlkm59ta3nx', // Role: chief executive officer, Org: OpenAI Foundation
        'cmjw6bjyo0037dtlk6fud19vs', // Role: employee, Org: Loopt (redundant)
        'cmjw6bj5f0034dtlk4eci4g6r'  // Role: student, Org: Stanford University (redundant)
    ];

    try {
        console.log(`Deleting ${idsToDelete.length} bad roles for Sam Altman...`);
        const result = await prisma.personRole.deleteMany({
            where: {
                id: { in: idsToDelete }
            }
        });
        console.log(`Successfully deleted ${result.count} items.`);
    } catch (e) {
        console.error('Error deleting items:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
