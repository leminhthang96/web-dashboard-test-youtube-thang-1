import { taskMockData } from "./task-mock-data"

export const TASK_SEED_COUNT = 10
export const taskSeedData = taskMockData.slice(0, TASK_SEED_COUNT)

const sampleFields = ["id", "title", "status", "category", "priority"] as const
const samples = new Map(taskMockData.map((task) => [task.id, task]))

// Only untouched legacy fixtures qualify, never an unowned real task.
export function isLegacySeedTask(
  id: string,
  data: Record<string, unknown>
): boolean {
  const sample = samples.get(id)
  return Boolean(
    sample &&
      Object.keys(data).length === sampleFields.length &&
      sampleFields.every((field) => data[field] === sample[field])
  )
}
