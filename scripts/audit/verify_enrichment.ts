
import * as dotenv from 'dotenv';
// Load envs BEFORE importing anything else
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
    console.log('=== 最终数据验证报告 (Direct Connection) ===\n');
    console.log('DB URL (prefix):', process.env.DATABASE_URL?.substring(0, 30));

    // Force hardcoded URL to ensure correct connection
    const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    const prisma = new PrismaClient({ adapter });

    try {
        const peopleCount = await prisma.people.count();
        console.log(`People count: ${peopleCount}`);

        if (peopleCount === 0) {
            console.error('❌ Error: Connected but found 0 people. Aborting verification.');
            return;
        }

        // 1. 头像验证
        console.log('\n1. 头像验证...');
        const missingAvatars = await prisma.people.count({
            where: {
                OR: [
                    { avatarUrl: null },
                    { avatarUrl: '' }
                ]
            }
        });
        console.log(`   缺失人数: ${missingAvatars} (预期: 0) ${missingAvatars === 0 ? '✅' : '❌'}`);

        // 2. 时间线日期验证
        console.log('\n2. 时间线验证...');
        const roleCount = await prisma.personRole.count();
        const missingDates = await prisma.personRole.count({
            where: { startDate: null }
        });
        const totalRoles = roleCount;
        const coverage = totalRoles > 0 ? ((totalRoles - missingDates) / totalRoles * 100).toFixed(1) : '0';

        console.log(`   日期覆盖率: ${coverage}% (${totalRoles - missingDates}/${totalRoles})`);
        console.log(`   剩余缺失: ${missingDates} 条`);

        // 3. 数据稀缺度验证
        console.log('\n3. 数据稀缺度验证...');
        const personRoleCounts = await prisma.personRole.groupBy({
            by: ['personId'],
            _count: { id: true }
        });

        const peopleWithRoles = new Set(personRoleCounts.map(p => p.personId));
        const zeroCount = peopleCount - peopleWithRoles.size;
        let lowCount = 0;
        personRoleCounts.forEach(p => { if (p._count.id < 3) lowCount++; });
        lowCount += zeroCount;

        console.log(`   <3条记录: ${lowCount} 人`);
        console.log(`   无记录: ${zeroCount} 人`);

        // 4. 污染数据验证
        console.log('\n4. 污染数据验证 (刘知远)...');
        const liuZhiyuan = await prisma.people.findFirst({
            where: { name: '刘知远' },
            include: { roles: { include: { organization: true } } }
        });

        if (liuZhiyuan) {
            const historical = liuZhiyuan.roles.filter(r =>
                r.organization.nameZh?.includes('后唐') ||
                r.organization.nameZh?.includes('后晋') ||
                (r.startDate && r.startDate.getFullYear() < 1900)
            );
            if (historical.length === 0) console.log('   ✅ 无历史污染');
            else console.log(`   ❌ 发现 ${historical.length} 条污染`);
        } else {
            console.log('   ⚠️ 未找到刘知远 (可能是已删除或名字不匹配)');
        }

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
