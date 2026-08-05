"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  page: number
  totalPages: number
  total: number
  perPage?: number
  onPageChange: (page: number) => void
  disabled?: boolean
  className?: string
}

/** Compact window so controls fit one line on phones: first, nearby, last. */
function buildPageItems(current: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const pages = new Set<number>([1, totalPages, current])
  if (current > 1) pages.add(current - 1)
  if (current < totalPages) pages.add(current + 1)

  // Near the start/end, fill a small contiguous block so we don't show too many ellipses
  if (current <= 2) {
    pages.add(2)
    pages.add(3)
  }
  if (current >= totalPages - 1) {
    pages.add(totalPages - 1)
    pages.add(totalPages - 2)
  }

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b)

  const items: Array<number | "ellipsis"> = []
  let prev = 0
  for (const p of sorted) {
    if (prev && p - prev > 1) items.push("ellipsis")
    items.push(p)
    prev = p
  }
  return items
}

export function Pagination({
  page,
  totalPages,
  total,
  perPage = 10,
  onPageChange,
  disabled = false,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1 || total <= 0) return null

  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * perPage + 1
  const end = Math.min(current * perPage, total)
  const items = buildPageItems(current, totalPages)

  return (
    <div className={`mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 ${className}`}>
      <p className="text-sm text-gray-500 text-center sm:text-left shrink-0">
        Showing <span className="font-medium text-gray-700">{start}</span>
        {"–"}
        <span className="font-medium text-gray-700">{end}</span>
        {" of "}
        <span className="font-medium text-gray-700">{total}</span> studies
      </p>

      <div className="flex items-center gap-0.5 sm:gap-1 flex-nowrap justify-center w-full sm:w-auto overflow-x-auto">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || current <= 1}
          onClick={() => onPageChange(current - 1)}
          className="cursor-pointer h-8 w-8 sm:h-9 sm:w-auto sm:min-w-9 p-0 sm:px-3 shrink-0"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">Prev</span>
        </Button>

        {items.map((item, idx) =>
          item === "ellipsis" ? (
            <span
              key={`e-${idx}`}
              className="px-1 sm:px-2 text-gray-400 select-none shrink-0 text-sm"
              aria-hidden
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === current ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => onPageChange(item)}
              className={`h-8 w-8 sm:h-9 sm:min-w-9 p-0 shrink-0 cursor-pointer text-sm ${
                item === current
                  ? "bg-[rgba(38,116,186,1)] hover:bg-[rgba(38,116,186,0.9)] text-white border-[rgba(38,116,186,1)]"
                  : ""
              }`}
              aria-current={item === current ? "page" : undefined}
              aria-label={`Page ${item}`}
            >
              {item}
            </Button>
          )
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || current >= totalPages}
          onClick={() => onPageChange(current + 1)}
          className="cursor-pointer h-8 w-8 sm:h-9 sm:w-auto sm:min-w-9 p-0 sm:px-3 shrink-0"
          aria-label="Next page"
        >
          <span className="hidden sm:inline mr-1">Next</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
