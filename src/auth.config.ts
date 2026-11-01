import type { NextAuthConfig } from "next-auth"
import { getHomePage } from "@/lib/auth/permissions"

export const authConfig = {
  pages: {
    signIn: "/sign-in",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        nextUrl.pathname.startsWith("/sign-in") ||
        nextUrl.pathname.startsWith("/sign-up") ||
        nextUrl.pathname.startsWith("/forgot-password")
      const isLandingPage = nextUrl.pathname.startsWith("/landing")

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL(getHomePage(auth?.user), nextUrl))
        }
        return true
      }

      if (isLandingPage) {
        return true
      }

      // For all other pages (including / and dashboard pages), require login
      return isLoggedIn
    },
  },
  providers: [], // Will be populated with actual providers in auth.ts
} satisfies NextAuthConfig
