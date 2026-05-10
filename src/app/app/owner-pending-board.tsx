"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, MessageSquareText } from "lucide-react";
import {
  attendanceStatusLabels,
  isAttendanceStatus,
  type AttendanceStatus,
} from "@/lib/attendance";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
import type { OperationsClass, OperationsStudent } from "@/app/app/operations-board";

type OwnerPendingBoardProps = {
  classes: OperationsClass[];
  records: AttendanceRecordItem[];
};

type PendingItem = {
  key: string;
  classId: string;
  className: string;
  student: OperationsStudent;
  status: AttendanceStatus;
  startTime: string;
  endTime: string;
  followupStatus: string | null;
  followupSentAt: string | null;
  teacherId: string | null;
};

const actionableStatuses: AttendanceStatus[] = ["needs_check", "late", "absent", "makeup", "pending"];

export function OwnerPendingBoard({ classes, records }: OwnerPendingBoardProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>("all");
  const [classFilter, setClassFilter] = useState("all");
  const items = useMemo(() => buildPendingItems(classes, records), [classes, records]);
  const filteredItems = items.filter((item) => {
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    const matchesClass = classFilter === "all" || item.classId === classFilter;

    return matchesStatus && matchesClass;
  });
  const unresolvedCount = items.filter((item) => item.followupStatus !== "sent").length;
  const sentCount = items.filter((item) => item.followupStatus === "sent").length;
  const absentOrLateCount = items.filter((item) =>
    ["absent", "late", "needs_check"].includes(item.status),
  ).length;

  if (items.length === 0) {
    return (
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF1F8] text-[#244B67]">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-950">오늘 연락할 학생 없음</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              결석, 지각, 확인 필요로 표시된 학생이 없습니다. 수업 후 체크만 진행하면 됩니다.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
      <div className="border-b border-stone-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-[#315C7C]">
              <AlertTriangle size={16} />
              오늘 연락할 학생
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
              아직 연락 전인 학생 {unresolvedCount}명
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              결석, 지각, 확인 필요로 체크된 학생입니다. 아래 수업 목록에서 학생을 선택해
              문자 초안을 확인하고 저장하면 됩니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <Metric label="확인할 학생" value={`${items.length}명`} />
            <Metric label="연락 전" value={`${unresolvedCount}명`} tone="danger" />
            <Metric label="연락 완료" value={`${sentCount}명`} tone="success" />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
            처리 상태
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | AttendanceStatus)}
              className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            >
              <option value="all">전체 보기</option>
              {actionableStatuses.map((status) => (
                <option key={status} value={status}>
                  {attendanceStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
            반 선택
            <select
              value={classFilter}
              onChange={(event) => setClassFilter(event.target.value)}
              className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            >
              <option value="all">전체 반</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="divide-y divide-stone-100">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => <PendingRow key={item.key} item={item} />)
        ) : (
          <p className="p-4 text-sm text-stone-500">선택한 조건에 맞는 학생이 없습니다.</p>
        )}
      </div>

      <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 text-xs leading-5 text-stone-500">
        결석·지각·확인 필요 학생 {absentOrLateCount}명을 먼저 확인하세요. 문자 저장과
        발송 기록이 남으면 연락 완료로 표시됩니다.
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
}) {
  const toneClass = {
    default: "text-stone-950",
    danger: "text-red-700",
    success: "text-[#315C7C]",
  }[tone];

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2">
      <p className="text-xs text-stone-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function PendingRow({ item }: { item: PendingItem }) {
  const isSent = item.followupStatus === "sent";

  return (
    <article className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-stone-950">{item.student.name}</p>
          <StatusBadge status={item.status} />
          <span
            className={[
              "rounded-md px-2 py-1 text-xs font-semibold",
              isSent ? "bg-[#EAF1F8] text-[#244B67]" : "bg-amber-50 text-amber-800",
            ].join(" ")}
          >
            {isSent ? "연락 완료" : item.followupStatus === "draft" ? "초안 저장" : "연락 전"}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {item.className} · {item.student.gradeLabel ?? "학년 미지정"} ·{" "}
          {item.student.maskedParentPhone}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <Clock3 size={13} />
          {item.startTime} - {item.endTime}
        </p>
      </div>
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <MessageSquareText size={15} />
        {item.followupSentAt ? formatKoreanTime(item.followupSentAt) : "아직 기록 없음"}
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const tone =
    status === "absent"
      ? "bg-red-50 text-red-700"
      : status === "late" || status === "needs_check"
        ? "bg-amber-50 text-amber-800"
        : "bg-violet-50 text-violet-800";

  return (
    <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>
      {attendanceStatusLabels[status]}
    </span>
  );
}

function buildPendingItems(
  classes: OperationsClass[],
  records: AttendanceRecordItem[],
): PendingItem[] {
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));

  return records
    .filter((record) => isAttendanceStatus(record.status))
    .filter((record) => actionableStatuses.includes(record.status as AttendanceStatus))
    .map((record) => {
      const classItem = classMap.get(record.classId);
      const student = classItem?.students.find((item) => item.id === record.studentId);

      if (!classItem || !student) {
        return null;
      }

      return {
        key: record.id,
        classId: classItem.id,
        className: classItem.name,
        student,
        status: record.status as AttendanceStatus,
        startTime: record.scheduledStartTime,
        endTime: record.scheduledEndTime,
        followupStatus: record.followupStatus,
        followupSentAt: record.followupSentAt,
        teacherId: record.teacherId,
      };
    })
    .filter((item): item is PendingItem => Boolean(item))
    .sort((a, b) => {
      if (a.followupStatus === "sent" && b.followupStatus !== "sent") {
        return 1;
      }

      if (a.followupStatus !== "sent" && b.followupStatus === "sent") {
        return -1;
      }

      return `${a.startTime}-${a.student.name}`.localeCompare(`${b.startTime}-${b.student.name}`);
    });
}

function formatKoreanTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
