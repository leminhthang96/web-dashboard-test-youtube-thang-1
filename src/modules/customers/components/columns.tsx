"use client"

import type { ColumnDef, SortingFn } from "@tanstack/react-table"
import type { Customer } from "../services/types/customer-types"
import { DataTableColumnHeader } from "./data-table-column-header"
import {
  DataTableRowActions,
  type CustomerColumnActions,
} from "./data-table-row-actions"

const collator = new Intl.Collator("vi", { sensitivity: "base", numeric: true })
const sortText: SortingFn<Customer> = (a, b, id) =>
  collator.compare(a.getValue<string>(id), b.getValue<string>(id))

export function getCustomerColumns(
  actions: CustomerColumnActions = {}
): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: "fullName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Họ và tên" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.fullName}</span>
      ),
      sortingFn: sortText,
      sortDescFirst: false,
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      sortingFn: sortText,
      sortDescFirst: false,
    },
    {
      accessorKey: "phoneNumber",
      header: "Số điện thoại",
      enableSorting: false,
    },
    { accessorKey: "serviceName", header: "Dịch vụ", enableSorting: false },
    {
      id: "actions",
      header: () => <div className="text-right">Thao tác</div>,
      cell: ({ row }) => <DataTableRowActions row={row} {...actions} />,
      enableSorting: false,
      enableHiding: false,
    },
  ]
}

export const columns = getCustomerColumns()
