"use client"

import type { Table } from "@tanstack/react-table"
import { Database, RefreshCcw, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTableViewOptions } from "./data-table-view-options"
import { AddTaskModal } from "./add-task-modal"

import {
  categories,
  priorities,
  statuses,
} from "@/modules/tasks/services/task-mock-data"
import type { Task } from "@/modules/tasks/services/types/task-types"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  onAddTask?: (task: Task) => void | Promise<void>
  onSeedTasks?: () => void | Promise<void>
  isSeedingTasks?: boolean
  seedTaskCount?: number
  legacySeedTaskCount?: number
  isDeletingSeedTasks?: boolean
  onDeleteSeedTasks?: () => void | Promise<void>
  onDeleteLegacySeedTasks?: () => void | Promise<void>
}

export function DataTableToolbar<TData>({
  table,
  onAddTask,
  onSeedTasks,
  isSeedingTasks,
  seedTaskCount = 0,
  legacySeedTaskCount = 0,
  isDeletingSeedTasks,
  onDeleteSeedTasks,
  onDeleteLegacySeedTasks,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  const handleStatusChange = (value: string) => {
    const column = table.getColumn("status")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const handleCategoryChange = (value: string) => {
    const column = table.getColumn("category")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const handlePriorityChange = (value: string) => {
    const column = table.getColumn("priority")
    if (value === "all") {
      column?.setFilterValue(undefined)
    } else {
      column?.setFilterValue(value)
    }
  }

  const statusFilter = table.getColumn("status")?.getFilterValue() as
    | string
    | undefined
  const categoryFilter = table.getColumn("category")?.getFilterValue() as
    | string
    | undefined
  const priorityFilter = table.getColumn("priority")?.getFilterValue() as
    | string
    | undefined

  return (
    <div className="space-y-4">
      {/* Filter Section */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {/* Status Filter */}
          <Select
            value={statusFilter || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">
                All Status
              </SelectItem>
              {statuses.map((status) => (
                <SelectItem
                  key={status.value}
                  value={status.value}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    {status.icon && (
                      <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    {status.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={categoryFilter || "all"}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">
                All Categories
              </SelectItem>
              {categories.map((category) => (
                <SelectItem
                  key={category.value}
                  value={category.value}
                  className="cursor-pointer"
                >
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select
            value={priorityFilter || "all"}
            onValueChange={handlePriorityChange}
          >
            <SelectTrigger className="w-full cursor-pointer">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="cursor-pointer">
                All Priorities
              </SelectItem>
              {priorities.map((priority) => (
                <SelectItem
                  key={priority.value}
                  value={priority.value}
                  className="cursor-pointer"
                >
                  <div className="flex items-center">
                    {priority.icon && (
                      <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    )}
                    {priority.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Search and Actions Section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Search Task"
            value={(table.getColumn("title")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("title")?.setFilterValue(event.target.value)
            }
            className=" w-[200px] lg:w-[300px] cursor-text"
          />
          <Button
            variant="outline"
            onClick={() => table.resetColumnFilters()}
            className="px-3 cursor-pointer"
            disabled={!isFiltered}
          >
            <RefreshCcw className="h-4 w-4" />
            <span className="hidden lg:block">Reset Filters</span>
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={onSeedTasks}
            disabled={!onSeedTasks || isSeedingTasks || isDeletingSeedTasks}
          >
            <Database className="h-4 w-4" />
            <span className="hidden lg:block">
              {isSeedingTasks ? "Seeding..." : "Seed Data"}
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDeleteSeedTasks}
            disabled={
              !onDeleteSeedTasks ||
              !seedTaskCount ||
              isSeedingTasks ||
              isDeletingSeedTasks
            }
            title="Chỉ xóa dữ liệu mẫu do bạn tạo"
          >
            <Trash2 className="h-4 w-4" />
            Xóa mẫu của tôi ({seedTaskCount})
          </Button>
          {onDeleteLegacySeedTasks && legacySeedTaskCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onDeleteLegacySeedTasks}
              disabled={isSeedingTasks || isDeletingSeedTasks}
              title="Chỉ admin: xóa mẫu cũ chưa có người tạo và chưa chỉnh sửa"
            >
              <Trash2 className="h-4 w-4" />
              Xóa mẫu cũ ({legacySeedTaskCount})
            </Button>
          )}
          <DataTableViewOptions table={table} />
          <AddTaskModal onAddTask={onAddTask} />
        </div>
      </div>
    </div>
  )
}
