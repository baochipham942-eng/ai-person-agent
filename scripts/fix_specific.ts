
/**
 * 手动修正:
 * 1. 清理刘知远的历史污染数据
 * 2. 为 Boris Cherny 添加正确数据 (Anthropic)
 */
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
    console.log('=== FIX: Liu Zhiyuan & Boris Cherny ===\n');

    // 1. Fix Liu Zhiyuan
    const liu = await prisma.people.findFirst({ where: { name: '刘知远' } });
    if (liu) {
        // Delete pollution
        const res = await prisma.personRole.deleteMany({
            where: {
                personId: liu.id,
                organization: {
                    name: { in: ['后唐明宗帐下', '石敬瑭（太原镇守）麾下'] }
                }
            }
        });
        console.log(`✅ Liu Zhiyuan: Deleted ${res.count} pollution records.`);
    }

    // 2. Fix Boris Cherny
    const boris = await prisma.people.findFirst({ where: { name: 'Boris Cherny' } });
    if (boris) {
        // Ensure Organizations exist
        let anthropic = await prisma.organization.findFirst({ where: { name: 'Anthropic' } });
        if (!anthropic) {
            anthropic = await prisma.organization.create({ data: { name: 'Anthropic', type: 'company' } });
        }

        // Add Role: Member of Technical Staff at Anthropic (known fact)
        const exists = await prisma.personRole.findFirst({
            where: { personId: boris.id, organizationId: anthropic.id }
        });

        if (!exists) {
            await prisma.personRole.create({
                data: {
                    personId: boris.id,
                    organizationId: anthropic.id,
                    role: 'Member of Technical Staff',
                    source: 'MANUAL_FIX'
                }
            });
            console.log(`✅ Boris Cherny: Added 'Anthropic' role.`);
        } else {
            console.log(`ℹ️ Boris Cherny: 'Anthropic' role already exists.`);
        }
    }

    await prisma.$disconnect();
}

main();
