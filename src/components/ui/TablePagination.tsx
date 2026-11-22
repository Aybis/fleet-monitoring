import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20],
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange?: (nextSize: number) => void;
  pageSizeOptions?: number[];
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = Math.min(totalItems, safePage * pageSize);

  const pageNumbers: number[] = [];
  const windowStart = Math.max(1, safePage - 2);
  const windowEnd = Math.min(totalPages, safePage + 2);
  for (let p = windowStart; p <= windowEnd; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3 text-xs">
      <div className="flex flex-wrap items-center gap-3 text-muted-foreground tabular-nums">
        <span>
          Showing <strong className="text-foreground">{start}</strong>–
          <strong className="text-foreground">{end}</strong> of{" "}
          <strong className="text-foreground">{totalItems}</strong>
        </span>

        {onPageSizeChange && (
          <label className="inline-flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="h-7 cursor-pointer rounded-lg border border-input bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Previous page"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Prev
        </button>

        {pageNumbers.map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={cn(
              "flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-lg px-2 text-xs font-bold tabular-nums transition-all",
              num === safePage
                ? "bg-red-600 text-white shadow-xs"
                : "border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {num}
          </button>
        ))}

        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Next page"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
