import { prisma } from '@/lib/db/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // 简单的安全检查
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.AUTH_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 执行原生 SQL 添加新字段
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "currentTitle" TEXT;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "products" JSONB;
    `);

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "People" ADD COLUMN IF NOT EXISTS "education" JSONB;
    `);

    return NextResponse.json({
      success: true,
      message: 'Migration completed: added currentTitle, products, education columns'
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error.message
    }, { status: 500 });
  }
}
