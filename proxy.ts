import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export const proxy = auth;

export const config = {
    matcher: [
        // Match app routes while leaving Next internals and static assets untouched.
        '/((?!api|_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
    ],
};
