import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  /** `undefined` means "still loading". */
  value: number | undefined;
  description: string;
}

export function StatCard({ icon: Icon, label, value, description }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <div className="flex size-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="size-[18px]" aria-hidden="true" />
        </div>
      </div>
      {value === undefined ? (
        <div role="status" aria-label={`Loading ${label}`} className="mt-2 h-9 w-16 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString("en-US")}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}
