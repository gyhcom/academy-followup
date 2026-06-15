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
    <article className="min-w-0 rounded-md border border-[#C7D6DD] bg-white p-3.5 shadow-[0_1px_2px_rgba(13,38,48,0.08)] sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--clinic-muted)]">{label}</p>
          <p className="mt-2 text-xl font-bold text-[var(--clinic-text)] sm:text-2xl">{value}</p>
        </div>
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#EAF6F5] text-[var(--clinic-primary)] sm:size-10">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--clinic-muted)]">{detail}</p>
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
  actionLabel?: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 bg-transparent sm:rounded-md sm:border sm:border-[#C7D6DD] sm:bg-white sm:p-5 sm:shadow-[0_1px_2px_rgba(13,38,48,0.08)]">
      <div className="flex items-center justify-between gap-3 pb-3 sm:border-b sm:border-[#D6E0E5] sm:pb-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-[var(--clinic-text)] sm:text-base">{title}</h3>
          <p className="mt-1 hidden text-sm leading-6 text-[var(--clinic-muted)] sm:block">{description}</p>
        </div>
        {actionLabel ? (
          <button
            type="button"
            disabled={!onAction}
            onClick={onAction}
            className={[
              "flex min-h-9 w-auto shrink-0 items-center justify-center gap-1 rounded-md border px-3 text-xs font-semibold sm:min-h-10",
              onAction
                ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white shadow-sm transition hover:border-[var(--clinic-primary-dark)] hover:bg-[var(--clinic-primary-dark)]"
                : "cursor-not-allowed border-[#D6E0E5] bg-[#F4F8F9] text-[var(--clinic-muted)]",
            ].join(" ")}
          >
            {actionIcon}
            {actionLabel}
            <ChevronRight size={14} />
          </button>
        ) : null}
      </div>
      <div className="min-w-0 pt-0 sm:pt-4">{children}</div>
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
    active: "bg-[#EAF7F2] text-[#0F766E]",
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
