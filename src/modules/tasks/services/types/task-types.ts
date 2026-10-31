import { z } from "zod"

// Legacy tasks require a matching creator/reporter to be visible.
export const taskReporterSchema = z
  .string()
  .trim()
  .max(128, "UID người nhận không được quá 128 ký tự.")

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  category: z.string(),
  priority: z.string(),
  createdBy: z.string().optional(),
  reporter: taskReporterSchema.optional(),
  isSeedData: z.boolean().optional(),
})

export type Task = z.infer<typeof taskSchema>
