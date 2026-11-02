import { ADMIN_ROLE_ID } from "@/lib/auth/permissions"

type UserAuthorization = {
  roles: string[]
  isAdmin: boolean
  authorizationError: boolean
}

type FirestoreDocument = {
  name: string
  fields?: Record<string, { stringValue?: string }>
}

// Read as the signed-in Firebase user, so role loading uses the same project
// and Security Rules as the dashboard, without requiring Admin SDK credentials.
export async function getUserAuthorization(
  uid: string,
  idToken?: string
): Promise<UserAuthorization> {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    if (!projectId || !idToken) throw new Error("Missing Firebase session")
    const base = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents`
    async function query(collectionId: string, field: string, value: string) {
      const response = await fetch(`${base}:runQuery`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId }],
            where: {
              fieldFilter: {
                field: { fieldPath: field },
                op: "EQUAL",
                value: { stringValue: value },
              },
            },
          },
        }),
      })
      if (!response.ok)
        throw new Error(`Role query failed (${response.status})`)
      return (await response.json()) as Array<{ document?: FirestoreDocument }>
    }
    const assignments = await query("users_roles", "uid", uid)
    const roleIds = [
      ...new Set(
        assignments.flatMap(({ document }) => {
          const roleId = document?.fields?.roleId?.stringValue
          return document?.fields?.uid?.stringValue === uid &&
            typeof roleId === "string" &&
            /^role-[a-z0-9-]+$/.test(roleId) &&
            document.name ===
              `${base.slice("https://firestore.googleapis.com/v1/".length)}/users_roles/ur-${uid}-${roleId}`
            ? [roleId]
            : []
        })
      ),
    ]
    const roles = (
      await Promise.all(
        roleIds.map(async (roleId) => {
          const response = await fetch(`${base}/roles/${roleId}`, {
            headers: { Authorization: `Bearer ${idToken}` },
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          })
          if (response.status === 404) return null
          if (!response.ok)
            throw new Error(`Role lookup failed (${response.status})`)
          return roleId
        })
      )
    ).filter((roleId): roleId is string => roleId !== null)
    return {
      roles,
      isAdmin: roles.includes(ADMIN_ROLE_ID),
      authorizationError: false,
    }
  } catch (error) {
    // Never log Firebase tokens or confuse a failed lookup with no assigned role.
    console.error(
      "[RBAC] Unable to load roles:",
      error instanceof Error ? error.message : "Unknown error"
    )
    return { roles: [], isAdmin: false, authorizationError: true }
  }
}
