import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    // Trust the x-forwarded-proto header from reverse proxy (Aliyun FC)
    // This ensures NextAuth uses HTTPS for callbacks even behind HTTP proxy
    trustHost: true,
    pages: {
        signIn: '/login',
    },
    providers: [
        // Added later in auth.ts
    ],
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isAdminRoute = nextUrl.pathname.startsWith('/admin');

            if (isAdminRoute) {
                if (!isLoggedIn) return false;
                // Role and status in the session can lag behind database changes.
                // Admin pages and APIs do the authoritative DB-backed check.
                return true;
            }

            // 已登录用户访问 /login，重定向到首页
            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/', nextUrl));
            }

            return true;
        },
    },
} satisfies NextAuthConfig;
