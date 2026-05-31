import { NextResponse } from "next/server";
import {
  assertReportAccess,
  buildCsvResponse,
  getRangeBounds,
  isReportExportType,
  isReportRange,
  maskPhone,
  toCsv,
  type ReportExportType,
} from "@/lib/server/reports";
import { getRouteWorkspace } from "@/lib/server/route-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

type StudentExportRecord = {
  name: string;
  school_name: string | null;
  grade_label: string | null;
  parent_name: string | null;
  parent_phone: string;
  student_phone: string | null;
  status: string;
  schedule_share_consent_confirmed: boolean;
  classes: { name: string | null } | null;
};

type AttendanceExportRecord = {
  attendance_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  note: string | null;
  checked_at: string | null;
  arrived_at: string | null;
  students: { name: string | null } | null;
  classes: { name: string | null } | null;
};

type FollowupExportRecord = {
  id: string;
  reason: string;
  message_body: string;
  recipient_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  students: { name: string | null; parent_phone: string | null; student_phone: string | null } | null;
  classes: { name: string | null } | null;
};

type MessageLogExportRecord = {
  followup_id: string | null;
  provider: string;
  recipient_type: string;
  recipient_phone: string;
  status: string;
  error_message: string | null;
  created_at: string;
};

type AuditExportRecord = {
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  summary: string;
  created_at: string;
};

type MemberRecord = {
  id: string;
  name: string;
};

export async function GET(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const access = assertReportAccess(workspaceResult.workspace);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const params = new URL(request.url).searchParams;
  const typeParam = params.get("type");

  if (!isReportExportType(typeParam)) {
    return NextResponse.json({ error: "내보내기 종류가 올바르지 않습니다." }, { status: 400 });
  }

  const rangeParam = params.get("range");
  const range = isReportRange(rangeParam) ? rangeParam : "today";
  const includePrivate = params.get("includePrivate") === "true";
  const { admin, profile } = workspaceResult.workspace;
  const csvResult = await buildExportCsv({
    admin,
    academyId: profile.academy_id,
    type: typeParam,
    range,
    includePrivate,
  });

  if (!csvResult.ok) {
    return NextResponse.json({ error: csvResult.error }, { status: 500 });
  }

  return buildCsvResponse(csvResult);
}

async function buildExportCsv({
  admin,
  academyId,
  type,
  range,
  includePrivate,
}: {
  admin: SupabaseAdmin;
  academyId: string;
  type: ReportExportType;
  range: "today" | "7d" | "month";
  includePrivate: boolean;
}): Promise<{ ok: true; csv: string; filename: string } | { ok: false; error: string }> {
  if (type === "students") {
    return exportStudents({ admin, academyId, includePrivate });
  }

  if (type === "attendance") {
    return exportAttendance({ admin, academyId, range });
  }

  if (type === "messages") {
    return exportMessages({ admin, academyId, range, includePrivate });
  }

  return exportAudit({ admin, academyId, range });
}

async function exportStudents({
  admin,
  academyId,
  includePrivate,
}: {
  admin: SupabaseAdmin;
  academyId: string;
  includePrivate: boolean;
}) {
  const { data, error } = await admin
    .from("students")
    .select(
      "name, school_name, grade_label, parent_name, parent_phone, student_phone, status, schedule_share_consent_confirmed, classes(name)",
    )
    .eq("academy_id", academyId)
    .order("name")
    .returns<StudentExportRecord[]>();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    filename: `academy-students-${todayForFilename()}.csv`,
    csv: toCsv([
      ["학생명", "학교", "학년", "반", "보호자명", "학부모 연락처", "학생 연락처", "공유 동의", "상태"],
      ...(data ?? []).map((student) => [
        student.name,
        student.school_name ?? "",
        student.grade_label ?? "",
        student.classes?.name ?? "",
        student.parent_name ?? "",
        includePrivate ? student.parent_phone : maskPhone(student.parent_phone),
        includePrivate ? (student.student_phone ?? "") : maskPhone(student.student_phone),
        student.schedule_share_consent_confirmed ? "동의 확인" : "미확인",
        student.status,
      ]),
    ]),
  };
}

async function exportAttendance({
  admin,
  academyId,
  range,
}: {
  admin: SupabaseAdmin;
  academyId: string;
  range: "today" | "7d" | "month";
}) {
  const bounds = getRangeBounds(range);
  const { data, error } = await admin
    .from("attendance_records")
    .select(
      "attendance_date, scheduled_start_time, scheduled_end_time, status, note, checked_at, arrived_at, students(name), classes(name)",
    )
    .eq("academy_id", academyId)
    .gte("attendance_date", bounds.startDate)
    .lte("attendance_date", bounds.endDate)
    .order("attendance_date", { ascending: false })
    .order("scheduled_start_time", { ascending: true })
    .returns<AttendanceExportRecord[]>();

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return {
    ok: true as const,
    filename: `academy-attendance-${todayForFilename()}.csv`,
    csv: toCsv([
      ["날짜", "시간", "반", "학생명", "상태", "도착시각", "체크시각", "메모"],
      ...(data ?? []).map((record) => [
        record.attendance_date,
        `${record.scheduled_start_time.slice(0, 5)}-${record.scheduled_end_time.slice(0, 5)}`,
        record.classes?.name ?? "",
        record.students?.name ?? "",
        record.status,
        formatTimestamp(record.arrived_at),
        formatTimestamp(record.checked_at),
        record.note ?? "",
      ]),
    ]),
  };
}

