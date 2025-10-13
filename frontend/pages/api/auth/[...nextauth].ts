import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import KakaoProvider from "next-auth/providers/kakao";
import { NextAuthOptions } from "next-auth";

interface ExtendedUser {
  id: string;
  email: string;
  name: string;
  accessToken?: string;
  provider?: string;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // 이메일 로그인
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
              }),
            }
          );

          const data = await res.json();

          if (res.ok && data.access_token) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              accessToken: data.access_token,
              provider: "email",
            } as ExtendedUser;
          }
          return null;
        } catch {
          return null;
        }
      },
    }),

    // 카카오 로그인
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID!,
      clientSecret: process.env.KAKAO_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // 카카오 로그인일 때 백엔드에 사용자 정보 전송
      if (account?.provider === "kakao") {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/auth/kakao`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: account.providerAccountId,
                properties: {
                  nickname: (profile as any)?.nickname || user.name,
                },
                kakao_account: {
                  email: user.email,
                },
              }),
            }
          );

          const data = await res.json();

          if (res.ok && data.access_token) {
            // 백엔드에서 받은 토큰을 사용자 객체에 저장
            user.accessToken = data.access_token;
            user.id = data.user.id;
            user.provider = "kakao";
            return true;
          }
          return false;
        } catch (error) {
          console.error("카카오 로그인 처리 중 오류:", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        const extendedUser = user as ExtendedUser;
        token.accessToken = extendedUser.accessToken;
        token.provider = account?.provider || extendedUser.provider;
        token.userId = extendedUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      (session as ExtendedSession).accessToken = token.accessToken as string;
      (session as ExtendedSession).provider = token.provider as string;
      if (token.userId) {
        session.user = {
          ...session.user,
          id: token.userId as string,
        };
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};

interface ExtendedSession {
  accessToken?: string;
  provider?: string;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export default NextAuth(authOptions);
