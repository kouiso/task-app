import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
    };
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'test@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 開発環境用の簡易認証
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          // 開発環境では自動的にユーザーを作成
          if (process.env.NODE_ENV === 'development') {
            const newUser = await prisma.user.create({
              data: {
                email: credentials.email,
                name: credentials.email.split('@')[0],
              },
            });
            return {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
            };
          }
          return null;
        }

        // 開発環境では任意のパスワードを許可
        if (process.env.NODE_ENV === 'development') {
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        }

        // 本番環境ではパスワード検証を実装
        // const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        // if (!isPasswordValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};
