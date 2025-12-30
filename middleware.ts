import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
    matcher: [
        // 匹配所有路由，排除静态资源
        '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
    ],
};

