"use client"

import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

import {
  categories,
  priorities,
  statuses,
} from "@/modules/tasks/services/task-mock-data"
import type { Task } from "@/modules/tasks/services/types/task-types"
import { DataTableColumnHeader } from "./data-table-column-header"
import { DataTableRowActions } from "./data-table-row-actions"
import { CopyIdentifier } from "./copy-identifier"

interface TaskColumnActions {
  currentUserId?: string | null
  onUpdateTask?: (task: Task) => void | Promise<void>
  onDeleteTask?: (taskId: string) => void | Promise<void>
  onDuplicateTask?: (task: Task) => void | Promise<void>
}

export function getTaskColumns({
  currentUserId,
  onUpdateTask,
  onDeleteTask,
  onDuplicateTask,
}: TaskColumnActions = {}): ColumnDef<Task>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px] cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px] cursor-pointer"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mã task" />
      ),
      cell: ({ row }) => (
        <CopyIdentifier value={row.original.id} label="Mã task" />
      ),
      enableHiding: true,
    },
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Công việc" />
      ),
      cell: ({ row }) => {
        return (
          <div className="w-[280px] space-y-1 whitespace-normal xl:w-[380px]">
            <p className="font-medium leading-relaxed text-foreground [overflow-wrap:anywhere]">
              {row.getValue("title")}
            </p>
            <CopyIdentifier value={row.original.id} label="Mã task" />
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Danh mục" />
      ),
      cell: ({ row }) => {
        const category = categories.find(
          (cat) => cat.value === row.getValue("category")
        )

        if (!category) {
          return null
        }

        return (
          <div className="flex min-w-[90px] items-center">
            <Badge variant="outline">{category.label}</Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Trạng thái" />
      ),
      cell: ({ row }) => {
        const status = statuses.find(
          (status) => status.value === row.getValue("status")
        )

        if (!status) {
          return null
        }

        return (
          <div className="flex w-[130px] items-center">
            {status.icon && (
              <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm">{status.label}</span>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Ưu tiên" />
      ),
      cell: ({ row }) => {
        const priority = priorities.find(
          (priority) => priority.value === row.getValue("priority")
        )

        if (!priority) {
          return null
        }

        const priorityColors = {
          critical: "border-red-700 text-red-700 dark:text-red-400",
          important: "border-orange-500 text-orange-700 dark:text-orange-400",
          normal: "border-blue-500 text-blue-700 dark:text-blue-400",
          minor: "border-gray-500 text-gray-700 dark:text-gray-400",
        }

        return (
          <div className="flex items-center">
            <Badge
              variant="outline"
              className={cn(
                "pl-2",
                priorityColors[priority.value as keyof typeof priorityColors]
              )}
            >
              <span className="text-sm">{priority.label}</span>
            </Badge>
          </div>
        )
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id))
      },
    },
    {
      accessorKey: "createdBy",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Người tạo" />
      ),
      cell: ({ row }) => {
        const uid = row.original.createdBy
        return (
          <div className="w-[150px] space-y-1 whitespace-normal">
            {uid ? (
              <>
                <span
                  className={cn(
                    "block text-sm",
                    uid === currentUserId && "font-medium text-primary"
                  )}
                >
                  {uid === currentUserId ? "Bạn" : "Người dùng"}
                </span>
                <CopyIdentifier value={uid} label="UID người tạo" />
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Chưa có người tạo
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "reporter",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Người nhận report" />
      ),
      cell: ({ row }) => {
        const uid = row.original.reporter
        return (
          <div className="w-[150px] space-y-1 whitespace-normal">
            {uid ? (
              <>
                <span
                  className={cn(
                    "block text-sm",
                    uid === currentUserId && "font-medium text-primary"
                  )}
                >
                  {uid === currentUserId ? "Bạn" : "Người dùng"}
                </span>
                <CopyIdentifier value={uid} label="UID người nhận report" />
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Chưa chỉ định</span>
            )}
          </div>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <DataTableRowActions
          row={row}
          currentUserId={currentUserId}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onDuplicateTask={onDuplicateTask}
        />
      ),
    },
  ]
}

export const columns = getTaskColumns()
