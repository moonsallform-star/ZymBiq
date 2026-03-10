import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcryptjs from "bcryptjs";
import { prisma } from "@/lib/prisma";

// =============================================================================
// TypeScript module augmentation — extends NextAuth Session and JWT types
// to expose id and isAdmin on both the token and the session user object.
// =============================================================================

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
    };
  }

  interface User {
    isAdmin: boolean;
  }
}

declare module "next-auth" {
  interface JWT {
    id: string;
    isAdmin: boolean;
  }
}

// =============================================================================
// Auth configuration object
// Exported separately so middleware can reference it without importing the
// full NextAuth instance (Edge Runtime compatibility).
// =============================================================================

export const authConfig: NextAuthConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  providers: [
    // -------------------------------------------------------------------------
    // Credentials provider — email + bcryptjs-hashed password
    // -------------------------------------------------------------------------
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (
          !credentials?.email ||
          typeof credentials.email !== "string" ||
          !credentials?.password ||
          typeof credentials.password !== "string"
        ) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            password: true,
            isAdmin: true,
          },
        });

        // User not found
        if (!user) return null;

        // OAuth-only account — no password set, reject credentials sign-in
        if (!user.password) return null;

        const passwordValid = await bcryptjs.compare(
          credentials.password,
          user.password
        );

        if (!passwordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isAdmin: user.isAdmin,
        };
      },
    }),

    // -------------------------------------------------------------------------
    // Google OAuth — optional, only registered when env vars are present
    // -------------------------------------------------------------------------
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    // -------------------------------------------------------------------------
    // jwt — runs when token is created or refreshed.
    // On initial sign-in (user object present), stamp id and isAdmin onto token.
    // On subsequent requests, token already carries the values.
    // -------------------------------------------------------------------------
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin ?? false;
      }

      // If isAdmin is somehow missing on a persisted token (e.g. post-migration),
      // re-fetch from DB to ensure the value is always accurate.
      if (token.id && token.isAdmin === undefined) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { isAdmin: true },
        });
        token.isAdmin = dbUser?.isAdmin ?? false;
      }

      return token;
    },

    // -------------------------------------------------------------------------
    // session — shapes what the client sees. Never expose password or raw token.
    // -------------------------------------------------------------------------
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },

    // -------------------------------------------------------------------------
    // authorized — called by Edge middleware to decide if a request may proceed.
    // Route-specific logic lives in middleware.ts; this is the coarse gate.
    // -------------------------------------------------------------------------
    authorized({ auth }) {
      return !!auth?.user;
    },

    // -------------------------------------------------------------------------
    // signIn — block credential sign-in for OAuth-only accounts.
    // Google sign-ins always pass (provider !== "credentials").
    // -------------------------------------------------------------------------
    async signIn({ user, account }) {
      if (account?.provider === "credentials") {
        if (!user?.email) return false;

        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { password: true },
        });

        // Reject if account exists but has no password (OAuth-only)
        if (dbUser && !dbUser.password) return false;
      }

      return true;
    },
  },
};

// =============================================================================
// NextAuth v5 instance — exports handlers, auth, signIn, signOut
// =============================================================================

const nextAuth = NextAuth(authConfig);

export const { handlers, signIn, signOut } = nextAuth;

// Used in middleware as a callback wrapper: auth((req) => { ... })
export const auth = nextAuth.auth;

// Used in route handlers / server components to get the current session
export const getSession = nextAuth.auth as () => Promise<import("next-auth").Session | null>;