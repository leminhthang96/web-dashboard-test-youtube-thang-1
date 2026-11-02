import NextAuth, { type DefaultSession } from "next-auth"
import { type JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      roles: string[]
      isAdmin: boolean
      authorizationError?: boolean
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    roles?: string[]
    isAdmin?: boolean
    authorizationError?: boolean
    firebaseIdToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string
    roles?: string[]
    isAdmin?: boolean
    authorizationError?: boolean
    firebaseIdToken?: string
  }
}
