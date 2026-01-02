import NextAuth, { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: "Password",
      credentials: {
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const password = credentials?.password as string;
        const dashboardPassword = process.env.DASHBOARD_PASSWORD;

        if (!dashboardPassword) {
          throw new Error("DASHBOARD_PASSWORD is not configured");
        }

        if (password === dashboardPassword) {
          return {
            id: "dashboard-user",
            name: "Dashboard User",
            email: "user@dashboard.local",
          };
        }

        return null;
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnApi = nextUrl.pathname.startsWith("/api");

      if (isOnDashboard || (isOnApi && !nextUrl.pathname.startsWith("/api/auth"))) {
        if (isLoggedIn) return true;
        return false;
      } else if (isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

