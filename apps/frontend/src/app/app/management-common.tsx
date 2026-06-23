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
    <article className="console-row grid min-w-0 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 sm:px-4">
      <div className="flex size-9 shrink-0 items-center justify-center border border-[#d7dbe0] bg-[#f6f7f8] text-[#494d5a]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold text-[var(--clinic-text)]">{label}</p>
        <p className="mt-0.5 truncate text-xs leading-5 text-[var(--clinic-muted)]">{detail}</p>
      </div>
      <p className="shrink-0 text-xl font-black tabular-nums text-[var(--clinic-text)]">{value}</p>
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
    <section className="console-surface min-w-0 bg-transparent sm:bg-[#F4F8F9]">
      <div className="console-header-row flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-extrabold text-[var(--clinic-text)] sm:text-base">{title}</h3>
          <p className="mt-1 hidden max-w-3xl text-sm leading-6 text-[var(--clinic-muted)] sm:block">{description}</p>
        </div>
        {actionLabel ? (
          <button
            type="button"
            disabled={!onAction}
            onClick={onAction}
            className={[
              "flex min-h-9 w-auto shrink-0 items-center justify-center gap-1 rounded-sm border px-3 text-xs font-semibold sm:min-h-10",
              onAction
                ? "border-[#c9cdd2] bg-[#fffefa] text-[#2f3437] transition hover:border-[#aeb5bf] hover:bg-[#f6f7f8]"
                : "cursor-not-allowed border-[#D6E0E5] bg-[#F4F8F9] text-[var(--clinic-muted)]",
            ].join(" ")}
          >
            {actionIcon}
            {actionLabel}
            <ChevronRight size={14} />
          </button>
        ) : null}
      </div>
      <div className="min-w-0 p-0 sm:p-4">{children}</div>
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
    active:
      "border-[var(--console-status-success-border)] bg-[var(--console-status-success-bg)] text-[var(--console-status-success-text)]",
    paused:
      "border-[var(--console-status-pending-border)] bg-[var(--console-status-pending-bg)] text-[var(--console-status-pending-text)]",
    left:
      "border-[#AEBBC1] bg-[#E5EBEE] text-[#405763]",
  };

  return (
    <span
      className={[
        "shrink-0 border px-2 py-1 text-xs font-bold",
        styles[status] ?? "border-[#AEBBC1] bg-[#E5EBEE] text-[#405763]",
      ].join(" ")}
    >
      {labels[status] ?? status}
    </span>
  );
}
