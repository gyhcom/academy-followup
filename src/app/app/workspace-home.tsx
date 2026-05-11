"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquareText,
  Settings,
} from "lucide-react";
import {
  attendanceStatusLabels,
  isAttendanceStatus,
  type AttendanceStatus,
} from "@/lib/attendance";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
import type { OperationsClass, OperationsStudent } from "@/app/app/operations-board";
import type { FollowupReason } from "@/lib/followup-templates";

type WorkspaceView = "home" | "operations" | "attendance" | "management";

type WorkspaceHomeProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  canManage: boolean;
  classes: OperationsClass[];
  selectedDate: string;
  records: AttendanceRecordItem[];
  loadState: {
    status: "idle" | "loading" | "error";
    error: string;
  };
  onDateChange: (date: string) => void;
  onNavigate: (view: WorkspaceView) => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
};

type FollowupFilter = "all" | "unsent" | "sent";

type HomeFollowupItem = {
  key: string;
  classId: string;
  className: string;
  student: OperationsStudent;
  status: AttendanceStatus;
  startTime: string;
  endTime: string;
  followupStatus: string | null;
  followupSentAt: string | null;
};

const actionableStatuses: AttendanceStatus[] = [
  "needs_check",
  "late",
  "absent",
  "makeup",
  "pending",
];

