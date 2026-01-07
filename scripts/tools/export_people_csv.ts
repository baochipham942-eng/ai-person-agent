
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';

neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

function escapeCsv(field: any): string {
    if (field === null || field === undefined) return '';
    const stringField = String(field);
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
}

async function main() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        console.log('Fetching people data...');
        const people = await prisma.people.findMany({
            orderBy: { aiContributionScore: 'desc' },
            select: {
                id: true,
                name: true,
                qid: true,
                aiContributionScore: true,
                description: true,
                status: true,
                createdAt: true
            }
        });

        console.log(`Found ${people.length} people.`);

        const header = ['ID', 'Name', 'QID', 'Score', 'Status', 'CreatedAt', 'Description'];
        const rows = people.map(p => [
            p.id,
            p.name,
            p.qid,
            p.aiContributionScore,
            p.status,
            p.createdAt.toISOString(),
            p.description
        ].map(escapeCsv).join(','));

        const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n');

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `people_export_${timestamp}.csv`;
        const outputPath = path.join(process.cwd(), 'exports', filename);

        fs.writeFileSync(outputPath, csvContent);
        console.log(`\nSuccessfully exported to:\n${outputPath}`);

    } catch (e) {
        console.error('Error exporting data:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(console.error);
