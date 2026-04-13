import { Skeleton } from "@/components/ui/skeleton";

export default function ApuracaoExcelLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-72" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-[320px] rounded-3xl" />
        <Skeleton className="h-[320px] rounded-3xl" />
      </div>
    </div>
  );
}
