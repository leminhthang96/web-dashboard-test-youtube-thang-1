export function canReadTask(
  task: { createdBy?: string; reporter?: string },
  uid: string | null | undefined
): boolean {
  return Boolean(uid && (task.createdBy === uid || task.reporter === uid))
}

export function canManageTask(
  task: { createdBy?: string },
  uid: string | null | undefined
): boolean {
  return Boolean(uid && task.createdBy === uid)
}
