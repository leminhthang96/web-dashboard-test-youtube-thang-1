"use client"

import type { Table } from "@tanstack/react-table"
import { FileDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  Customer,
  CustomerFormValues,
} from "../services/types/customer-types"
import { DataTableViewOptions } from "./data-table-view-options"
import { AddCustomerModal } from "./add-customer-modal"
import { createCustomersCsv } from "../services/customer-export"

export function DataTableToolbar({
  table,
  onAddCustomer,
}: {
  table: Table<Customer>
  onAddCustomer: (values: CustomerFormValues) => Promise<void>
}) {
  const search = (table.getState().globalFilter as string) ?? ""
  const categoryColumn = table.getColumn("serviceName")
  const category = categoryColumn?.getFilterValue() as string | undefined
  const categories = Array.from(
    new Set(table.getCoreRowModel().rows.map((row) => row.original.serviceName))
  )
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "vi"))
  const isFiltered = Boolean(search || category)

  function exportCustomers() {
    const blob = new Blob([createCustomersCsv(table)], {
      type: "text/csv;charset=utf-8;",
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "customers.csv"
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-full min-w-0 items-center gap-2 xl:w-auto xl:flex-1">
        <Input
          aria-label="Tìm khách hàng"
          placeholder="Tìm kiếm khách hàng..."
          value={search}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="min-w-0 flex-1 sm:max-w-80"
        />
        <Select
          value={category ? `service:${category}` : "all"}
          onValueChange={(value) =>
            categoryColumn?.setFilterValue(
              value === "all" ? undefined : value.slice("service:".length)
            )
          }
        >
          <SelectTrigger
            className="w-36 shrink-0 sm:w-48"
            aria-label="Lọc theo danh mục dịch vụ"
          >
            <SelectValue placeholder="Tất cả danh mục" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((name) => (
              <SelectItem key={name} value={`service:${name}`}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            onClick={() => {
              table.setGlobalFilter("")
              table.resetColumnFilters()
            }}
            aria-label="Xóa tìm kiếm và bộ lọc"
            title="Xóa tìm kiếm và bộ lọc"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={exportCustomers}
            disabled={table.getPrePaginationRowModel().rows.length === 0}
            title="Xuất CSV các cột đang hiển thị và toàn bộ kết quả đã lọc"
          >
            <FileDown className="size-4" aria-hidden="true" />
            Xuất file
          </Button>
          <DataTableViewOptions table={table} />
        </div>
        <AddCustomerModal onAddCustomer={onAddCustomer} />
      </div>
    </div>
  )
}
