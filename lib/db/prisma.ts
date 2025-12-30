import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton for Serverless Environment
 */
const prismaClientSingleton = () => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'],
    });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}
