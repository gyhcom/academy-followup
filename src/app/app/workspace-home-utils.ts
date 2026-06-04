import {
  attendanceStatusLabels,
  isAttendanceStatus,
  type AttendanceStatus,
} from "@/lib/attendance";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
import type { OperationsClass } from "@/app/app/operations-board";
import type { FollowupReason } from "@/lib/followup-templates";
import type {
  BlockedScheduleFilter,
  FollowupFilter,
  HomeCopy,
  HomeFollowupItem,
  HomeScheduleItem,
  HomeScheduleSummary,
} from "@/app/app/workspace-home-types";

const actionableStatuses: AttendanceStatus[] = [
  "needs_check",
  "late",
  "absent",
  "makeup",
  "pending",
];

export function getRoleHomeCopy({
  academyName,
  teacherName,
  role,
  roleLabel,
}: {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
}): HomeCopy {
  if (role === "teacher") {
    return {
      title: `${teacherName} 선생님, 오늘 담당 수업을 확인하세요.`,
      description: "담당 반 출석을 체크하고 필요한 학부모 연락을 바로 이어갈 수 있습니다.",
    };
  }

  if (role === "assistant") {
    return {
      title: `${teacherName} 보조 선생님, 출석 체크부터 시작하세요.`,
      description: "담당 수업의 도착 여부와 확인 필요 학생을 먼저 정리합니다.",
    };
  }

  return {
    title: "오늘 연락해야 할 학생을 먼저 처리하세요.",
    description: `${teacherName} ${roleLabel}님이 ${academyName}의 출석, 연락, 학생 관리를 한곳에서 시작할 수 있습니다.`,
  };
}

export function buildHomeFollowupItems(
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

export function filterScheduleItemsForDate(items: HomeScheduleItem[], dateValue: string) {
  const dayOfWeek = getDayOfWeek(dateValue);

  return items
    .filter((item) => item.scheduleDate === dateValue || (!item.scheduleDate && item.dayOfWeek === dayOfWeek))
    .sort(
      (first, second) =>
        first.startTime.localeCompare(second.startTime) ||
        first.endTime.localeCompare(second.endTime) ||
        first.title.localeCompare(second.title, "ko"),
    );
}

export function buildHomeScheduleSummary(
  items: HomeScheduleItem[],
  dateValue: string,
): HomeScheduleSummary {
  const filteredItems = filterScheduleItemsForDate(items, dateValue);
  const manualExternalCount = filteredItems.filter((item) => item.kind === "manual_external_class").length;
  const sharedCount = filteredItems.filter((item) => item.isShared).length;
  const blockedScheduleCount = filteredItems.filter(isBlockedScheduleItem).length;

  return {
    academyScheduleCount: filteredItems.length - blockedScheduleCount,
    classSessionCount: filteredItems.filter((item) => item.kind === "class_session").length,
    manualExternalCount,
    sharedCount,
    blockedScheduleCount,
    totalCount: filteredItems.length,
  };
}

export function isBlockedScheduleItem(item: HomeScheduleItem) {
  return item.kind === "manual_external_class" || item.isShared || item.scheduleType === "external";
}

export function isAcademyScheduleItem(item: HomeScheduleItem) {
  return !isBlockedScheduleItem(item);
}

export function getBlockedScheduleCategory(
  item: HomeScheduleItem,
): Exclude<BlockedScheduleFilter, "all"> {
  if (item.isShared) {
    return "shared";
  }

  if (item.kind === "manual_external_class") {
    return "manual";
  }

  return "personal";
}

export function getBlockedScheduleCounts(items: HomeScheduleItem[]) {
  return items.reduce(
    (counts, item) => {
      counts[getBlockedScheduleCategory(item)] += 1;
      return counts;
    },
    { shared: 0, manual: 0, personal: 0 },
  );
}

export function getBlockedScheduleBadgeLabel(item: HomeScheduleItem) {
  const category = getBlockedScheduleCategory(item);

  if (category === "shared") {
    return "공유됨";
  }

  if (category === "manual") {
    return "직접등록";
  }

  return "개인";
}

export function getBlockedScheduleBadgeTone(item: HomeScheduleItem) {
  const category = getBlockedScheduleCategory(item);

  if (category === "shared") {
    return "bg-violet-100 text-violet-700 ring-violet-200";
  }

  if (category === "manual") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return "bg-stone-100 text-stone-700 ring-stone-200";
}

export function getBlockedScheduleDetail(item: HomeScheduleItem) {
  const category = getBlockedScheduleCategory(item);

  if (category === "shared") {
    return "연결 학원 수업 · 학원명 비공개";
  }

  if (category === "manual") {
    return `${item.subtitle || "타 학원 수업"} · 타 학원 수업`;
  }

  return `${item.subtitle || "개인/기타 일정"} · 개인 일정`;
}

export function getBlockedScheduleStudentName(item: HomeScheduleItem) {
  return item.studentName || item.title;
}

export function normalizeText(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function getFilteredItems(items: HomeFollowupItem[], filter: FollowupFilter | null) {
  if (filter === "unsent") {
    return items.filter((item) => item.followupStatus !== "sent");
  }

  if (filter === "sent") {
    return items.filter((item) => item.followupStatus === "sent");
  }

  return filter === "all" ? items : [];
}

export function filterLabel(filter: FollowupFilter) {
  const labels: Record<FollowupFilter, string> = {
    all: "오늘 문자 대상",
    unsent: "미발송",
    sent: "발송 완료",
  };

  return labels[filter];
}

export function statusTone(status: AttendanceStatus) {
  if (status === "absent") {
    return "bg-red-50 text-red-700 ring-red-100";
  }

  if (status === "late" || status === "needs_check") {
    return "bg-amber-50 text-amber-800 ring-amber-100";
  }

  if (status === "pending") {
    return "bg-slate-100 text-slate-700 ring-slate-200";
  }

  return "bg-violet-50 text-violet-800 ring-violet-100";
}

export function scheduleTypeLabel(scheduleType: string) {
  const labels: Record<string, string> = {
    regular_class: "출석 체크",
    makeup: "보강",
    external: "개인/기타",
    manual_external_class: "타 학원",
    consultation: "상담",
  };

  return labels[scheduleType] ?? scheduleType;
}

export function scheduleTypeTone(scheduleType: string) {
  const tones: Record<string, string> = {
    regular_class: "bg-blue-50 text-blue-700 ring-blue-100",
    makeup: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    external: "bg-slate-100 text-slate-700 ring-slate-200",
    manual_external_class: "bg-slate-100 text-slate-700 ring-slate-200",
    consultation: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return tones[scheduleType] ?? "bg-slate-100 text-slate-700 ring-slate-200";
}

export function followupReasonForStatus(status: AttendanceStatus): FollowupReason {
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

export function formatHomeDate(dateValue: string) {
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

export function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDayOfWeek(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  return date.getDay();
}

export function shiftDate(dateValue: string, amount: number) {
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

export { attendanceStatusLabels };
