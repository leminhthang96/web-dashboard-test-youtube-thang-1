import { z } from "zod"

export const customerFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập họ tên")
    .max(150, "Họ tên tối đa 150 ký tự"),
  email: z.string().trim().pipe(z.email("Email không hợp lệ")),
  phoneNumber: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại")
    .max(30, "Số điện thoại tối đa 30 ký tự")
    .regex(
      /^[+\d\s().-]+$/,
      "Số điện thoại chỉ gồm chữ số và các ký tự + ( ) . -"
    ),
  serviceName: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập dịch vụ")
    .max(200, "Tên dịch vụ tối đa 200 ký tự"),
})

export type CustomerFormValues = z.infer<typeof customerFormSchema>

// Customer submissions are shared; legacy creator metadata is optional.
export const customerSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phoneNumber: z.string(),
  serviceName: z.string(),
  status: z.string().optional(),
  priority: z.string().optional(),
  userId: z.string().optional(),
  createdAt: z.string().optional(),
})

export type Customer = z.infer<typeof customerSchema>