async function exportMessages({
  admin,
  academyId,
  range,
  includePrivate,
}: {
  admin: SupabaseAdmin;
  academyId: string;
  range: "today" | "7d" | "month";
  includePrivate: boolean;
}) {
  const bounds = getRangeBounds(range);
  const { data: followups, error: followupError } = await admin
    .from("followups")
    .select(
      "id, reason, message_body, recipient_type, status, sent_at, created_at, students(name, parent_phone, student_phone), classes(name)",
    )
    .eq("academy_id", academyId)
    .gte("created_at", bounds.startDateTime)
    .lt("created_at", bounds.endDateTime)
    .order("created_at", { ascending: false })
    .returns<FollowupExportRecord[]>();

  if (followupError) {
    return { ok: false as const, error: followupError.message };
  }

  const followupIds = (followups ?? []).map((followup) => followup.id);
  const logsByFollowupId = new Map<string, MessageLogExportRecord[]>();

  if (followupIds.length > 0) {
    const { data: logs, error: logError } = await admin
      .from("message_logs")
      .select("followup_id, provider, recipient_type, recipient_phone, status, error_message, created_at")
      .eq("academy_id", academyId)
      .in("followup_id", followupIds)
      .returns<MessageLogExportRecord[]>();

    if (logError) {
      return { ok: false as const, error: logError.message };
    }

    (logs ?? []).forEach((log) => {
      if (!log.followup_id) {
        return;
      }

      logsByFollowupId.set(log.followup_id, [
        ...(logsByFollowupId.get(log.followup_id) ?? []),
        log,
      ]);
    });
  }

  return {
    ok: true as const,
    filename: `academy-messages-${todayForFilename()}.csv`,
    csv: toCsv([
      ["생성일", "학생명", "반", "사유", "수신자", "상태", "발송로그", "수신번호", "본문"],
      ...(followups ?? []).map((followup) => {
        const logs = logsByFollowupId.get(followup.id) ?? [];
        const firstLog = logs[0] ?? null;
        const phone =
          firstLog?.recipient_phone ??
          (followup.recipient_type === "student"
            ? followup.students?.student_phone
            : followup.students?.parent_phone);

        return [
          formatTimestamp(followup.created_at),
          followup.students?.name ?? "",
          followup.classes?.name ?? "",
          followup.reason,
          followup.recipient_type,
          followup.status,
          logs.map((log) => log.status).join(" / "),
          includePrivate ? (phone ?? "") : maskPhone(phone),
          followup.message_body,
        ];
      }),
    ]),
  };
}

async function exportAudit({
  admin,
  academyId,
  range,
}: {
  admin: SupabaseAdmin;
  academyId: string;
  range: "today" | "7d" | "month";
}) {
  const bounds = getRangeBounds(range);
  const [{ data: logs, error: logError }, { data: members, error: memberError }] =
    await Promise.all([
      admin
        .from("audit_logs")
        .select("actor_user_id, action, entity_type, entity_id, summary, created_at")
        .eq("academy_id", academyId)
        .gte("created_at", bounds.startDateTime)
        .lt("created_at", bounds.endDateTime)
        .order("created_at", { ascending: false })
        .returns<AuditExportRecord[]>(),
      admin
        .from("profiles")
        .select("id, name")
        .eq("academy_id", academyId)
        .returns<MemberRecord[]>(),
    ]);

  if (logError || memberError) {
    return { ok: false as const, error: logError?.message ?? memberError?.message ?? "감사 로그를 불러오지 못했습니다." };
  }

  const memberNameById = new Map((members ?? []).map((member) => [member.id, member.name]));

  return {
    ok: true as const,
    filename: `academy-audit-${todayForFilename()}.csv`,
    csv: toCsv([
      ["일시", "작업자", "액션", "대상", "대상 ID", "요약"],
      ...(logs ?? []).map((log) => [
        formatTimestamp(log.created_at),
        log.actor_user_id ? (memberNameById.get(log.actor_user_id) ?? "시스템") : "시스템",
        log.action,
        log.entity_type,
        log.entity_id ?? "",
        log.summary,
      ]),
    ]),
  };
}

function todayForFilename() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
