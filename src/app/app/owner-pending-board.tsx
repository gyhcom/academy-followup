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
            <p className="text-sm font-semibold text-stone-950">오늘 미처리 학생 없음</p>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              현재 출석 기록 기준으로 원장이 바로 확인해야 할 학생이 없습니다.
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
              원장 오늘 미처리 보드
            </p>
            <h2 className="mt-2 text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
              연락 누락 가능 학생 {unresolvedCount}명
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              결석, 지각, 확인 필요, 보강 예정 학생의 연락 처리 상태를 한곳에서 봅니다.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-80">
            <Metric label="대상" value={`${items.length}명`} />
            <Metric label="미처리" value={`${unresolvedCount}명`} tone="danger" />
            <Metric label="완료" value={`${sentCount}명`} tone="success" />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
            상태
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | AttendanceStatus)}
              className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-900 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            >
              <option value="all">전체 상태</option>
              {actionableStatuses.map((status) => (
                <option key={status} value={status}>
                  {attendanceStatusLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-semibold text-stone-600">
            반
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
        결석·지각·확인 필요 합계 {absentOrLateCount}명입니다. 발송 완료 여부는 팔로업
        기록의 상태를 기준으로 표시합니다.
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
            {isSent ? "발송 완료" : item.followupStatus === "draft" ? "초안 생성" : "미처리"}
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
        {item.followupSentAt ? formatKoreanTime(item.followupSentAt) : "처리 시간 없음"}
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
