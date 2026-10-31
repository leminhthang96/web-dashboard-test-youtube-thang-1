import { z } from "zod"

// Legacy tasks without a creator remain readable, but cannot be edited/deleted.
export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  category: z.string(),
  priority: z.string(),
  createdBy: z.string().optional(),
  isSeedData: z.boolean().optional(),
})

export type Task = z.infer<typeof taskSchema>
