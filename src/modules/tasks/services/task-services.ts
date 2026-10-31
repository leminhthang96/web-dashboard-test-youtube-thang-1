import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  where,
  writeBatch,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase/client"
import { taskSeedData } from "./task-seed-data"
import { canManageTask, canReadTask } from "./task-permissions"
import { taskSchema, type Task } from "./types/task-types"

const TASKS_COLLECTION = "tasks"

async function getCurrentUserId(): Promise<string> {
  await auth.authStateReady()
  if (!auth.currentUser) {
    throw new Error("Vui lòng đăng nhập để quản lý công việc.")
  }
  return auth.currentUser.uid
}

function assertOwner(task: { createdBy?: string }, uid: string): void {
  if (auth.currentUser?.uid !== uid || !canManageTask(task, uid)) {
    throw new Error("Chỉ người tạo công việc mới được sửa hoặc xóa.")
  }
}

export async function getTasks(): Promise<Task[]> {
  const uid = await getCurrentUserId()
  const tasks = collection(db, TASKS_COLLECTION)
  const snapshots = await Promise.all([
    getDocs(query(tasks, where("createdBy", "==", uid))),
    getDocs(query(tasks, where("reporter", "==", uid))),
  ])
  if (auth.currentUser?.uid !== uid) {
    throw new Error("Tài khoản đã thay đổi. Vui lòng tải lại danh sách.")
  }
  const documents = new Map(
    snapshots.flatMap((snapshot) =>
      snapshot.docs.map((document) => [document.id, document] as const)
    )
  )
  const result = [...documents.values()].map((document) => {
    const data = document.data() as Task

    return {
      ...data,
      id: document.id,
    }
  })

  // Keep the current user's actionable tasks ahead of legacy unowned fixtures.
  result.sort(
    (a, b) => Number(b.createdBy === uid) - Number(a.createdBy === uid)
  )
  return JSON.parse(JSON.stringify(result.filter((task) => canReadTask(task, uid))))
}

export async function seedTasksWithClient(): Promise<Task[]> {
  const createdBy = await getCurrentUserId()
  const batch = writeBatch(db)

  taskSeedData.forEach((task) => {
    // Fresh IDs avoid overwriting or claiming another user's sample tasks.
    const reference = doc(collection(db, TASKS_COLLECTION))
    batch.set(reference, {
      ...task,
      id: reference.id,
      createdBy,
      reporter: createdBy,
      isSeedData: true,
    })
  })

  assertOwner({ createdBy }, createdBy)
  await batch.commit()
  return getTasks()
}

export async function deleteSeedTasks(): Promise<number> {
  const uid = await getCurrentUserId()
  const snapshot = await getDocs(
    query(collection(db, TASKS_COLLECTION), where("createdBy", "==", uid))
  )
  const samples = snapshot.docs.filter((item) => item.data().isSeedData === true)
  let deleted = 0
  // Re-read ownership and the marker inside each atomic transaction.
  for (let offset = 0; offset < samples.length; offset += 200) {
    const chunk = samples.slice(offset, offset + 200)
    deleted += await runTransaction(db, async (transaction) => {
      const current = await Promise.all(
        chunk.map((item) => transaction.get(item.ref))
      )
      const targets = current.filter((item) => item.exists())
      targets.forEach((item) => assertOwner(item.data(), uid))
      const marked = targets.filter((item) => item.data().isSeedData === true)
      marked.forEach((item) => transaction.delete(item.ref))
      return marked.length
    })
  }
  return deleted
}

export async function deleteLegacySeedTasks(): Promise<number> {
  const response = await fetch("/api/admin/tasks/seed-data", {
    method: "DELETE",
  })
  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Không thể xóa dữ liệu mẫu cũ.")
  }
  return result.data.deletedCount
}

export async function createTask(task: Task): Promise<Task> {
  const createdBy = await getCurrentUserId()
  const payload = taskSchema.parse({
    ...task,
    createdBy,
    reporter: task.reporter ?? "",
    isSeedData: false,
  })
  const reference = doc(db, TASKS_COLLECTION, payload.id)
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference)
    if (existing.exists()) {
      throw new Error("Mã công việc đã tồn tại. Vui lòng tạo lại.")
    }
    assertOwner(payload, createdBy)
    transaction.set(reference, payload)
  })
  return payload
}

export async function updateTask(task: Task): Promise<Task> {
  const uid = await getCurrentUserId()
  const reference = doc(db, TASKS_COLLECTION, task.id)
  const values = taskSchema
    .omit({ id: true, createdBy: true, isSeedData: true })
    .parse(task)
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference)
    if (!existing.exists()) throw new Error("Công việc không còn tồn tại.")
    // Trust the stored creator, never the creator supplied by the caller.
    assertOwner(existing.data(), uid)
    transaction.update(reference, values)
    return {
      ...existing.data(),
      ...values,
      id: reference.id,
      createdBy: uid,
      isSeedData: existing.data().isSeedData === true,
    }
  })
}

export async function deleteTask(taskId: string): Promise<void> {
  const uid = await getCurrentUserId()
  const reference = doc(db, TASKS_COLLECTION, taskId)
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference)
    if (!existing.exists()) throw new Error("Công việc không còn tồn tại.")
    assertOwner(existing.data(), uid)
    transaction.delete(reference)
  })
}

export function getTaskStats(tasks: Task[]) {
  const total = tasks.length

  return {
    total,
    completed: tasks.filter((task) => task.status === "completed").length,
    inProgress: tasks.filter((task) => task.status === "in progress").length,
    pending: tasks.filter((task) => task.status === "pending").length,
  }
}
