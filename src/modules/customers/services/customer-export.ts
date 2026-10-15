import type { Table } from "@tanstack/react-table"
import type { Customer } from "./types/customer-types"

export const customerColumnLabels: Record<string, string> = {
  fullName: "Họ và tên",
  email: "Email",
  phoneNumber: "Số điện thoại",
  serviceName: "Dịch vụ",
}

function escapeCsvCell(value: unknown) {
  const text = String(value ?? "")
  // Prevent customer input from being interpreted as spreadsheet formulas.
  const safeText = /^\s*[=+@-]/.test(text) ? `'${text}` : text
  return `"${safeText.replace(/"/g, '""')}"`
}

export function createCustomersCsv(table: Table<Customer>) {
  const columns = table
    .getVisibleLeafColumns()
    .filter((column) =>
      Object.prototype.hasOwnProperty.call(customerColumnLabels, column.id)
    )
  const rows = table.getPrePaginationRowModel().rows
  const records = [
    columns.map((column) => customerColumnLabels[column.id]),
    ...rows.map((row) => columns.map((column) => row.getValue(column.id))),
  ]

  // UTF-8 BOM keeps Vietnamese text readable when opened in Excel.
  return (
    "\uFEFF" +
    records.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")
  )
}
