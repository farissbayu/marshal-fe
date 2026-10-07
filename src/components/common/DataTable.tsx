import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Pagination } from "@/lib/schemas";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  className?: string;
  headerClassName?: string;
  hideOnMobile?: boolean;
  render: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: ReactNode;
  pagination?: Pagination & { onPageChange: (page: number) => void };
  caption?: string;
}

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, [role='button'], [role='radio'], [role='checkbox'], [role='menuitem'], [data-row-click-ignore]";

function isInteractiveTarget(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(INTERACTIVE_SELECTOR));
}

export function DataTable<T>({
  columns,
  data,
  getRowKey,
  onRowClick,
  loading,
  empty,
  pagination,
  caption,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        <SkeletonRows rows={6} cols={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface">
        {empty ?? <p className="px-4 py-8 text-center text-sm text-fg-muted">Tidak ada data.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-surface">
        <Table>
          {caption && <caption className="sr-only">{caption}</caption>}
          <TableHeader>
            <TableRow className="hover:bg-surface-2">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(col.headerClassName, col.hideOnMobile && "hidden md:table-cell")}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow
                key={getRowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={
                  onRowClick
                    ? (event) => {
                        if (isInteractiveTarget(event.target)) return;
                        onRowClick(row);
                      }
                    : undefined
                }
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                className={cn(onRowClick && "cursor-pointer")}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.key}
                    className={cn(col.className, col.hideOnMobile && "hidden md:table-cell")}
                  >
                    {col.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination && pagination.last_page > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-fg-muted">
          <span className="tabular">
            Halaman {pagination.page} / {pagination.last_page} · {pagination.total} item
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label="Halaman sebelumnya"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="size-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="secondary"
              aria-label="Halaman berikutnya"
              disabled={pagination.page >= pagination.last_page}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
