import NextAuth from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    accessToken?: string;
    provider?: string;
  }

  interface Session {
    accessToken?: string;
    provider?: string;
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    provider?: string;
    userId?: string;
  }
}
