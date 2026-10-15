"use client"

import { useRef, useState } from "react"
import type { Row } from "@tanstack/react-table"
import { Loader2, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  customerSchema,
  type Customer,
  type CustomerFormValues,
} from "../services/types/customer-types"
import { getCustomerErrorMessage } from "../services/customer-errors"
import { CustomerFormDialog } from "./customer-form-dialog"

export interface CustomerColumnActions {
  onUpdateCustomer?: (id: string, values: CustomerFormValues) => Promise<void>
  onDeleteCustomer?: (id: string) => Promise<void>
}

export function DataTableRowActions({
  row,
  onUpdateCustomer,
  onDeleteCustomer,
}: {
  row: Row<Customer>
} & CustomerColumnActions) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const parsed = customerSchema.safeParse(row.original)
  if (!parsed.success) return null
  // Keep this reference stable so an unrelated rerender does not reset the form.
  const customer = row.original

  async function handleDelete() {
    if (!onDeleteCustomer || pending.current) return
    pending.current = true
    setDeleting(true)
    setError(null)
    try {
      await onDeleteCustomer(customer.id)
      setDeleteOpen(false)
    } catch (error) {
      setError(getCustomerErrorMessage(error))
    } finally {
      pending.current = false
      setDeleting(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {onUpdateCustomer && (
        <CustomerFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          customer={customer}
          onSubmit={(values) => onUpdateCustomer(customer.id, values)}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Sửa khách hàng ${customer.fullName}`}
            >
              <Pencil className="size-4" />
              Sửa
            </Button>
          }
        />
      )}
      {onDeleteCustomer && (
        <AlertDialog
          open={deleteOpen}
          onOpenChange={(value) => {
            if (pending.current) return
            setError(null)
            setDeleteOpen(value)
          }}
        >
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Xóa khách hàng ${customer.fullName}`}
            >
              <Trash2 className="size-4" />
              Xóa
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent aria-busy={deleting}>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa khách hàng?</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn có chắc muốn xóa khách hàng{" "}
                <strong>{customer.fullName}</strong> ({customer.email})? Thao
                tác này không thể hoàn tác.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Hủy</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deleting}
                onClick={(event) => {
                  event.preventDefault()
                  void handleDelete()
                }}
              >
                {deleting && <Loader2 className="size-4 animate-spin" />}
                {deleting ? "Đang xóa..." : "Xóa khách hàng"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
