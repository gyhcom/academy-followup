import { NextResponse } from "next/server";
import { isAttendanceStatus, type AttendanceStatus } from "@/lib/attendance";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type ClassRecord = {
  id: string;
  teacher_id: string | null;
};

type StudentRecord = {
  id: string;
  class_id: string | null;
  status: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  class_id: string;
  teacher_id: string | null;
  attendance_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  checked_at: string | null;
  arrived_at: string | null;
  note: string | null;
  followup_id: string | null;
  followups: Array<{
    status: string;
    sent_at: string | null;
  }> | null;
};

type AttendanceRequest = {
  studentId?: unknown;
  classId?: unknown;
  attendanceDate?: unknown;
  scheduledStartTime?: unknown;
  scheduledEndTime?: unknown;
  status?: unknown;
  note?: unknown;
};

type AttendancePayload = {
  studentId: string;
  classId: string;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: AttendanceStatus;
  note: string | null;
};

export async function GET(request: Request) {
  const attendanceDate = parseDate(new URL(request.url).searchParams.get("date"));

  if (!attendanceDate) {
    return NextResponse.json({ error: "조회 날짜가 필요합니다." }, { status: 400 });
  }

  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  let query = workspace.admin
    .from("attendance_records")
    .select(
      "id, student_id, class_id, teacher_id, attendance_date, scheduled_start_time, scheduled_end_time, status, checked_at, arrived_at, note, followup_id, followups(status, sent_at)",
    )
    .eq("academy_id", workspace.profile.academy_id)
    .eq("attendance_date", attendanceDate)
    .order("scheduled_start_time", { ascending: true });

  if (!canViewAllClasses(workspace.profile.role)) {
    const { data: classes, error: classesError } = await workspace.admin
      .from("classes")
      .select("id")
      .eq("academy_id", workspace.profile.academy_id)
      .eq("teacher_id", workspace.userId)
      .returns<{ id: string }[]>();

    if (classesError) {
      return NextResponse.json({ error: classesError.message }, { status: 500 });
    }

    const classIds = (classes ?? []).map((classItem) => classItem.id);

    if (classIds.length === 0) {
      return NextResponse.json({ records: [] });
    }

    query = query.in("class_id", classIds);
  }

  const { data, error } = await query.returns<AttendanceRecord[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ records: (data ?? []).map(toAttendanceResponse) });
}

export async function PATCH(request: Request) {
  const parsedRequest = await parseAttendanceRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const validation = await validateAttendanceRelations({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    payload: parsedRequest.data,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: validation.status });
  }

  if (!canEditClassAttendance(workspace.profile.role, validation.classItem, workspace.userId)) {
    return NextResponse.json(
      { error: "이 반의 출석부를 수정할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const checkedAt = parsedRequest.data.status === "pending" ? null : new Date().toISOString();
  const arrivedAt = hasArrivedStatus(parsedRequest.data.status) ? checkedAt : null;

  const { data, error } = await workspace.admin
    .from("attendance_records")
    .upsert(
      {
        academy_id: workspace.profile.academy_id,
        student_id: parsedRequest.data.studentId,
        class_id: parsedRequest.data.classId,
        teacher_id: workspace.userId,
        attendance_date: parsedRequest.data.attendanceDate,
        scheduled_start_time: parsedRequest.data.scheduledStartTime,
        scheduled_end_time: parsedRequest.data.scheduledEndTime,
        status: parsedRequest.data.status,
        checked_at: checkedAt,
        arrived_at: arrivedAt,
        note: parsedRequest.data.note,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict:
          "academy_id,student_id,class_id,attendance_date,scheduled_start_time,scheduled_end_time",
      },
    )
    .select(
      "id, student_id, class_id, teacher_id, attendance_date, scheduled_start_time, scheduled_end_time, status, checked_at, arrived_at, note, followup_id, followups(status, sent_at)",
    )
    .single<AttendanceRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ record: toAttendanceResponse(data) });
}

async function getAuthorizedWorkspace(): Promise<
  | {
      ok: true;
      admin: ReturnType<typeof createSupabaseAdminClient>;
      profile: ProfileRecord;
      userId: string;
    }
  | { ok: false; status: number; error: string }
