import { getMessageLengthMetrics } from "@/lib/message-length";
import { canManageAcademy } from "@/lib/permissions";
import type { RouteWorkspaceContext } from "@/lib/server/route-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const reportRanges = ["today", "7d", "month"] as const;
export const reportExportTypes = ["students", "attendance", "messages", "audit"] as const;

export type ReportRange = (typeof reportRanges)[number];
export type ReportExportType = (typeof reportExportTypes)[number];

export type ReportSummary = {
  range: ReportRange;
  label: string;
  attendance: {
    total: number;
    present: number;
    late: number;
    absent: number;
    needsCheck: number;
    makeup: number;
    pending: number;
  };
  messages: {
    followups: number;
    logs: number;
    dryRun: number;
    sent: number;
    failed: number;
    sms: number;
    lms: number;
    overLimit: number;
  };
  students: {
    active: number;
    classes: number;
    missingSchedule: number;
  };
  audit: {
    count: number;
  };
};

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

type AttendanceSummaryRecord = {
  status: string;
};

type FollowupSummaryRecord = {
  message_body: string;
};

type MessageLogSummaryRecord = {
  status: string;
};

type StudentSummaryRecord = {
  id: string;
  status: string;
};

type ScheduleSummaryRecord = {
  student_id: string;
  is_active: boolean;
};

export function isReportRange(value: string | null): value is ReportRange {
  return reportRanges.includes(value as ReportRange);
}

export function isReportExportType(value: string | null): value is ReportExportType {
  return reportExportTypes.includes(value as ReportExportType);
}

export function assertReportAccess(workspace: RouteWorkspaceContext) {
  if (!canManageAcademy(workspace.profile.role)) {
    return {
      ok: false as const,
      status: 403,
      error: "운영 리포트는 원장/관리자만 볼 수 있습니다.",
    };
  }

  return { ok: true as const };
}

export async function getReportSummary({
  admin,
  academyId,
  range,
}: {
  admin: SupabaseAdmin;
  academyId: string;
  range: ReportRange;
}): Promise<{ ok: true; summary: ReportSummary } | { ok: false; error: string }> {
  const reportRange = getRangeBounds(range);

  const [
    attendanceResult,
    followupsResult,
    messageLogsResult,
    studentsResult,
    classesResult,
    schedulesResult,
    auditResult,
  ] = await Promise.all([
    admin
      .from("attendance_records")
      .select("status")
      .eq("academy_id", academyId)
      .gte("attendance_date", reportRange.startDate)
      .lte("attendance_date", reportRange.endDate)
      .returns<AttendanceSummaryRecord[]>(),
    admin
      .from("followups")
      .select("message_body")
      .eq("academy_id", academyId)
      .gte("created_at", reportRange.startDateTime)
      .lt("created_at", reportRange.endDateTime)
      .returns<FollowupSummaryRecord[]>(),
    admin
      .from("message_logs")
      .select("status")
      .eq("academy_id", academyId)
      .gte("created_at", reportRange.startDateTime)
      .lt("created_at", reportRange.endDateTime)
      .returns<MessageLogSummaryRecord[]>(),
    admin
      .from("students")
      .select("id, status")
      .eq("academy_id", academyId)
      .returns<StudentSummaryRecord[]>(),
    admin
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId),
    admin
      .from("student_schedules")
      .select("student_id, is_active")
      .eq("academy_id", academyId)
      .eq("is_active", true)
      .returns<ScheduleSummaryRecord[]>(),
    admin
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("academy_id", academyId)
      .gte("created_at", reportRange.startDateTime)
      .lt("created_at", reportRange.endDateTime),
  ]);

  const firstError =
    attendanceResult.error ??
    followupsResult.error ??
    messageLogsResult.error ??
    studentsResult.error ??
    classesResult.error ??
    schedulesResult.error ??
    auditResult.error;

  if (firstError) {
    return { ok: false, error: firstError.message };
  }

  const attendance = countAttendance(attendanceResult.data ?? []);
  const messages = countMessages({
    followups: followupsResult.data ?? [],
    logs: messageLogsResult.data ?? [],
  });
  const activeStudents = (studentsResult.data ?? []).filter(
    (student) => student.status === "active",
  );
  const scheduleStudentIds = new Set(
    (schedulesResult.data ?? []).map((schedule) => schedule.student_id),
  );

  return {
    ok: true,
    summary: {
      range,
      label: reportRange.label,
      attendance,
      messages,
      students: {
        active: activeStudents.length,
        classes: classesResult.count ?? 0,
        missingSchedule: activeStudents.filter(
          (student) => !scheduleStudentIds.has(student.id),
        ).length,
      },
      audit: {
        count: auditResult.count ?? 0,
      },
    },
  };
}

