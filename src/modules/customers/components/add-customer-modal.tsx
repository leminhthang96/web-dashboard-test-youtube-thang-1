"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CustomerFormValues } from "../services/types/customer-types"
import { CustomerFormDialog } from "./customer-form-dialog"

export function AddCustomerModal({
  onAddCustomer,
}: {
  onAddCustomer: (values: CustomerFormValues) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  return (
    <CustomerFormDialog
      open={open}
      onOpenChange={setOpen}
      onSubmit={onAddCustomer}
      trigger={
        <Button type="button">
          <Plus className="size-4" />
          Thêm khách hàng
        </Button>
      }
    />
  )
}
