"use client"

import { Fragment, useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase/client"
import { signOutUser } from "@/lib/firebase/auth"
import { canAccessPrivatePage } from "@/lib/auth/permissions"
import { ForbiddenError } from "@/app/(auth)/errors/forbidden/components/forbidden-error"
import { Button } from "@/components/ui/button"
import { useChat } from "@/modules/chat/services/chat-services"

export function PrivateAccessBoundary({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(undefined)

  useEffect(() => onAuthStateChanged(auth, (user) => {
    setFirebaseUid(user?.uid ?? null)
    // Zustand survives page navigation, so clear the previous account's cache.
    useChat.setState(useChat.getInitialState(), true)
  }), [])

  if (status === "loading" || firebaseUid === undefined) {
    return <div role="status" className="p-8 text-muted-foreground">Đang kiểm tra quyền truy cập…</div>
  }
  if (!session?.user || firebaseUid !== session.user.id) {
    return (
      <div className="space-y-4 p-8">
        <p>Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.</p>
        <Button onClick={async () => {
          try { await signOutUser() } finally { await signOut({ callbackUrl: "/sign-in" }) }
        }}>Đăng nhập lại</Button>
      </div>
    )
  }
  if (!canAccessPrivatePage(session.user, pathname)) return <ForbiddenError />

  const identity = `${session.user.id}:${[...session.user.roles].sort().join(",")}`
  return <Fragment key={identity}>{children}</Fragment>
}
