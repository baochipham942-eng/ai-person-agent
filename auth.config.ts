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

            // 允许所有用户访问首页、详情页和搜索接口
            // 受保护的路由：仅部分 API 可能需要保护，或者管理页面
            const isProtectedRoute = false;

            if (isProtectedRoute) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            }

            // 已登录用户访问 /login，重定向到首页
            if (isLoggedIn && nextUrl.pathname === '/login') {
                return Response.redirect(new URL('/', nextUrl));
            }

            return true;
        },
    },
} satisfies NextAuthConfig;
