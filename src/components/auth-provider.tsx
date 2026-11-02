"use client"

import * as React from "react"
import { SessionProvider, useSession } from "next-auth/react"
import { onIdTokenChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase/client"
import { getHomePage } from "@/lib/auth/permissions"

function FirebaseSessionSync() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const uid = session?.user.id
  const current = React.useRef({ session, update })
  React.useEffect(() => {
    current.current = { session, update }
  }, [session, update])

  React.useEffect(() => {
    if (!uid) return
    let stopped = false
    let syncing = false
    let lastToken = ""
    async function sync() {
      const user = auth.currentUser
      if (!user || stopped || syncing || user.uid !== uid) return
      syncing = true
      try {
        const idToken = await user.getIdToken()
        if (
          stopped ||
          auth.currentUser?.uid !== uid ||
          (idToken === lastToken &&
            !current.current.session?.user.authorizationError)
        )
          return
        const before = current.current.session?.user
        const refreshed = await current.current.update({
          firebaseIdToken: idToken,
        })
        if (stopped || auth.currentUser?.uid !== uid) return
        if (!refreshed?.user || refreshed.user.authorizationError) return
        lastToken = idToken
        if (
          refreshed?.user.roles.length &&
          (before?.authorizationError ||
            (!before?.roles.length &&
              window.location.pathname === "/settings/user"))
        ) {
          router.replace(getHomePage(refreshed.user))
          router.refresh()
        }
      } catch {
        console.warn("[RBAC] Session refresh failed; will retry")
      } finally {
        syncing = false
      }
    }
    const unsubscribe = onIdTokenChanged(auth, () => {
      void sync()
    })
    // getIdToken renews expiring tokens, including after returning to this tab.
    const interval = window.setInterval(
      () => {
        void sync()
      },
      5 * 60 * 1000
    )
    const onFocus = () => {
      void sync()
    }
    window.addEventListener("focus", onFocus)
    return () => {
      stopped = true
      unsubscribe()
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [uid, router])
  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={30} refetchOnWindowFocus>
      <FirebaseSessionSync />
      {children}
    </SessionProvider>
  )
}
