import { getAdminDb } from "@/lib/firebase/admin"

import { ADMIN_ROLE_ID, isAdminIdentifier } from "@/lib/auth/permissions"

type UserAuthorization = {
  roles: string[]
  isAdmin: boolean
}

export async function getUserAuthorization(
  uid: string,
  email?: string | null,
  _username?: string | null
): Promise<UserAuthorization> {
  if (isAdminIdentifier(email)) {
    return { roles: [ADMIN_ROLE_ID], isAdmin: true }
  }

  try {
    const db = getAdminDb()
    const assignmentsSnapshot = await db
      .collection("users_roles")
      .where("uid", "==", uid)
      .get()
    const roles = assignmentsSnapshot.docs
      .map((document) => document.data().roleId)
      .filter((roleId): roleId is string => typeof roleId === "string")

    // Names and editable profile fields must never grant administrator access.
    const isAdmin = roles.includes(ADMIN_ROLE_ID)

    return { roles, isAdmin }
  } catch (error) {
    console.error("Failed to load user authorization from Firestore:", error)
    return { roles: [], isAdmin: false }
  }
}
