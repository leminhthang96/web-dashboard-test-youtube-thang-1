import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

import { getUserAuthorization } from "@/lib/auth/user-access"

import { authConfig } from "./auth.config"

async function verifyFirebaseIdToken(idToken: string) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not configured")
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  )

  if (!response.ok) {
    throw new Error("Failed to verify Firebase ID token")
  }

  const data = (await response.json()) as {
    users?: Array<{
      localId: string
      displayName?: string
      email?: string
      photoUrl?: string
    }>
  }

  const user = data.users?.[0]
  if (!user) {
    throw new Error("No user found in Firebase token")
  }

  return {
    uid: user.localId,
    name: user.displayName || user.email?.split("@")[0] || "User",
    email: user.email,
    picture: user.photoUrl || "",
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    CredentialsProvider({
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken || typeof credentials.idToken !== "string") {
          return null
        }

        try {
          const firebaseUser = await verifyFirebaseIdToken(credentials.idToken)
          const authorization = await getUserAuthorization(
            firebaseUser.uid,
            credentials.idToken
          )

          return {
            id: firebaseUser.uid,
            name: firebaseUser.name,
            email: firebaseUser.email,
            image: firebaseUser.picture,
            roles: authorization.roles,
            isAdmin: authorization.isAdmin,
            authorizationError: authorization.authorizationError,
            firebaseIdToken: credentials.idToken,
          }
        } catch (error) {
          console.error("Error authorizing with Firebase ID Token:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.uid = user.id
        token.roles = user.roles
        token.isAdmin = user.isAdmin
        token.authorizationError = user.authorizationError
        token.firebaseIdToken = user.firebaseIdToken
      } else if (token.uid) {
        // Session updates are untrusted: accept only a verified token for the
        // same Firebase UID, never client-provided roles or administrator flags.
        if (
          trigger === "update" &&
          typeof session?.firebaseIdToken === "string"
        ) {
          try {
            const firebaseUser = await verifyFirebaseIdToken(
              session.firebaseIdToken
            )
            if (firebaseUser.uid !== token.uid) return token
            token.firebaseIdToken = session.firebaseIdToken
          } catch {
            return token
          }
        }
        const authorization = await getUserAuthorization(
          token.uid,
          token.firebaseIdToken
        )
        token.roles = authorization.roles
        token.isAdmin = authorization.isAdmin
        token.authorizationError = authorization.authorizationError
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.uid as string
        session.user.roles = token.roles ?? []
        session.user.isAdmin = token.isAdmin ?? false
        session.user.authorizationError = token.authorizationError ?? false
      }
      return session
    },
  },
})
