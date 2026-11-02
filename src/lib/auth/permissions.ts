export const ADMIN_ROLE_ID = "role-admin"
export const ADMIN_EMAIL = "admin@claudecode.ai"
export const DOCUMENT_MANAGER_ROLE_ID = "role-document-manager"
export const DIRECTORS_ROLE_ID = "role-directors"
export const ACCOUNTING_ROLE_ID = "role-accounting"
export const STAFFS_ROLE_ID = "role-staffs"
export const CUSTOMERS_ROLE_ID = "role-customers"

const ROLE_PAGES: Record<string, readonly string[]> = {
  [DIRECTORS_ROLE_ID]: [
    "/dashboard",
    "/dashboard-2",
    "/dashboard-3",
    "/documents",
  ],
  [ACCOUNTING_ROLE_ID]: ["/dashboard-3", "/documents"],
  [STAFFS_ROLE_ID]: ["/documents"],
  [CUSTOMERS_ROLE_ID]: ["/chat"],
}

type AdminAccessUser = {
  email?: string | null
  roles?: string[]
  isAdmin?: boolean
  authorizationError?: boolean
}

export function canAccessPage(
  user: AdminAccessUser | null | undefined,
  pathname: string
): boolean {
  if (!user) return false
  if (user.authorizationError) return false
  if (hasAdminAccess(user)) return true
  return (user.roles ?? []).some((role) =>
    (ROLE_PAGES[role] ?? []).some(
      (page) => pathname === page || pathname.startsWith(`${page}/`)
    )
  )
}

export function canAccessPrivatePage(
  user: AdminAccessUser | null | undefined,
  pathname: string
): boolean {
  if (!user) return false
  // The client boundary waits for role recovery before rendering this page.
  if (user.authorizationError) return pathname === "/dashboard"
  if (pathname.startsWith("/settings/")) return true
  if (pathname.startsWith("/errors/")) return true
  return canAccessPage(user, pathname === "/customer" ? "/customers" : pathname)
}

export function getHomePage(user?: AdminAccessUser | null): string {
  if (user?.authorizationError) return "/dashboard"
  for (const page of ["/dashboard", "/dashboard-3", "/documents", "/chat"]) {
    if (canAccessPage(user, page)) return page
  }
  // Accounts without an assigned business role can still use their own profile.
  return "/settings/user"
}

export function isAdminIdentifier(value?: string | null): boolean {
  return value?.trim().toLowerCase() === ADMIN_EMAIL
}

export function hasAdminAccess(user?: AdminAccessUser | null): boolean {
  return Boolean(
    !user?.authorizationError && user?.roles?.includes(ADMIN_ROLE_ID)
  )
}

/**
 * Document Managers can create / update / delete documents.
 * Admins implicitly have this capability.
 */
export function hasDocumentManagerAccess(
  user?: AdminAccessUser | null
): boolean {
  return Boolean(
    hasAdminAccess(user) ||
    (canAccessPage(user, "/documents") &&
      user?.roles?.includes(DOCUMENT_MANAGER_ROLE_ID))
  )
}
