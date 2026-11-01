import type { Role } from "./types/user-types"
import { rbacRequest } from "./rbac-api"

export async function getRoles(): Promise<Role[]> {
  return rbacRequest<Role[]>("/api/admin/roles")
}
export async function getRole(roleId: string): Promise<Role | null> {
  return (await getRoles()).find((role) => role.id === roleId) ?? null
}
export async function createRole(role: Role): Promise<Role> {
  return rbacRequest<Role>("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify({ role }),
  })
}
export async function updateRole(role: Role): Promise<Role> {
  return rbacRequest<Role>("/api/admin/roles", {
    method: "PATCH",
    body: JSON.stringify({ role }),
  })
}
export async function deleteRole(roleId: string): Promise<void> {
  await rbacRequest("/api/admin/roles?id=" + encodeURIComponent(roleId), {
    method: "DELETE",
  })
}
export async function seedRolesWithClient(): Promise<Role[]> {
  await rbacRequest("/api/admin/roles", {
    method: "POST",
    body: JSON.stringify({ seed: true }),
  })
  return getRoles()
}
export function generateRoleId(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
  return "role-" + slug
}
