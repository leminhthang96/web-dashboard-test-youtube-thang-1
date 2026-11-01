import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "./auth"
import { canAccessPage, getHomePage } from "./lib/auth/permissions"

export async function proxy(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/")

  // API routes enforce their own authorization rules.
  if (isApiRoute) {
    return NextResponse.next()
  }

  const session = await auth()

  const isLoggedIn = !!session?.user
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/sign-in") ||
    request.nextUrl.pathname.startsWith("/sign-up") ||
    request.nextUrl.pathname.startsWith("/forgot-password")

  if (isAuthPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(
        new URL(getHomePage(session?.user), request.url)
      )
    }
    return NextResponse.next()
  }

  // For all other pages (including / and dashboard pages), require login
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  const path = request.nextUrl.pathname
  if (path === "/") {
    return NextResponse.redirect(
      new URL(getHomePage(session.user), request.url)
    )
  }
  // Account settings and error pages remain available to signed-in users.
  const isUtilityPage =
    path.startsWith("/errors/") || path.startsWith("/settings/")
  const target = path === "/customer" ? "/customers" : path
  if (!isUtilityPage && !canAccessPage(session.user, target)) {
    return NextResponse.redirect(new URL("/errors/forbidden", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)", "/"],
}
