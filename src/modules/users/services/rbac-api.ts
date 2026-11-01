export async function rbacRequest<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Không thể thực hiện thao tác phân quyền."
    )
  }
  return result.data as T
}
