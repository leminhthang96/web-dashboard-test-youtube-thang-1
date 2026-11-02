"use client"

import { Fragment, useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { signOutUser } from "@/lib/firebase/auth"
import { canAccessPrivatePage, getHomePage } from "@/lib/auth/permissions"
import { Button } from "@/components/ui/button"
import { useChat } from "@/modules/chat/services/chat-services"

export function PrivateAccessBoundary({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status, update } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(
    undefined
  )
  const allowed = canAccessPrivatePage(session?.user, pathname)
  const home = getHomePage(session?.user)

  useEffect(() => {
    if (
      status === "authenticated" &&
      firebaseUid === session?.user.id &&
      !allowed
    ) {
      router.replace(home)
    }
  }, [status, firebaseUid, session?.user.id, allowed, home, router])

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        setFirebaseUid(user?.uid ?? null)
        // Zustand survives page navigation, so clear the previous account's cache.
        useChat.setState(useChat.getInitialState(), true)
      }),
    []
  )

  if (status === "loading" || firebaseUid === undefined) {
    return (
      <div role="status" className="p-8 text-muted-foreground">
        Đang kiểm tra quyền truy cập…
      </div>
    )
  }
  if (!session?.user || firebaseUid !== session.user.id) {
    return (
      <div className="space-y-4 p-8">
        <p>Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.</p>
        <Button
          onClick={async () => {
            try {
              await signOutUser()
            } finally {
              await signOut({ callbackUrl: "/sign-in" })
            }
          }}
        >
          Đăng nhập lại
        </Button>
      </div>
    )
  }
  if (session.user.authorizationError) {
    return (
      <div role="status" className="space-y-4 p-8">
        <p>Chưa tải được quyền tài khoản. Vui lòng thử lại.</p>
        <Button
          onClick={async () => {
            const user = auth.currentUser
            if (user?.uid !== session.user.id) return
            const refreshed = await update({
              firebaseIdToken: await user.getIdToken(true),
            })
            if (refreshed?.user && !refreshed.user.authorizationError) {
              router.replace(getHomePage(refreshed.user))
              router.refresh()
            }
          }}
        >
          Tải lại
        </Button>
      </div>
    )
  }
  // Do not mount the previous page or fetch its data while permissions change.
  if (!allowed) return null

  const identity = `${session.user.id}:${[...session.user.roles].sort().join(",")}`
  return <Fragment key={identity}>{children}</Fragment>
}
