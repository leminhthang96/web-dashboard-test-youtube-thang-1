import {
  collection,
  doc,
  getDocs,
  runTransaction,
  writeBatch,
} from "firebase/firestore"

import { auth, db } from "@/lib/firebase/client"
import { taskMockData } from "./task-mock-data"
import { canManageTask } from "./task-permissions"
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
  await getCurrentUserId()
  const snapshot = await getDocs(collection(db, TASKS_COLLECTION))

  const result = snapshot.docs.map((document) => {
    const data = document.data() as Task

    return {
      ...data,
      id: document.id,
    }
  })

  return JSON.parse(JSON.stringify(result))
}

export async function seedTasksWithClient(): Promise<Task[]> {
  const createdBy = await getCurrentUserId()
  const batch = writeBatch(db)

  taskMockData.forEach((task) => {
    // Fresh IDs avoid overwriting or claiming another user's sample tasks.
    const reference = doc(collection(db, TASKS_COLLECTION))
    batch.set(reference, { ...task, id: reference.id, createdBy })
  })

  await batch.commit()
  return getTasks()
}

export async function createTask(task: Task): Promise<Task> {
  const createdBy = await getCurrentUserId()
  const payload = taskSchema.parse({ ...task, createdBy })
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
  const values = taskSchema.omit({ id: true, createdBy: true }).parse(task)
  return runTransaction(db, async (transaction) => {
    const existing = await transaction.get(reference)
    if (!existing.exists()) throw new Error("Công việc không còn tồn tại.")
    // Trust the stored creator, never the creator supplied by the caller.
    assertOwner(existing.data(), uid)
    transaction.update(reference, values)
    return { ...values, id: reference.id, createdBy: uid }
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
