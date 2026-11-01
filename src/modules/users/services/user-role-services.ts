import type { UserRole } from "./types/user-types"
import { rbacRequest } from "./rbac-api"

export async function getUserRoles(): Promise<UserRole[]> {
  return rbacRequest<UserRole[]>("/api/admin/user-roles")
}
export async function getRolesForUser(uid: string): Promise<UserRole[]> {
  return (await getUserRoles()).filter((role) => role.uid === uid)
}
export async function getUsersForRole(roleId: string): Promise<UserRole[]> {
  return (await getUserRoles()).filter((role) => role.roleId === roleId)
}
export async function setRolesForUser(
  uid: string,
  roleIds: string[]
): Promise<void> {
  await rbacRequest("/api/admin/user-roles", {
    method: "PUT",
    body: JSON.stringify({ uid, roleIds }),
  })
}
export async function assignRoleToUser(
  uid: string,
  roleId: string
): Promise<UserRole> {
  const existing = await getRolesForUser(uid)
  await setRolesForUser(uid, [
    ...new Set([...existing.map((role) => role.roleId), roleId]),
  ])
  return { id: "ur-" + uid + "-" + roleId, uid, roleId }
}
export async function removeRoleFromUser(
  uid: string,
  roleId: string
): Promise<void> {
  const existing = await getRolesForUser(uid)
  await setRolesForUser(
    uid,
    existing.filter((role) => role.roleId !== roleId).map((role) => role.roleId)
  )
}
export async function removeAllAssignmentsForRole(
  roleId: string
): Promise<void> {
  const assignments = await getUsersForRole(roleId)
  for (const uid of new Set(assignments.map((role) => role.uid)))
    await removeRoleFromUser(uid, roleId)
}
export async function removeAllAssignmentsForUser(uid: string): Promise<void> {
  await setRolesForUser(uid, [])
}
