import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FilterToolbarProps = {
  searchPlaceholder: string;
  defaultQuery?: string;
  statusOptions?: Array<{ value: string; label: string }>;
  defaultStatus?: string;
};

export function FilterToolbar({
  searchPlaceholder,
  defaultQuery,
  statusOptions,
  defaultStatus,
}: FilterToolbarProps) {
  return (
    <form className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[minmax(0,1fr)_180px_auto]">
      <Input
        name="query"
        defaultValue={defaultQuery}
        placeholder={searchPlaceholder}
      />
      {statusOptions ? (
        <select
          name="status"
          defaultValue={defaultStatus}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs outline-hidden focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="status" value="" />
      )}
      <div className="flex gap-2">
        <Button type="submit" className="w-full md:w-auto">
          Filtrar
        </Button>
      </div>
    </form>
  );
}
