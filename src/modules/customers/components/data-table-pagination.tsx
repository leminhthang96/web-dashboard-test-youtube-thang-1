"use client"

import type { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
  const total = table.getFilteredRowModel().rows.length
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-sm text-muted-foreground">{total} khách hàng</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Số dòng</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-20" aria-label="Số dòng mỗi trang">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Trang trước"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm">
            Trang {total ? table.getState().pagination.pageIndex + 1 : 0} /{" "}
            {table.getPageCount()}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Trang sau"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
