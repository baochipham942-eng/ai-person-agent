import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';

type SessionUserWithProfile = typeof authConfig.callbacks extends { session: (...args: infer Args) => unknown }
    ? Args[0] extends { session: { user: infer SessionUser } }
        ? SessionUser & {
            id?: string;
            username?: unknown;
            nickname?: unknown;
            avatar?: unknown;
            phone?: unknown;
            quickLoginToken?: unknown;
        }
        : never
    : {
        id?: string;
        name?: string | null;
        username?: unknown;
        nickname?: unknown;
        avatar?: unknown;
        phone?: unknown;
        quickLoginToken?: unknown;
    };

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials) {
                // Scenario 1: Quick Login (One-click)
                if (credentials.quickLoginToken) {
                    const token = credentials.quickLoginToken as string;
                    const user = await prisma.user.findFirst({ where: { quickLoginToken: token } });
                    if (user) return user;
                    return null;
                }

                // Scenario 2: Standard Login (Username/Phone + Password)
                const parsedCredentials = z
                    .object({ username: z.string(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (parsedCredentials.success) {
                    const { username, password } = parsedCredentials.data;

                    // Support login by username OR phone
                    const user = await prisma.user.findFirst({
                        where: {
                            OR: [
                                { username: username },
                                { phone: username }
                            ]
                        }
                    });

                    if (!user) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.passwordHash);
                    if (passwordsMatch) return user;
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
                token.username = u.username;
                token.nickname = u.nickname;
                token.avatar = u.avatar;
                token.phone = u.phone;
                token.quickLoginToken = u.quickLoginToken;
            }

            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                const s = session.user as SessionUserWithProfile;
                s.id = token.id as string;
                s.name = token.name as string;
                s.username = token.username;
                s.nickname = token.nickname;
                s.avatar = token.avatar;
                s.phone = token.phone;
                s.quickLoginToken = token.quickLoginToken;
            }
            return session;
        }
    }
});
