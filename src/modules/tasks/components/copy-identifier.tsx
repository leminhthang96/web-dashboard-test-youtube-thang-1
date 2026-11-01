"use client"

import { Copy } from "lucide-react"
import { toast } from "sonner"

interface CopyIdentifierProps {
  value: string
  label: string
}

export function CopyIdentifier({ value, label }: CopyIdentifierProps) {
  const display =
    value.length > 16 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(`Đã sao chép ${label.toLowerCase()}.`)
    } catch {
      toast.error("Không thể sao chép. Vui lòng cho phép truy cập clipboard.")
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={`${label}: ${value} — Bấm để sao chép`}
      aria-label={`Sao chép ${label}: ${value}`}
      className="inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md border border-transparent px-1.5 py-1 text-muted-foreground transition-colors hover:border-border hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="truncate font-mono text-xs">{display}</span>
      <Copy className="size-3 shrink-0" aria-hidden="true" />
    </button>
  )
}
