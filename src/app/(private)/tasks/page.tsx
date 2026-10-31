"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowUp, BarChart3, CheckCircle2, Clock, ListTodo } from "lucide-react"
import { onAuthStateChanged } from "firebase/auth"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { auth } from "@/lib/firebase/client"
import { hasAdminAccess } from "@/lib/auth/permissions"
import { canReadTask } from "@/modules/tasks/services/task-permissions"
import {
  isLegacySeedTask,
  TASK_SEED_COUNT,
} from "@/modules/tasks/services/task-seed-data"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getTaskColumns } from "@/modules/tasks/components/columns"
import { DataTable } from "@/modules/tasks/components/data-table"
import {
  createTask,
  deleteTask,
  deleteSeedTasks,
  deleteLegacySeedTasks,
  getTasks,
  getTaskStats,
  seedTasksWithClient,
  updateTask,
} from "@/modules/tasks/services/task-services"
import type { Task } from "@/modules/tasks/services/types/task-types"

export default function TaskPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [isSeedingTasks, setIsSeedingTasks] = useState(false)
  const [isDeletingSeedTasks, setIsDeletingSeedTasks] = useState(false)
  const [seedError, setSeedError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setTasks([])
      setCurrentUserId(user?.uid ?? null)
    })
  }, [])

  const refreshTasks = useCallback(async () => {
    const taskList = await getTasks()
    setTasks(taskList)
  }, [])

  useEffect(() => {
    let active = true
    if (!currentUserId) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const loadTasks = async () => {
      try {
        const taskList = await getTasks()
        if (active && auth.currentUser?.uid === currentUserId) {
          setTasks(taskList)
        }
      } catch (error) {
        if (active) {
          setTasks([])
          console.error("Failed to load tasks:", error)
          toast.error("Không tải được công việc. Vui lòng tải lại trang.")
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadTasks()
    return () => {
      active = false
    }
  }, [currentUserId])

  const handleAddTask = useCallback(
    async (newTask: Task) => {
      await createTask(newTask)
      await refreshTasks()
    },
    [refreshTasks]
  )

  const handleUpdateTask = useCallback(async (task: Task) => {
    const updated = await updateTask(task)
    setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)))
  }, [])

  const handleDeleteTask = useCallback(async (taskId: string) => {
    await deleteTask(taskId)
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }, [])

  const handleDuplicateTask = useCallback(async (task: Task) => {
    const duplicate: Task = {
      ...task,
      id: `TASK-${Date.now()}`,
      title: `${task.title} (Copy)`,
    }

    const created = await createTask(duplicate)
    setTasks((prev) => [created, ...prev])
  }, [])

  const handleSeedTasks = useCallback(async () => {
    try {
      setIsSeedingTasks(true)
      setSeedError(null)
      const seededTasks = await seedTasksWithClient()
      setTasks(seededTasks)
      toast.success(`Đã tạo ${TASK_SEED_COUNT} mẫu thuộc tài khoản của bạn.`)
    } catch (error) {
      console.error("Failed to seed tasks:", error)
      const message =
        error instanceof Error ? error.message : "Không thể tạo dữ liệu mẫu."
      setSeedError(message)
      toast.error(message)
    } finally {
      setIsSeedingTasks(false)
    }
  }, [])

  const visibleTasks = tasks.filter((task) => canReadTask(task, currentUserId))
  const seedTaskCount = visibleTasks.filter(
    (task) => task.isSeedData === true && task.createdBy === currentUserId
  ).length
  const legacySeedTaskCount = visibleTasks.filter((task) =>
    isLegacySeedTask(task.id, task)
  ).length

  const handleDeleteSeedTasks = async (legacy = false) => {
    const count = legacy ? legacySeedTaskCount : seedTaskCount
    const description = legacy
      ? `${count} công việc mẫu cũ chưa có người tạo, còn nguyên nội dung mẫu`
      : `${count} công việc mẫu do tài khoản của bạn tạo (kể cả mẫu đã chỉnh sửa)`
    if (!window.confirm(`Xóa ${description}? Thao tác này không thể hoàn tác.`)) {
      return
    }
    setIsDeletingSeedTasks(true)
    setSeedError(null)
    try {
      const deleted = await (legacy ? deleteLegacySeedTasks() : deleteSeedTasks())
      toast.success(`Đã xóa ${deleted} công việc mẫu.`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể xóa dữ liệu mẫu."
      setSeedError(message)
      toast.error(message)
    } finally {
      // Also refresh after partial failure when deleting multiple batches.
      try {
        await refreshTasks()
      } catch {
        toast.error("Không tải lại được danh sách. Vui lòng tải lại trang.")
      }
      setIsDeletingSeedTasks(false)
    }
  }

  const taskColumns = useMemo(
    () =>
      getTaskColumns({
        currentUserId,
        onUpdateTask: handleUpdateTask,
        onDeleteTask: handleDeleteTask,
        onDuplicateTask: handleDuplicateTask,
      }),
    [currentUserId, handleDeleteTask, handleDuplicateTask, handleUpdateTask]
  )

  const stats = getTaskStats(visibleTasks)
  const getPercent = (value: number) =>
    stats.total > 0 ? Math.round((value / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col gap-2 px-4 md:px-6">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground">
          Chỉ hiển thị công việc bạn tạo hoặc được chỉ định nhận report.
        </p>
        <p className="text-sm text-muted-foreground">
          UID đang đăng nhập:{" "}
          <code>{currentUserId ?? "Chưa đăng nhập Firebase"}</code>
        </p>
        {legacySeedTaskCount > 0 && (
          <p className="text-sm text-muted-foreground">
            Có {legacySeedTaskCount} mẫu cũ chưa có người tạo nên chỉ có Duplicate.
            Mẫu mới sẽ lưu UID của bạn và cho phép Edit/Delete.
          </p>
        )}
        {seedError && (
          <p role="alert" className="text-sm text-destructive">
            {seedError}
          </p>
        )}
      </div>

      {/* Mobile view placeholder - shows message instead of images */}
      <div className="md:hidden px-4 md:px-6">
        <div className="flex items-center justify-center h-96 border rounded-lg bg-muted/20">
          <div className="text-center p-8">
            <h3 className="text-lg font-semibold mb-2">Tasks Dashboard</h3>
            <p className="text-muted-foreground">
              Please use a larger screen to view the full tasks interface.
            </p>
          </div>
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden h-full flex-1 flex-col space-y-6 px-4 md:px-6 md:flex">
        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Total Tasks
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.total}</span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.completed)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <ListTodo className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Completed
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {stats.completed}
                    </span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.completed)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <CheckCircle2 className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    In Progress
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">
                      {stats.inProgress}
                    </span>
                    <span className="flex items-center gap-0.5 text-sm text-green-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.inProgress)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <Clock className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Pending
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{stats.pending}</span>
                    <span className="flex items-center gap-0.5 text-sm text-orange-500">
                      <ArrowUp className="size-3.5" />
                      {getPercent(stats.pending)}%
                    </span>
                  </div>
                </div>
                <div className="bg-secondary rounded-lg p-3">
                  <BarChart3 className="size-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Task Management</CardTitle>
            <CardDescription>
              View, filter, and manage all your project tasks in one place
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              data={visibleTasks}
              columns={taskColumns}
              onAddTask={handleAddTask}
              onSeedTasks={currentUserId ? handleSeedTasks : undefined}
              isSeedingTasks={isSeedingTasks}
              seedTaskCount={seedTaskCount}
              legacySeedTaskCount={legacySeedTaskCount}
              isDeletingSeedTasks={isDeletingSeedTasks}
              onDeleteSeedTasks={
                currentUserId ? () => handleDeleteSeedTasks() : undefined
              }
              onDeleteLegacySeedTasks={
                hasAdminAccess(session?.user)
                  ? () => handleDeleteSeedTasks(true)
                  : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
