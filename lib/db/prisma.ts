import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';

/**
 * Prisma Client Singleton with Neon Serverless Driver
 * 
 * Uses HTTP/WebSocket instead of TCP for faster cold starts:
 * - Traditional TCP: ~3.8s cold start
 * - Neon Serverless: ~300ms cold start
 */

// Configure Neon to use WebSocket (required for Node.js environment)
neonConfig.webSocketConstructor = ws;

const prismaClientSingleton = () => {
    // Create Neon connection pool
    const connectionString = process.env.DATABASE_URL!;
    const pool = new Pool({ connectionString });

    // Create Prisma adapter
    const adapter = new PrismaNeon(pool);

    return new PrismaClient({
        adapter,
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
