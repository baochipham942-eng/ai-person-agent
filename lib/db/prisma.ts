import { PrismaClient, type Prisma } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { createRequire } from 'node:module';

process.env.WS_NO_BUFFER_UTIL ??= '1';

const require = createRequire(import.meta.url);
const ws = require('ws');

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
    const log: Prisma.LogLevel[] = process.env.NODE_ENV === 'production' ? ['error'] : ['query', 'error', 'warn'];
    const connectionString = process.env.DATABASE_URL!;
    if (isLocalPostgres(connectionString)) {
        return new PrismaClient({ log });
    }

    // Create Neon connection pool
    const pool = new Pool({ connectionString });

    // Create Prisma adapter
    const adapter = new PrismaNeon(pool);

    return new PrismaClient({
        adapter,
        log,
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

function isLocalPostgres(connectionString: string): boolean {
    try {
        const hostname = new URL(connectionString).hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    } catch {
        return false;
    }
}
