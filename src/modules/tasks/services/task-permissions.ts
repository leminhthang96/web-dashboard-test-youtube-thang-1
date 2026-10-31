export function canManageTask(
  task: { createdBy?: string },
  uid: string | null | undefined
): boolean {
  return Boolean(uid && task.createdBy === uid)
}
