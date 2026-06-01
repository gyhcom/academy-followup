import { NextResponse } from "next/server";
import { canAccessAssignedClass } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/server/audit-log";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

const scheduleTypes = ["regular_class", "makeup", "external", "consultation"] as const;

type ScheduleType = (typeof scheduleTypes)[number];

type BulkScheduleRequest = {
  classId?: unknown;
  teacherId?: unknown;
  scheduleType?: unknown;
  dayOfWeek?: unknown;
  dayOfWeeks?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  subject?: unknown;
  title?: unknown;
  memo?: unknown;
};

type BulkSchedulePayload = {
  classId: string;
  teacherId: string | null;
  scheduleType: ScheduleType;
  dayOfWeeks: number[];
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
  memo: string | null;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type ClassRecord = {
  id: string;
  name: string;
  subject: string | null;
  teacher_id: string | null;
};

type StudentRecord = {
  id: string;
};

type ExistingScheduleRecord = {
  student_id: string;
  day_of_week: number;
};

export async function POST(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseBulkScheduleRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const { data: classItem, error: classError } = await workspace.admin
    .from("classes")
    .select("id, name, subject, teacher_id")
    .eq("id", parsedRequest.data.classId)
    .eq("academy_id", workspace.profile.academy_id)
    .maybeSingle<ClassRecord>();

  if (classError) {
    return NextResponse.json({ error: classError.message }, { status: 500 });
  }

  if (!classItem) {
    return NextResponse.json({ error: "반을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!canManageClassSchedule(workspace.profile.role, classItem.teacher_id, workspace.userId)) {
    return NextResponse.json(
      { error: "이 반의 스케줄을 일괄 등록할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const teacherCheck = await validateTeacher({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    teacherId: parsedRequest.data.teacherId,
  });

  if (!teacherCheck.ok) {
    return NextResponse.json({ error: teacherCheck.error }, { status: 400 });
  }

  const { data: students, error: studentsError } = await workspace.admin
    .from("students")
    .select("id")
    .eq("academy_id", workspace.profile.academy_id)
    .eq("class_id", classItem.id)
    .eq("status", "active")
    .returns<StudentRecord[]>();

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  if (!students || students.length === 0) {
    return NextResponse.json(
      { error: "이 반에 재원 학생이 없어 일괄 등록할 수 없습니다." },
      { status: 400 },
    );
  }

  const studentIds = students.map((student) => student.id);
  const { data: existingSchedules, error: existingError } = await workspace.admin
    .from("student_schedules")
    .select("student_id, day_of_week")
    .eq("academy_id", workspace.profile.academy_id)
    .eq("class_id", classItem.id)
    .eq("schedule_type", parsedRequest.data.scheduleType)
    .in("day_of_week", parsedRequest.data.dayOfWeeks)
    .eq("start_time", parsedRequest.data.startTime)
    .eq("end_time", parsedRequest.data.endTime)
    .eq("is_active", true)
    .is("schedule_date", null)
    .in("student_id", studentIds)
    .returns<ExistingScheduleRecord[]>();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const duplicateScheduleKeys = new Set(
    (existingSchedules ?? []).map((schedule) => scheduleKey(schedule.student_id, schedule.day_of_week)),
  );
  const insertTargets = students.flatMap((student) =>
    parsedRequest.data.dayOfWeeks
      .filter((dayOfWeek) => !duplicateScheduleKeys.has(scheduleKey(student.id, dayOfWeek)))
      .map((dayOfWeek) => ({ studentId: student.id, dayOfWeek })),
  );
  const totalTargets = students.length * parsedRequest.data.dayOfWeeks.length;
  const skippedCount = totalTargets - insertTargets.length;

  if (insertTargets.length === 0) {
    return NextResponse.json({
      totalStudents: students.length,
      totalTargets,
      insertedCount: 0,
      skippedCount,
      message: "선택한 요일 모두에 같은 시간의 활성 스케줄이 이미 등록되어 있습니다.",
    });
  }

  const { error: insertError } = await workspace.admin.from("student_schedules").insert(
    insertTargets.map((target) => ({
      academy_id: workspace.profile.academy_id,
      student_id: target.studentId,
      class_id: classItem.id,
      teacher_id: parsedRequest.data.teacherId || classItem.teacher_id,
      schedule_type: parsedRequest.data.scheduleType,
      schedule_date: null,
      day_of_week: target.dayOfWeek,
      start_time: parsedRequest.data.startTime,
      end_time: parsedRequest.data.endTime,
      subject: parsedRequest.data.subject || classItem.subject,
      title: parsedRequest.data.title,
      memo: parsedRequest.data.memo,
      is_active: true,
      source_followup_id: null,
    })),
  );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await writeAuditLog({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    actorUserId: workspace.userId,
    action: "schedule.bulk_create",
    entityType: "class",
    entityId: classItem.id,
    summary: `${classItem.name} 반 공통 수업 시간 ${insertTargets.length}건을 등록했습니다.`,
  });

  return NextResponse.json({
    totalStudents: students.length,
    totalTargets,
    dayCount: parsedRequest.data.dayOfWeeks.length,
    insertedCount: insertTargets.length,
    skippedCount,
    message: `${students.length}명 기준 ${parsedRequest.data.dayOfWeeks.length}개 요일 중 ${insertTargets.length}건을 등록했습니다. 중복 ${skippedCount}건은 건너뛰었습니다.`,
  });
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

async function parseBulkScheduleRequest(
  request: Request,
): Promise<{ ok: true; data: BulkSchedulePayload } | { ok: false; error: string }> {
  let body: BulkScheduleRequest;

  try {
    body = (await request.json()) as BulkScheduleRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const classId = optionalText(body.classId);

  if (!classId) {
    return { ok: false, error: "반 ID가 필요합니다." };
  }

  if (!isScheduleType(body.scheduleType)) {
    return { ok: false, error: "지원하지 않는 스케줄 유형입니다." };
  }

  const dayOfWeeks = parseDayOfWeeks(body.dayOfWeeks ?? body.dayOfWeek);

  if (dayOfWeeks.length === 0) {
    return { ok: false, error: "요일을 하나 이상 선택해 주세요." };
  }

  const startTime = parseTime(body.startTime);
  const endTime = parseTime(body.endTime);

  if (!startTime || !endTime) {
    return { ok: false, error: "시작 시간과 종료 시간을 HH:MM 형식으로 입력해 주세요." };
  }

  if (startTime >= endTime) {
    return { ok: false, error: "종료 시간은 시작 시간보다 늦어야 합니다." };
  }

  const title = optionalText(body.title);

  if (!title) {
    return { ok: false, error: "스케줄 제목이 필요합니다." };
  }

  if (title.length > 80) {
    return { ok: false, error: "스케줄 제목은 80자 이하로 입력해 주세요." };
  }

  const subject = optionalText(body.subject);
  const memo = optionalText(body.memo);

  if (subject && subject.length > 40) {
    return { ok: false, error: "과목은 40자 이하로 입력해 주세요." };
  }

  if (memo && memo.length > 300) {
    return { ok: false, error: "메모는 300자 이하로 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      classId,
      teacherId: optionalText(body.teacherId),
      scheduleType: body.scheduleType,
      dayOfWeeks,
      startTime,
      endTime,
      subject,
      title,
      memo,
    },
  };
}

async function validateTeacher({
  admin,
  academyId,
  teacherId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  teacherId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!teacherId) {
    return { ok: true };
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id")
    .eq("id", teacherId)
    .eq("academy_id", academyId)
    .maybeSingle<{ id: string }>();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "담당 선생님을 찾을 수 없습니다." };
  }

  return { ok: true };
}

function canManageClassSchedule(role: string, classTeacherId: string | null, userId: string) {
  return canAccessAssignedClass({ role, classTeacherId, userId });
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDayOfWeek(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isInteger(numberValue) || numberValue < 0 || numberValue > 6) {
    return null;
  }

  return numberValue;
}

function parseDayOfWeeks(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  const dayOfWeeks = values
    .map((item) => parseDayOfWeek(item))
    .filter((item): item is number => item !== null);

  return [...new Set(dayOfWeeks)].sort((a, b) => a - b);
}

function scheduleKey(studentId: string, dayOfWeek: number) {
  return `${studentId}:${dayOfWeek}`;
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

function isScheduleType(value: unknown): value is ScheduleType {
  return typeof value === "string" && scheduleTypes.includes(value as ScheduleType);
}
