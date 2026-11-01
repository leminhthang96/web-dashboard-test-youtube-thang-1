"use client"

import { ShieldX, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { getHomePage } from "@/lib/auth/permissions"
import { signOutUser } from "@/lib/firebase/auth"

export function ForbiddenError() {
  const { data: session } = useSession()
  const home = getHomePage(session?.user)
  async function changeAccount() {
    try { await signOutUser() } finally { await signOut({ callbackUrl: "/sign-in" }) }
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-full bg-destructive/10 p-5 text-destructive">
        <ShieldX className="size-12" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold tracking-widest text-muted-foreground">403</p>
      <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
      <p className="text-muted-foreground">
        Tài khoản của bạn không có quyền truy cập trang này. Vui lòng liên hệ
        quản trị viên nếu bạn cần được cấp thêm quyền.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {home !== "/errors/forbidden" && (
          <Button asChild><Link href={home}>Về trang của tôi</Link></Button>
        )}
        <Button variant="outline" onClick={() => void changeAccount()}>
          <LogOut className="size-4" /> Đổi tài khoản
        </Button>
      </div>
    </main>
  )
}
