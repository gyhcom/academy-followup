"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Clock3, History } from "lucide-react";
import { followupReasons } from "@/lib/followup-templates";

export type FollowupHistoryItem = {
  id: string;
  reason: string;
  messageBody: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export type FollowupHistoryState = {
  studentId: string;
  status: "idle" | "loading" | "ready" | "error";
  items: FollowupHistoryItem[];
  error: string;
};

type StudentFollowupHistoryProps = {
  selectedStudentName: string | undefined;
  history: FollowupHistoryState;
  compact?: boolean;
};

export function StudentFollowupHistory({
  selectedStudentName,
  history,
  compact = false,
}: StudentFollowupHistoryProps) {
  return (
    <section
      aria-labelledby="student-followup-history-title"
      className={[
        compact
          ? "border border-[#B8C9D0] bg-[#F4F8F9]"
          : "rounded-lg border border-stone-200 bg-white",
      ].join(" ")}
    >
      <div className={compact ? "border-b border-[#C9D7DC] px-3 py-2.5" : "border-b border-stone-200 px-4 py-3"}>
        <div className="flex items-center gap-2">
          <History className="text-[#007A7C]" size={compact ? 16 : 18} />
          <h2
            id="student-followup-history-title"
            className="text-sm font-bold text-[var(--clinic-text)]"
          >
            최근 연락 기록
          </h2>
          {history.status === "ready" ? (
            <span className="ml-auto border border-[#C9D7DC] bg-[#EDF3F5] px-2 py-0.5 text-xs font-bold text-[var(--clinic-muted)]">
              {history.items.length}건
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-[var(--clinic-muted)]">
          {selectedStudentName
            ? `${selectedStudentName} 학생에게 남긴 최근 연락 기록입니다.`
            : "학생을 선택하면 연락 기록이 표시됩니다."}
        </p>
      </div>

      <div>
        {history.status === "loading" ? (
          <div className={compact ? "p-3" : "p-4"}>
            <HistoryMessage icon={<Clock3 size={17} />} message="최근 기록을 불러오는 중입니다." />
          </div>
        ) : null}

        {history.status === "error" ? (
          <div className={compact ? "p-3" : "p-4"}>
            <HistoryMessage
              icon={<AlertCircle size={17} />}
              message={history.error || "최근 기록을 불러오지 못했습니다."}
              tone="error"
            />
          </div>
        ) : null}

        {history.status === "ready" && history.items.length === 0 ? (
          <div className={compact ? "p-3" : "p-4"}>
            <HistoryMessage
              icon={<History size={17} />}
              message="아직 저장된 연락 기록이 없습니다."
            />
          </div>
        ) : null}

        {history.status === "ready" && history.items.length > 0 ? (
          <ol className={compact ? "divide-y divide-[#C9D7DC]" : "divide-y divide-stone-100"}>
            {history.items.map((item) => (
              <li key={item.id} className={compact ? "border-l-2 border-l-transparent px-3 py-2.5" : "border-l-2 border-l-transparent px-4 py-3"}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-stone-950">
                        {reasonLabel(item.reason)}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatHistoryTime(item.sentAt ?? item.createdAt)}
                    </p>
                  </div>
                  {item.status === "sent" ? (
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#315C7C]" size={17} />
                  ) : item.status === "failed" ? (
                    <AlertCircle className="mt-0.5 shrink-0 text-red-700" size={17} />
                  ) : (
                    <Clock3 className="mt-0.5 shrink-0 text-stone-400" size={17} />
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone-600">
                  {item.messageBody}
                </p>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}

function HistoryMessage({
  icon,
  message,
  tone = "default",
}: {
  icon: ReactNode;
  message: string;
  tone?: "default" | "error";
}) {
  return (
    <div
      className={[
        "flex items-start gap-2 rounded-md border p-3 text-sm leading-6",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-stone-200 bg-stone-50 text-stone-600",
      ].join(" ")}
    >
      <span className="mt-0.5 shrink-0">{icon}</span>
      <p>{message}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "border-amber-200 bg-amber-50 text-amber-800",
    sent: "border-[#C9D6E2] bg-[#EAF1F8] text-[#315C7C]",
    failed: "border-red-200 bg-red-50 text-red-800",
  };

  return (
    <span
      className={[
        "rounded-md border px-2 py-0.5 text-xs font-semibold",
        styles[status] ?? "border-stone-200 bg-stone-50 text-stone-600",
      ].join(" ")}
    >
      {statusLabel(status)}
    </span>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: "기록 저장",
    sent: "발송 완료",
    failed: "실패",
  };

  return labels[status] ?? status;
}

function reasonLabel(reason: string) {
  return followupReasons.find((item) => item.id === reason)?.label ?? reason;
}

function formatHistoryTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
