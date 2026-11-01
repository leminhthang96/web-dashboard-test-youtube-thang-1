import { getAdminDb } from "@/lib/firebase/admin"

import { ADMIN_ROLE_ID } from "@/lib/auth/permissions"

type UserAuthorization = {
  roles: string[]
  isAdmin: boolean
}

export async function getUserAuthorization(
  uid: string,
  _email?: string | null,
  _username?: string | null
): Promise<UserAuthorization> {
  try {
    const db = getAdminDb()
    const assignmentsSnapshot = await db
      .collection("users_roles")
      .where("uid", "==", uid)
      .get()
    const roleIds = [...new Set(assignmentsSnapshot.docs
      .map((document) => {
        const roleId = document.data().roleId
        // Match the deterministic relationship checked by Security Rules.
        return typeof roleId === "string" && /^role-[a-z0-9-]+$/.test(roleId)
          && document.id === `ur-${uid}-${roleId}` ? roleId : null
      })
      .filter((roleId): roleId is string => roleId !== null))]
    const roleDocuments = roleIds.length
      ? await db.getAll(...roleIds.map((id) => db.collection("roles").doc(id)))
      : []
    const roles = roleDocuments.filter((document) => document.exists).map((document) => document.id)

    // Names and editable profile fields must never grant administrator access.
    const isAdmin = roles.includes(ADMIN_ROLE_ID)

    return { roles, isAdmin }
  } catch (error) {
    console.error("Failed to load user authorization from Firestore:", error)
    return { roles: [], isAdmin: false }
  }
}
