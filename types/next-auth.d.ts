import { UserRole, UserStatus } from '@prisma/client';
import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      username?: string | null;
      nickname?: string | null;
      avatar?: string | null;
      phone?: string | null;
      quickLoginToken?: string | null;
      role?: UserRole;
      status?: UserStatus;
      tags?: string[];
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    username?: string | null;
    nickname?: string | null;
    avatar?: string | null;
    phone?: string | null;
    quickLoginToken?: string | null;
    role?: UserRole;
    status?: UserStatus;
    tags?: string[];
  }
}

