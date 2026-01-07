import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const connectionString = "postgresql://neondb_owner:npg_yJ05EdKOxWlQ@ep-purple-leaf-a11okpqu-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require";

async function check() {
  const pool = new Pool({ connectionString });
  const adapter = new PrismaNeon(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    // 检查几个典型的污染数据是否还在
    const liuZhiyuan = await prisma.rawPoolItem.count({
      where: { title: { contains: '刘知远' } }
    });

    const yanJunjie = await prisma.rawPoolItem.count({
      where: { title: { contains: '牛俊杰' } }
    });

    const tomBrowne = await prisma.rawPoolItem.count({
      where: { title: { contains: 'Tom Browne' } }
    });

    const totalItems = await prisma.rawPoolItem.count();
    const totalPeople = await prisma.people.count();

    console.log('=== 数据库污染状态检查 ===');
    console.log('总人物数:', totalPeople);
    console.log('总内容数:', totalItems);
    console.log('');
    console.log('污染数据检测:');
    console.log('  刘知远(历史人物)相关:', liuZhiyuan, liuZhiyuan > 0 ? '⚠️ 存在污染' : '✓ 已清理');
    console.log('  牛俊杰(演员)相关:', yanJunjie, yanJunjie > 0 ? '⚠️ 存在污染' : '✓ 已清理');
    console.log('  Tom Browne(音乐家)相关:', tomBrowne, tomBrowne > 0 ? '⚠️ 存在污染' : '✓ 已清理');
  } catch (err: any) {
    console.error('数据库连接失败:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

check();
