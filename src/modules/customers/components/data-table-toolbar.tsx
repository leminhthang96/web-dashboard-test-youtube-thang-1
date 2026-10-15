"use client"

import type { Table } from "@tanstack/react-table"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  Customer,
  CustomerFormValues,
} from "../services/types/customer-types"
import { DataTableViewOptions } from "./data-table-view-options"
import { AddCustomerModal } from "./add-customer-modal"

export function DataTableToolbar({
  table,
  onAddCustomer,
}: {
  table: Table<Customer>
  onAddCustomer: (values: CustomerFormValues) => Promise<void>
}) {
  const search = (table.getState().globalFilter as string) ?? ""
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
      <div className="flex items-center gap-2">
        <DataTableViewOptions table={table} />
        <AddCustomerModal onAddCustomer={onAddCustomer} />
      </div>
    </div>
  )
}
