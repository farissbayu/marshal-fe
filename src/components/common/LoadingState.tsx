import { Card, CardContent } from "@/components/ui/card";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";

export function LoadingTable({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <SkeletonRows rows={rows} cols={cols} />
    </div>
  );
}

export function LoadingCards({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      role="status"
      aria-busy="true"
      aria-label="Memuat data"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-2 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function LoadingDetail() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Memuat detail">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
