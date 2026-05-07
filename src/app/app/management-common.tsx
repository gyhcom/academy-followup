import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </article>
  );
}

export function ManagementPanel({
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <h3 className="text-base font-semibold text-stone-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <button
          type="button"
          disabled={!onAction}
          onClick={onAction}
          className={[
            "flex min-h-10 shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-semibold",
            onAction
              ? "border-stone-300 bg-white text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
              : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-500",
          ].join(" ")}
        >
          {actionIcon}
          {actionLabel}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}


export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    active: "재원",
    paused: "휴원",
    left: "퇴원",
  };
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800",
    paused: "bg-amber-50 text-amber-800",
    left: "bg-stone-200 text-stone-700",
  };

  return (
    <span
      className={[
        "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
        styles[status] ?? "bg-stone-200 text-stone-700",
      ].join(" ")}
    >
      {labels[status] ?? status}
    </span>
  );
}

