import { NextResponse } from "next/server";
import { canAccessAssignedClass } from "@/lib/permissions";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

const scheduleTypes = ["regular_class", "makeup", "external", "consultation"] as const;

type ScheduleType = (typeof scheduleTypes)[number];

type ScheduleRequest = {
  scheduleId?: unknown;
  studentId?: unknown;
  classId?: unknown;
  teacherId?: unknown;
  scheduleType?: unknown;
  scheduleDate?: unknown;
  dayOfWeek?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  subject?: unknown;
  title?: unknown;
  memo?: unknown;
  isActive?: unknown;
  sourceFollowupId?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type SchedulePayload = {
  scheduleId?: string;
  studentId: string;
  classId: string | null;
  teacherId: string | null;
  scheduleType: ScheduleType;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
  memo: string | null;
  isActive: boolean;
  sourceFollowupId: string | null;
};

type ScheduleRecord = {
  id: string;
  student_id: string;
  class_id: string | null;
  teacher_id: string | null;
  schedule_type: string;
  schedule_date: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string | null;
  title: string;
  memo: string | null;
  is_active: boolean;
  source_followup_id: string | null;
};

export async function POST(request: Request) {
  const parsedRequest = await parseScheduleRequest(request, { requireScheduleId: false });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const validation = await validateScheduleRelations({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    payload: parsedRequest.data,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (!canManageSchedule(workspace.profile.role, validation.classTeacherId, workspace.userId)) {
    return NextResponse.json(
      { error: "이 학생의 스케줄을 등록할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const duplicate = await findDuplicateOneOffSchedule({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    payload: parsedRequest.data,
  });

  if (!duplicate.ok) {
    return NextResponse.json({ error: duplicate.error }, { status: 500 });
  }

  if (duplicate.data) {
    return NextResponse.json(
      { error: "이미 같은 날짜와 시간의 보강 일정이 등록되어 있습니다." },
      { status: 409 },
    );
  }

  const { data, error } = await workspace.admin
    .from("student_schedules")
    .insert({
      academy_id: workspace.profile.academy_id,
      student_id: parsedRequest.data.studentId,
      class_id: parsedRequest.data.classId,
      teacher_id: parsedRequest.data.teacherId,
      schedule_type: parsedRequest.data.scheduleType,
      schedule_date: parsedRequest.data.scheduleDate,
      day_of_week: parsedRequest.data.dayOfWeek,
      start_time: parsedRequest.data.startTime,
      end_time: parsedRequest.data.endTime,
      subject: parsedRequest.data.subject,
      title: parsedRequest.data.title,
      memo: parsedRequest.data.memo,
      is_active: parsedRequest.data.isActive,
      source_followup_id: parsedRequest.data.sourceFollowupId,
    })
    .select(
      "id, student_id, class_id, teacher_id, schedule_type, schedule_date, day_of_week, start_time, end_time, subject, title, memo, is_active, source_followup_id",
    )
    .single<ScheduleRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ schedule: toScheduleResponse(data) });
}

export async function PATCH(request: Request) {
  const parsedRequest = await parseScheduleRequest(request, { requireScheduleId: true });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const validation = await validateScheduleRelations({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    payload: parsedRequest.data,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  if (!canManageSchedule(workspace.profile.role, validation.classTeacherId, workspace.userId)) {
    return NextResponse.json(
      { error: "이 학생의 스케줄을 수정할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data, error } = await workspace.admin
    .from("student_schedules")
    .update({
      student_id: parsedRequest.data.studentId,
      class_id: parsedRequest.data.classId,
      teacher_id: parsedRequest.data.teacherId,
      schedule_type: parsedRequest.data.scheduleType,
      schedule_date: parsedRequest.data.scheduleDate,
      day_of_week: parsedRequest.data.dayOfWeek,
      start_time: parsedRequest.data.startTime,
      end_time: parsedRequest.data.endTime,
      subject: parsedRequest.data.subject,
      title: parsedRequest.data.title,
      memo: parsedRequest.data.memo,
      is_active: parsedRequest.data.isActive,
      source_followup_id: parsedRequest.data.sourceFollowupId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsedRequest.data.scheduleId)
    .eq("academy_id", workspace.profile.academy_id)
    .select(
      "id, student_id, class_id, teacher_id, schedule_type, schedule_date, day_of_week, start_time, end_time, subject, title, memo, is_active, source_followup_id",
    )
    .maybeSingle<ScheduleRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "수정할 스케줄을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ schedule: toScheduleResponse(data) });
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

async function parseScheduleRequest(
  request: Request,
  { requireScheduleId }: { requireScheduleId: boolean },
): Promise<{ ok: true; data: SchedulePayload } | { ok: false; error: string }> {
  let body: ScheduleRequest;

  try {
    body = (await request.json()) as ScheduleRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const scheduleId = optionalText(body.scheduleId);

  if (requireScheduleId && !scheduleId) {
    return { ok: false, error: "수정할 스케줄 ID가 필요합니다." };
  }

  const studentId = optionalText(body.studentId);

  if (!studentId) {
    return { ok: false, error: "학생 ID가 필요합니다." };
  }

  if (!isScheduleType(body.scheduleType)) {
    return { ok: false, error: "지원하지 않는 스케줄 유형입니다." };
  }

  const rawScheduleDate = optionalText(body.scheduleDate);
  const scheduleDate = rawScheduleDate ? parseDate(rawScheduleDate) : null;

  if (rawScheduleDate && !scheduleDate) {
    return { ok: false, error: "스케줄 날짜는 YYYY-MM-DD 형식으로 입력해 주세요." };
  }

  const dayOfWeek = parseDayOfWeek(body.dayOfWeek);

  if (dayOfWeek === null) {
    return { ok: false, error: "요일은 0부터 6 사이로 입력해 주세요." };
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
      scheduleId: scheduleId ?? undefined,
      studentId,
      classId: optionalText(body.classId),
      teacherId: optionalText(body.teacherId),
      scheduleType: body.scheduleType,
      scheduleDate,
      dayOfWeek,
      startTime,
      endTime,
      subject,
      title,
      memo,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      sourceFollowupId: optionalText(body.sourceFollowupId),
    },
  };
}

async function validateScheduleRelations({
  admin,
  academyId,
  payload,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  payload: SchedulePayload;
}): Promise<{ ok: true; classTeacherId: string | null } | { ok: false; error: string }> {
  const [studentResult, classResult, teacherResult, followupResult] = await Promise.all([
    admin
      .from("students")
      .select("id")
      .eq("id", payload.studentId)
      .eq("academy_id", academyId)
      .maybeSingle<{ id: string }>(),
    payload.classId
      ? admin
          .from("classes")
          .select("id, teacher_id")
          .eq("id", payload.classId)
          .eq("academy_id", academyId)
          .maybeSingle<{ id: string; teacher_id: string | null }>()
      : Promise.resolve({ data: { id: "", teacher_id: null }, error: null }),
    payload.teacherId
      ? admin
          .from("profiles")
          .select("id")
          .eq("id", payload.teacherId)
          .eq("academy_id", academyId)
          .maybeSingle<{ id: string }>()
      : Promise.resolve({ data: { id: "" }, error: null }),
    payload.sourceFollowupId
      ? admin
          .from("followups")
          .select("id, student_id")
          .eq("id", payload.sourceFollowupId)
          .eq("academy_id", academyId)
          .maybeSingle<{ id: string; student_id: string }>()
      : Promise.resolve({ data: { id: "", student_id: payload.studentId }, error: null }),
  ]);

  if (studentResult.error) {
    return { ok: false, error: studentResult.error.message };
  }

  if (!studentResult.data) {
    return { ok: false, error: "학생을 찾을 수 없습니다." };
  }

  if (classResult.error) {
    return { ok: false, error: classResult.error.message };
  }

  if (payload.classId && !classResult.data) {
    return { ok: false, error: "연결할 반을 찾을 수 없습니다." };
  }

  if (teacherResult.error) {
    return { ok: false, error: teacherResult.error.message };
  }

  if (payload.teacherId && !teacherResult.data) {
    return { ok: false, error: "담당 선생님을 찾을 수 없습니다." };
  }

  if (followupResult.error) {
    return { ok: false, error: followupResult.error.message };
  }

  if (payload.sourceFollowupId && !followupResult.data) {
    return { ok: false, error: "연결할 팔로업 기록을 찾을 수 없습니다." };
  }

  if (
    payload.sourceFollowupId &&
    followupResult.data &&
    followupResult.data.student_id !== payload.studentId
  ) {
    return { ok: false, error: "팔로업 기록과 학생 정보가 일치하지 않습니다." };
  }

  return { ok: true, classTeacherId: classResult.data?.teacher_id ?? null };
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

function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

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

function isScheduleType(value: unknown): value is ScheduleType {
  return typeof value === "string" && scheduleTypes.includes(value as ScheduleType);
}

function canManageSchedule(role: string, classTeacherId: string | null, userId: string) {
  return canAccessAssignedClass({ role, classTeacherId, userId });
}

async function findDuplicateOneOffSchedule({
  admin,
  academyId,
  payload,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  payload: SchedulePayload;
}): Promise<{ ok: true; data: { id: string } | null } | { ok: false; error: string }> {
  if (!payload.scheduleDate || payload.scheduleType !== "makeup" || !payload.isActive) {
    return { ok: true, data: null };
  }

  const { data, error } = await admin
    .from("student_schedules")
    .select("id")
    .eq("academy_id", academyId)
    .eq("student_id", payload.studentId)
    .eq("schedule_type", payload.scheduleType)
    .eq("schedule_date", payload.scheduleDate)
    .eq("start_time", payload.startTime)
    .eq("end_time", payload.endTime)
    .eq("is_active", true)
    .maybeSingle<{ id: string }>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data ?? null };
}

function toScheduleResponse(schedule: ScheduleRecord) {
  return {
    id: schedule.id,
    studentId: schedule.student_id,
    classId: schedule.class_id,
    teacherId: schedule.teacher_id,
    scheduleType: schedule.schedule_type,
    scheduleDate: schedule.schedule_date,
    dayOfWeek: schedule.day_of_week,
    startTime: schedule.start_time.slice(0, 5),
    endTime: schedule.end_time.slice(0, 5),
    subject: schedule.subject,
    title: schedule.title,
    memo: schedule.memo,
    isActive: schedule.is_active,
    sourceFollowupId: schedule.source_followup_id,
  };
}