> {
  if (!hasSupabaseServerEnv()) {
    return { ok: false, status: 500, error: "Supabase 세션 환경변수가 설정되지 않았습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  if (!hasSupabaseAdminEnv()) {
    return { ok: false, status: 500, error: "서버 전용 Supabase 키가 설정되지 않았습니다." };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!profile) {
    return { ok: false, status: 403, error: "학원 워크스페이스 연결이 필요합니다." };
  }

  return { ok: true, admin, profile, userId: user.id };
}

async function parseAttendanceRequest(
  request: Request,
): Promise<{ ok: true; data: AttendancePayload } | { ok: false; error: string }> {
  let body: AttendanceRequest;

  try {
    body = (await request.json()) as AttendanceRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const studentId = optionalText(body.studentId);
  const classId = optionalText(body.classId);
  const attendanceDate = parseDate(body.attendanceDate);
  const scheduledStartTime = parseTime(body.scheduledStartTime);
  const scheduledEndTime = parseTime(body.scheduledEndTime);

  if (!studentId) {
    return { ok: false, error: "학생 ID가 필요합니다." };
  }

  if (!classId) {
    return { ok: false, error: "반 ID가 필요합니다." };
  }

  if (!attendanceDate) {
    return { ok: false, error: "출석 날짜는 YYYY-MM-DD 형식으로 입력해 주세요." };
  }

  if (!scheduledStartTime || !scheduledEndTime) {
    return { ok: false, error: "수업 시간은 HH:MM 형식으로 입력해 주세요." };
  }

  if (scheduledStartTime >= scheduledEndTime) {
    return { ok: false, error: "종료 시간은 시작 시간보다 늦어야 합니다." };
  }

  if (!isAttendanceStatus(body.status)) {
    return { ok: false, error: "지원하지 않는 출석 상태입니다." };
  }

  const note = optionalText(body.note);

  if (note && note.length > 300) {
    return { ok: false, error: "메모는 300자 이하로 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      studentId,
      classId,
      attendanceDate,
      scheduledStartTime,
      scheduledEndTime,
      status: body.status,
      note,
    },
  };
}

async function validateAttendanceRelations({
  admin,
  academyId,
  payload,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  payload: AttendancePayload;
}): Promise<
  | { ok: true; classItem: ClassRecord; student: StudentRecord }
  | { ok: false; status: number; error: string }
> {
  const [classResult, studentResult] = await Promise.all([
    admin
      .from("classes")
      .select("id, teacher_id")
      .eq("id", payload.classId)
      .eq("academy_id", academyId)
      .maybeSingle<ClassRecord>(),
    admin
      .from("students")
      .select("id, class_id, status")
      .eq("id", payload.studentId)
      .eq("academy_id", academyId)
      .maybeSingle<StudentRecord>(),
  ]);

  if (classResult.error) {
    return { ok: false, status: 500, error: classResult.error.message };
  }

  if (studentResult.error) {
    return { ok: false, status: 500, error: studentResult.error.message };
  }

  if (!classResult.data) {
    return { ok: false, status: 404, error: "반을 찾을 수 없습니다." };
  }

  if (!studentResult.data) {
    return { ok: false, status: 404, error: "학생을 찾을 수 없습니다." };
  }

  if (studentResult.data.class_id !== classResult.data.id) {
    return { ok: false, status: 400, error: "학생이 선택한 반에 속해 있지 않습니다." };
  }

  if (studentResult.data.status !== "active") {
    return { ok: false, status: 403, error: "비활성 학생은 출석부를 수정할 수 없습니다." };
  }

  return { ok: true, classItem: classResult.data, student: studentResult.data };
}

function canViewAllClasses(role: string) {
  return role === "owner" || role === "manager";
}

function canEditClassAttendance(role: string, classItem: ClassRecord, userId: string) {
  return canViewAllClasses(role) || classItem.teacher_id === userId;
}

function hasArrivedStatus(status: AttendanceStatus) {
  return status === "present" || status === "late" || status === "makeup";
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return value;
}

function parseTime(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function toAttendanceResponse(record: AttendanceRecord) {
  const followup = record.followups?.[0] ?? null;

  return {
    id: record.id,
    studentId: record.student_id,
    classId: record.class_id,
    teacherId: record.teacher_id,
    attendanceDate: record.attendance_date,
    scheduledStartTime: record.scheduled_start_time.slice(0, 5),
    scheduledEndTime: record.scheduled_end_time.slice(0, 5),
    status: record.status,
    checkedAt: record.checked_at,
    arrivedAt: record.arrived_at,
    note: record.note,
    followupId: record.followup_id,
    followupStatus: followup?.status ?? null,
    followupSentAt: followup?.sent_at ?? null,
  };
}