export function WorkspaceHome({
  academyName,
  teacherName,
  role,
  roleLabel,
  canManage,
  classes,
  selectedDate,
  records,
  loadState,
  onDateChange,
  onNavigate,
  onStudentSelect,
}: WorkspaceHomeProps) {
  const [expandedFilter, setExpandedFilter] = useState<FollowupFilter | null>(null);
  const followupItems = useMemo(
    () => buildHomeFollowupItems(classes, records),
    [classes, records],
  );
  const sentCount = followupItems.filter((item) => item.followupStatus === "sent").length;
  const unsentCount = followupItems.length - sentCount;
  const filteredItems = getFilteredItems(followupItems, expandedFilter);
  const copy = getRoleHomeCopy({ academyName, teacherName, role, roleLabel });
  const isToday = selectedDate === getTodayDate();

  function toggleFilter(filter: FollowupFilter) {
    setExpandedFilter((current) => (current === filter ? null : filter));
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <section className="border-b border-[#DED8CE] bg-transparent px-1 pb-4 sm:rounded-lg sm:border sm:border-stone-200 sm:bg-white sm:px-5 sm:py-5 sm:shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#315C7C]">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              {copy.title}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              {copy.description}
            </p>
          </div>

          <HomeDateControl
            value={selectedDate}
            onChange={onDateChange}
          />
        </div>
      </section>

      <section
        aria-label="주요 바로가기"
        className="overflow-hidden rounded-lg border border-[#DED8CE] bg-white shadow-sm"
      >
        <HomeActionButton
          icon={<MessageSquareText size={18} />}
          title="수업 후 문자 보내기"
          description="학생을 고르고 사유를 선택해 학부모 문자 초안을 확인합니다."
          onClick={() => onNavigate("operations")}
        />
        <HomeActionButton
          icon={<ClipboardCheck size={18} />}
          title="출석 체크하기"
          description="수업별 도착, 지각, 결석, 확인 필요 상태를 빠르게 기록합니다."
          onClick={() => onNavigate("attendance")}
        />
        {canManage ? (
          <HomeActionButton
            icon={<Settings size={18} />}
            title="학생/반 관리"
            description="학생, 반, 구성원, 문자 발송 정책을 관리합니다."
            onClick={() => onNavigate("management")}
          />
        ) : null}
      </section>

      <section className="overflow-hidden rounded-lg border border-[#DED8CE] bg-white shadow-sm">
        <div className="border-b border-stone-200 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#315C7C]">
              {isToday ? "오늘 요약" : "선택 날짜 요약"}
            </p>
            {loadState.status === "loading" ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-stone-100 px-2 py-1 text-xs font-semibold text-stone-500">
                <Loader2 size={13} className="animate-spin" />
                불러오는 중
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-lg font-semibold text-stone-950">
            {formatHomeDate(selectedDate)} 기준 운영 현황
          </h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            결석/지각 학생은 문자 저장 후 연락 완료로 표시됩니다.
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            숫자를 누르면 해당 학생 목록만 아래에 펼쳐집니다.
          </p>
          {loadState.status === "error" ? (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-900">
              {loadState.error}
            </div>
          ) : null}
        </div>

        {records.length === 0 && loadState.status !== "loading" ? (
          <HomeEmptyState selectedDate={selectedDate} onDateChange={onDateChange} />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2 border-b border-stone-200 p-4 sm:p-5">
              <SummaryButton
                label="확인할 학생"
                value={`${followupItems.length}명`}
                isActive={expandedFilter === "all"}
                onClick={() => toggleFilter("all")}
              />
              <SummaryButton
                label="연락 전"
                value={`${unsentCount}명`}
                tone="danger"
                isActive={expandedFilter === "unsent"}
                onClick={() => toggleFilter("unsent")}
              />
              <SummaryButton
                label="연락 완료"
                value={`${sentCount}명`}
                tone="success"
                isActive={expandedFilter === "sent"}
                onClick={() => toggleFilter("sent")}
              />
            </div>
          </>
        )}

        {expandedFilter && records.length > 0 ? (
          <div>
            <div className="flex items-center justify-between gap-3 bg-stone-50 px-4 py-3 text-sm sm:px-5">
              <p className="font-semibold text-stone-900">
                {filterLabel(expandedFilter)} {filteredItems.length}명
              </p>
              <button
                type="button"
                onClick={() => setExpandedFilter(null)}
                className="text-xs font-semibold text-stone-500 transition hover:text-stone-900"
              >
                접기
              </button>
            </div>
            <div className="divide-y divide-stone-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <HomeFollowupRow
                    key={item.key}
                    item={item}
                    onStudentSelect={onStudentSelect}
                  />
                ))
              ) : (
                <p className="p-4 text-sm leading-6 text-stone-600 sm:px-5">
                  선택한 조건에 해당하는 학생이 없습니다.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function HomeDateControl({
  value,
  onChange,
}: {
  value: string;
  onChange: (date: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const todayDate = getTodayDate();
  const yesterdayDate = shiftDate(todayDate, -1);
  const isTodaySelected = value === todayDate;
  const isYesterdaySelected = value === yesterdayDate;

  function openCalendar() {
    const input = inputRef.current;

    if (!input) {
      return;
    }

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // 브라우저별 date picker 제약이 있어 focus/click으로 보완합니다.
    }

    input.focus();
    input.click();
  }

  return (
    <div className="w-full rounded-lg border border-[#DED8CE] bg-[#F8FAFC] p-3">
      <span className="mb-2 block text-xs font-semibold text-stone-500">운영 기준 날짜</span>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] gap-2">
        <button
          type="button"
          aria-label="전날 운영 요약 보기"
          onClick={() => onChange(shiftDate(value, -1))}
          className="flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={openCalendar}
          className="flex min-h-11 w-full items-center gap-2 rounded-md border border-[#C9D6E2] bg-white px-3 text-left text-sm font-semibold text-stone-900 transition hover:border-[#315C7C] hover:bg-[#EAF1F8] focus:border-[#315C7C] focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          <CalendarDays size={17} className="shrink-0 text-[#315C7C]" />
          <span className="min-w-0 flex-1 truncate tabular-nums">
            {formatHomeDate(value)}
          </span>
          <span className="shrink-0 text-xs font-semibold text-[#315C7C]">
            달력 선택
          </span>
        </button>

        <button
          type="button"
          aria-label="다음날 운영 요약 보기"
          onClick={() => onChange(shiftDate(value, 1))}
          className="flex min-h-11 items-center justify-center rounded-md border border-stone-300 bg-white text-stone-600 transition hover:border-stone-400 hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={isYesterdaySelected}
          aria-pressed={isYesterdaySelected}
          onClick={() => onChange(yesterdayDate)}
          className={[
            "min-h-9 rounded-md border px-2 text-xs font-semibold transition",
            isYesterdaySelected
              ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#315C7C]"
              : "border-stone-200 bg-white text-stone-600 hover:border-[#C9D6E2] hover:bg-[#EAF1F8] hover:text-[#315C7C]",
          ].join(" ")}
        >
          어제 보기
        </button>
        <button
          type="button"
          disabled={isTodaySelected}
          aria-pressed={isTodaySelected}
          onClick={() => onChange(todayDate)}
          className={[
            "min-h-9 rounded-md border px-2 text-xs font-semibold transition",
            isTodaySelected
              ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#315C7C]"
              : "border-stone-200 bg-white text-stone-600 hover:border-[#C9D6E2] hover:bg-[#EAF1F8] hover:text-[#315C7C]",
          ].join(" ")}
        >
          오늘 보기
        </button>
      </div>
      <input
        ref={inputRef}
        type="date"
        value={value}
        onChange={(event) => {
          if (event.target.value) {
            onChange(event.target.value);
          }
        }}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

function HomeEmptyState({
  selectedDate,
  onDateChange,
}: {
  selectedDate: string;
  onDateChange: (date: string) => void;
}) {
  const isToday = selectedDate === getTodayDate();

  return (
    <div className="border-b border-stone-200 px-4 py-5 sm:px-5">
      <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-stone-950">
          이 날짜에는 출석/연락 기록이 없습니다.
        </p>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          {formatHomeDate(selectedDate)} 기준 기록이 아직 없어 학생 목록을 표시하지 않습니다.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
          {isToday ? (
            <button
              type="button"
              onClick={() => onDateChange(shiftDate(getTodayDate(), -1))}
              className="min-h-10 rounded-md border border-[#C9D6E2] bg-white px-4 text-sm font-semibold text-[#315C7C] transition hover:bg-[#EAF1F8]"
            >
              어제 기록 보기
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onDateChange(getTodayDate())}
            className="min-h-10 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
          >
            오늘로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeActionButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[4.75rem] w-full items-center gap-3 border-b border-stone-100 bg-white px-4 py-3 text-left transition last:border-b-0 hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#C9D6E2] sm:px-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#EAF1F8] text-[#315C7C]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-stone-950">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-stone-600">{description}</span>
      </span>
      <ArrowRight
        size={17}
        className="shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-[#315C7C]"
      />
    </button>
  );
}

function SummaryButton({
  label,
  value,
  tone = "default",
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  tone?: "default" | "danger" | "success";
  isActive: boolean;
  onClick: () => void;
}) {
  const valueClass = {
    default: "text-stone-950",
    danger: "text-red-700",
    success: "text-[#315C7C]",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "rounded-lg border px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
        isActive
          ? "border-[#315C7C] bg-[#EAF1F8]"
          : "border-stone-300 bg-white hover:border-[#315C7C] hover:bg-[#F8FAFC]",
      ].join(" ")}
    >
      <span className="block text-xs font-medium text-stone-500">{label}</span>
      <span className={`mt-1 block text-xl font-semibold ${valueClass}`}>{value}</span>
      <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#315C7C]">
        목록 보기
        <ArrowRight size={13} />
      </span>
    </button>
  );
}

function HomeFollowupRow({
  item,
  onStudentSelect,
}: {
  item: HomeFollowupItem;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
}) {
  const isSent = item.followupStatus === "sent";

  return (
    <article className="grid gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-stone-950">
            {item.student.name}
          </p>
          <span
            className={[
              "rounded-md px-2 py-1 text-xs font-semibold",
              statusTone(item.status),
            ].join(" ")}
          >
            {attendanceStatusLabels[item.status]}
          </span>
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
          {item.className} · {item.student.gradeLabel ?? "학년 미지정"}
        </p>
        <p className="mt-1 flex items-center gap-1 text-xs text-stone-500">
          <Clock3 size={13} />
          {item.startTime} - {item.endTime}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() =>
            onStudentSelect({
              classId: item.classId,
              studentId: item.student.id,
              reason: followupReasonForStatus(item.status),
            })
          }
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#C9D6E2] bg-white px-3 text-xs font-semibold text-[#315C7C] transition hover:bg-[#EAF1F8] focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]"
        >
          문자 작성
          <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );
}

function getRoleHomeCopy({
  academyName,
  teacherName,
  role,
  roleLabel,
}: {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
}) {
  if (role === "teacher") {
    return {
      title: `${teacherName} 선생님, 오늘 수업을 확인하세요.`,
      description:
        "담당 반의 출석을 체크하고 수업 후 필요한 학부모 연락을 바로 이어갈 수 있습니다.",
    };
  }

  if (role === "assistant") {
    return {
      title: `${teacherName} 보조 선생님, 출석 체크부터 시작하세요.`,
      description:
        "담당 수업의 도착 여부와 확인 필요 학생을 먼저 정리하면 원장과 선생님이 바로 후속 연락을 할 수 있습니다.",
    };
  }

  return {
    title: "오늘 학원 운영 요약",
    description: `${teacherName} ${roleLabel}님이 ${academyName}의 출석, 연락, 학생 관리를 한곳에서 시작할 수 있습니다.`,
  };
}

function buildHomeFollowupItems(
  classes: OperationsClass[],
  records: AttendanceRecordItem[],
): HomeFollowupItem[] {
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
        className: classItem.name,
        classId: classItem.id,
        student,
        status: record.status as AttendanceStatus,
        startTime: record.scheduledStartTime,
        endTime: record.scheduledEndTime,
        followupStatus: record.followupStatus,
        followupSentAt: record.followupSentAt,
      };
    })
    .filter((item): item is HomeFollowupItem => Boolean(item))
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

function getFilteredItems(items: HomeFollowupItem[], filter: FollowupFilter | null) {
  if (filter === "unsent") {
    return items.filter((item) => item.followupStatus !== "sent");
  }

  if (filter === "sent") {
    return items.filter((item) => item.followupStatus === "sent");
  }

  return filter === "all" ? items : [];
}

function filterLabel(filter: FollowupFilter) {
  const labels: Record<FollowupFilter, string> = {
    all: "확인할 학생",
    unsent: "연락 전",
    sent: "연락 완료",
  };

  return labels[filter];
}

function statusTone(status: AttendanceStatus) {
  if (status === "absent") {
    return "bg-red-50 text-red-700";
  }

  if (status === "late" || status === "needs_check") {
    return "bg-amber-50 text-amber-800";
  }

  if (status === "pending") {
    return "bg-stone-100 text-stone-700";
  }

  return "bg-violet-50 text-violet-800";
}

function followupReasonForStatus(status: AttendanceStatus): FollowupReason {
  if (status === "late") {
    return "late";
  }

  if (status === "makeup") {
    return "makeup";
  }

  if (status === "needs_check") {
    return "consultation";
  }

  return "absence";
}

function formatHomeDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftDate(dateValue: string, amount: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  date.setDate(date.getDate() + amount);

  const nextYear = date.getFullYear();
  const nextMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  const nextDay = `${date.getDate()}`.padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}
