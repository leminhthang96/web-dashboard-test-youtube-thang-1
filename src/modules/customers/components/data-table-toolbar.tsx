"use client"

import type { Table } from "@tanstack/react-table"
import { FileDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <Input
          aria-label="Tìm khách hàng"
          placeholder="Tìm tên, email, điện thoại, dịch vụ..."
          value={search}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          className="w-full sm:w-80"
        />
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => table.setGlobalFilter("")}
            aria-label="Xóa tìm kiếm"
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