export function buildCsvResponse({
  csv,
  filename,
}: {
  csv: string;
  filename: string;
}) {
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

export function maskPhone(phone: string | null | undefined) {
  if (!phone) {
    return "";
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.length < 7) {
    return phone;
  }

  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

export function getRangeBounds(range: ReportRange) {
  const today = getTodayDateInTimeZone("Asia/Seoul");
  const startDate =
    range === "today"
      ? today
      : range === "7d"
        ? shiftDate(today, -6)
        : `${today.slice(0, 8)}01`;
  const endDate = today;
  const exclusiveEndDate =
    range === "month"
      ? shiftDate(getNextMonthDate(startDate), 0)
      : shiftDate(endDate, 1);

  return {
    startDate,
    endDate,
    startDateTime: toKoreaStartIso(startDate),
    endDateTime: toKoreaStartIso(exclusiveEndDate),
    label: range === "today" ? "오늘" : range === "7d" ? "최근 7일" : "이번 달",
  };
}

function countAttendance(records: AttendanceSummaryRecord[]): ReportSummary["attendance"] {
  const counts = {
    total: records.length,
    present: 0,
    late: 0,
    absent: 0,
    needsCheck: 0,
    makeup: 0,
    pending: 0,
  };

  records.forEach((record) => {
    if (record.status === "present") {
      counts.present += 1;
    } else if (record.status === "late") {
      counts.late += 1;
    } else if (record.status === "absent") {
      counts.absent += 1;
    } else if (record.status === "needs_check") {
      counts.needsCheck += 1;
    } else if (record.status === "makeup") {
      counts.makeup += 1;
    } else if (record.status === "pending") {
      counts.pending += 1;
    }
  });

  return counts;
}

function countMessages({
  followups,
  logs,
}: {
  followups: FollowupSummaryRecord[];
  logs: MessageLogSummaryRecord[];
}): ReportSummary["messages"] {
  const transportCounts = followups.reduce(
    (counts, followup) => {
      const metrics = getMessageLengthMetrics(followup.message_body);

      if (metrics.isOverLimit) {
        counts.overLimit += 1;
      } else if (metrics.transportType === "lms") {
        counts.lms += 1;
      } else {
        counts.sms += 1;
      }

      return counts;
    },
    { sms: 0, lms: 0, overLimit: 0 },
  );

  return {
    followups: followups.length,
    logs: logs.length,
    dryRun: logs.filter((log) => log.status === "dry_run").length,
    sent: logs.filter((log) => log.status === "sent").length,
    failed: logs.filter((log) => log.status === "failed").length,
    ...transportCounts,
  };
}

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function getTodayDateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}

function shiftDate(dateValue: string, offsetDays: number) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + offsetDays);

  const shiftedYear = date.getFullYear();
  const shiftedMonth = `${date.getMonth() + 1}`.padStart(2, "0");
  const shiftedDay = `${date.getDate()}`.padStart(2, "0");

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function getNextMonthDate(dateValue: string) {
  const [year, month] = dateValue.split("-").map(Number);
  const date = new Date(year, month, 1);
  const nextYear = date.getFullYear();
  const nextMonth = `${date.getMonth() + 1}`.padStart(2, "0");

  return `${nextYear}-${nextMonth}-01`;
}

function toKoreaStartIso(dateValue: string) {
  return new Date(`${dateValue}T00:00:00+09:00`).toISOString();
}
