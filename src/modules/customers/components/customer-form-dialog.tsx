"use client"

import { useEffect, useRef, type ReactNode } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { getCustomerErrorMessage } from "../services/customer-errors"
import {
  customerFormSchema,
  type CustomerFormValues,
} from "../services/types/customer-types"

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: CustomerFormValues
  onSubmit: (values: CustomerFormValues) => Promise<void>
  trigger?: ReactNode
}

const fields = [
  {
    name: "fullName",
    label: "Họ và tên",
    placeholder: "Lê Minh Thắng",
    type: "text",
    autoComplete: "name",
  },
  {
    name: "email",
    label: "Email",
    placeholder: "thanglmt@softech.vn",
    type: "email",
    autoComplete: "email",
  },
  {
    name: "phoneNumber",
    label: "Số điện thoại",
    placeholder: "1234567890",
    type: "tel",
    autoComplete: "tel",
  },
  {
    name: "serviceName",
    label: "Dịch vụ",
    placeholder: "Nhập tên dịch vụ",
    type: "text",
    autoComplete: "off",
  },
] as const

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
  trigger,
}: CustomerFormDialogProps) {
  const submitting = useRef(false)
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      serviceName: "",
    },
  })
  const { reset } = form
  const isSubmitting = form.formState.isSubmitting

  useEffect(() => {
    if (open) {
      reset({
        fullName: customer?.fullName ?? "",
        email: customer?.email ?? "",
        phoneNumber: customer?.phoneNumber ?? "",
        serviceName: customer?.serviceName ?? "",
      })
    }
  }, [open, customer, reset])

  async function handleSubmit(values: CustomerFormValues) {
    if (submitting.current) return
    submitting.current = true
    form.clearErrors("root")
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      form.setError("root", { message: getCustomerErrorMessage(error) })
    } finally {
      submitting.current = false
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!submitting.current) onOpenChange(value)
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        showCloseButton={!isSubmitting}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            {customer ? "Sửa khách hàng" : "Thêm khách hàng"}
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin khách hàng. Các trường bên dưới đều bắt buộc.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            noValidate
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
            aria-busy={isSubmitting}
          >
            {form.formState.errors.root?.message && (
              <p role="alert" className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </p>
            )}
            {fields.map(({ name, label, ...inputProps }) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input
                        {...inputProps}
                        {...field}
                        disabled={isSubmitting}
                        aria-required="true"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting
                  ? "Đang lưu..."
                  : customer
                    ? "Lưu thay đổi"
                    : "Thêm khách hàng"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
