import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import { UserStatus, type User } from '@prisma/client';
import { normalizeEmail } from '@/lib/auth/tokens';
import { findActiveQuickLoginDevice, markQuickLoginDeviceUsed } from '@/lib/auth/quick-login';

type SessionUserWithProfile = typeof authConfig.callbacks extends { session: (...args: infer Args) => unknown }
    ? Args[0] extends { session: { user: infer SessionUser } }
        ? SessionUser & {
            id?: string;
            username?: unknown;
            nickname?: unknown;
            avatar?: unknown;
            phone?: unknown;
            quickLoginToken?: unknown;
            role?: unknown;
            status?: unknown;
            tags?: unknown;
        }
        : never
    : {
        id?: string;
        name?: string | null;
        email?: string | null;
        username?: unknown;
        nickname?: unknown;
        avatar?: unknown;
        phone?: unknown;
        quickLoginToken?: unknown;
        role?: unknown;
        status?: unknown;
        tags?: unknown;
    };

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                // Scenario 1: Quick Login (One-click)
                if (credentials.quickLoginToken) {
                    const token = credentials.quickLoginToken as string;
                    const device = await findActiveQuickLoginDevice(token);
                    if (device) {
                        await Promise.all([
                            markQuickLoginDeviceUsed(device.id),
                            prisma.user.update({
                                where: { id: device.user.id },
                                data: {
                                    lastLoginAt: new Date(),
                                    lastSeenAt: new Date(),
                                },
                            }),
                        ]);
                        return device.user;
                    }

                    const user = await prisma.user.findFirst({
                        where: {
                            quickLoginToken: token,
                            status: UserStatus.ACTIVE,
                        },
                    });
                    if (user) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                lastLoginAt: new Date(),
                                lastSeenAt: new Date(),
                            },
                        });
                        return user;
                    }
                    return null;
                }

                // Scenario 2: Standard Login (Email/Username/Phone + Password)
                const parsedCredentials = z
                    .object({ username: z.string(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { username, password } = parsedCredentials.data;
                    const login = username.trim();
                    const email = normalizeEmail(login);

                    // Support login by email, username, or phone while email migration is in flight.
                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { email },
                                { username: login },
                                { phone: login },
                            ]
                        }
                    });

                    if (!user) return null;
                    if (user.lockedUntil && user.lockedUntil > new Date()) return null;
                    if (user.status !== UserStatus.ACTIVE) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
                    if (passwordsMatch) {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                failedLoginCount: 0,
                                lockedUntil: null,
                                lastLoginAt: new Date(),
                                lastSeenAt: new Date(),
                            },
                        });
                        return user;
                    }

                    const failedLoginCount = user.failedLoginCount + 1;
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            failedLoginCount,
                            lockedUntil: failedLoginCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
                        },
                    });
                }

                console.log('Invalid credentials');
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                const u = user as User;
                token.id = u.id;
                token.name = u.username;
                token.email = u.email;
                token.username = u.username;
                token.nickname = u.nickname;
                token.avatar = u.avatar;
                token.phone = u.phone;
                token.quickLoginToken = u.quickLoginToken;
                token.role = u.role;
                token.status = u.status;
                token.tags = u.tags;
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                const s = session.user as SessionUserWithProfile;
                s.id = token.id as string;
                s.name = token.name as string;
                s.email = token.email as string | null;
                s.username = token.username;
                s.nickname = token.nickname;
                s.avatar = token.avatar;
                s.phone = token.phone;
                s.quickLoginToken = token.quickLoginToken;
                s.role = token.role;
                s.status = token.status;
                s.tags = token.tags;
            }
            return session;
        }
    }
});
