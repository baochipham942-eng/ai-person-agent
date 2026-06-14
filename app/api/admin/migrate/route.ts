import { prisma } from '@/lib/db/prisma';
import { NextResponse } from 'next/server';
import { requireAdminOrSecretResponse } from '@/lib/auth/permissions';

export async function POST(request: Request) {
  const { response } = await requireAdminOrSecretResponse(request);
  if (response) return response;

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
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
