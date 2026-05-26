import { NextResponse } from "next/server";
import { canManageAcademy } from "@/lib/permissions";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type ExternalClassRequest = {
  action?: unknown;
  studentId?: unknown;
  enrollmentId?: unknown;
  academyName?: unknown;
  classTitle?: unknown;
  subject?: unknown;
  scheduleDate?: unknown;
  dayOfWeek?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  memo?: unknown;
};

type ExternalAcademyRecord = {
  id: string;
  name: string;
  is_active: boolean;
};

type ExternalAcademyClassRecord = {
  id: string;
};

type ExternalEnrollmentRecord = {
  id: string;
  is_active: boolean;
};

export async function POST(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  if (!canManageAcademy(workspace.profile.role)) {
    return NextResponse.json(
      { error: "타 학원 수업은 원장/관리자만 등록할 수 있습니다." },
      { status: 403 },
    );
  }

  let body: ExternalClassRequest;

  try {
    body = (await request.json()) as ExternalClassRequest;
  } catch {
    return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const action = optionalText(body.action);

  if (action === "create_class_and_enroll") {
    return createClassAndEnroll({ body, workspace });
  }

  if (action === "deactivate_enrollment") {
    return deactivateEnrollment({ body, workspace });
  }

  return NextResponse.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}

async function createClassAndEnroll({
  body,
  workspace,
}: {
  body: ExternalClassRequest;
  workspace: AuthorizedWorkspace;
}) {
  const studentId = optionalText(body.studentId);
  const academyName = optionalText(body.academyName);
  const classTitle = optionalText(body.classTitle);
  const subject = optionalText(body.subject);
  const memo = optionalText(body.memo);
  const rawScheduleDate = optionalText(body.scheduleDate);
  const scheduleDate = rawScheduleDate ? parseDate(rawScheduleDate) : null;
  const dayOfWeek = parseDayOfWeek(body.dayOfWeek);
  const startTime = parseTime(body.startTime);
  const endTime = parseTime(body.endTime);

  if (!studentId) {
    return NextResponse.json({ error: "학생 ID가 필요합니다." }, { status: 400 });
  }

  if (!academyName) {
    return NextResponse.json({ error: "타 학원명을 입력해 주세요." }, { status: 400 });
  }

  if (!classTitle) {
    return NextResponse.json({ error: "타 학원 수업명을 입력해 주세요." }, { status: 400 });
  }

  if (academyName.length > 80 || classTitle.length > 80) {
    return NextResponse.json(
      { error: "학원명과 수업명은 80자 이하로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (subject && subject.length > 40) {
    return NextResponse.json({ error: "과목은 40자 이하로 입력해 주세요." }, { status: 400 });
  }

  if (memo && memo.length > 300) {
    return NextResponse.json({ error: "메모는 300자 이하로 입력해 주세요." }, { status: 400 });
  }

  if (rawScheduleDate && !scheduleDate) {
    return NextResponse.json(
      { error: "날짜 지정 일정은 YYYY-MM-DD 형식으로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (dayOfWeek === null) {
    return NextResponse.json({ error: "요일을 선택해 주세요." }, { status: 400 });
  }

  if (!startTime || !endTime) {
    return NextResponse.json(
      { error: "시작 시간과 종료 시간을 HH:MM 형식으로 입력해 주세요." },
      { status: 400 },
    );
  }

  if (startTime >= endTime) {
    return NextResponse.json({ error: "종료 시간은 시작 시간보다 늦어야 합니다." }, { status: 400 });
  }

  const studentValidation = await validateStudent({
    workspace,
    studentId,
  });

  if (!studentValidation.ok) {
    return NextResponse.json(
      { error: studentValidation.error },
      { status: studentValidation.status },
    );
  }

  const externalAcademy = await findOrCreateExternalAcademy({
    workspace,
    academyName,
  });

  if (!externalAcademy.ok) {
    return NextResponse.json({ error: externalAcademy.error }, { status: 500 });
  }

  const externalClass = await findOrCreateExternalClass({
    workspace,
    externalAcademyId: externalAcademy.data.id,
    classTitle,
    subject,
    scheduleDate,
    dayOfWeek,
    startTime,
    endTime,
    memo,
  });

  if (!externalClass.ok) {
    return NextResponse.json({ error: externalClass.error }, { status: 500 });
  }

  const enrollment = await findOrCreateEnrollment({
    workspace,
    studentId,
    externalClassId: externalClass.data.id,
  });

  if (!enrollment.ok) {
    return NextResponse.json({ error: enrollment.error }, { status: 500 });
  }

  return NextResponse.json({
    message: "타 학원 수업을 학생에게 연결했습니다.",
    enrollmentId: enrollment.data.id,
  });
}

async function deactivateEnrollment({
  body,
  workspace,
}: {
  body: ExternalClassRequest;
  workspace: AuthorizedWorkspace;
}) {
  const enrollmentId = optionalText(body.enrollmentId);

  if (!enrollmentId) {
    return NextResponse.json({ error: "해제할 타 학원 수업 연결 ID가 필요합니다." }, { status: 400 });
  }

  const { data, error } = await workspace.admin
    .from("student_external_class_enrollments")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", enrollmentId)
    .eq("academy_id", workspace.profile.academy_id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "해제할 타 학원 수업 연결을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ message: "타 학원 수업 연결을 해제했습니다." });
}

type AuthorizedWorkspace = {
  ok: true;
  admin: ReturnType<typeof createSupabaseAdminClient>;
  profile: ProfileRecord;
  userId: string;
};

async function getAuthorizedWorkspace(): Promise<
  | AuthorizedWorkspace
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

async function validateStudent({
  workspace,
  studentId,
}: {
  workspace: AuthorizedWorkspace;
  studentId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await workspace.admin
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("academy_id", workspace.profile.academy_id)
    .maybeSingle<{ id: string }>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false, status: 404, error: "선택한 학생을 찾을 수 없습니다." };
  }

  return { ok: true };
}

async function findOrCreateExternalAcademy({
  workspace,
  academyName,
}: {
  workspace: AuthorizedWorkspace;
  academyName: string;
}): Promise<{ ok: true; data: ExternalAcademyRecord } | { ok: false; error: string }> {
  const { data: academies, error: selectError } = await workspace.admin
    .from("external_academies")
    .select("id, name, is_active")
    .eq("academy_id", workspace.profile.academy_id)
    .eq("is_active", true)
    .returns<ExternalAcademyRecord[]>();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const normalizedName = normalizeText(academyName);
  const existing = (academies ?? []).find(
    (academy) => normalizeText(academy.name) === normalizedName,
  );

  if (existing) {
    return { ok: true, data: existing };
  }

  const { data, error } = await workspace.admin
    .from("external_academies")
    .insert({
      academy_id: workspace.profile.academy_id,
      name: academyName,
      created_by: workspace.userId,
    })
    .select("id, name, is_active")
    .single<ExternalAcademyRecord>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

async function findOrCreateExternalClass({
  workspace,
  externalAcademyId,
  classTitle,
  subject,
  scheduleDate,
  dayOfWeek,
  startTime,
  endTime,
  memo,
}: {
  workspace: AuthorizedWorkspace;
  externalAcademyId: string;
  classTitle: string;
  subject: string | null;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  memo: string | null;
}): Promise<{ ok: true; data: ExternalAcademyClassRecord } | { ok: false; error: string }> {
  const { data: classes, error: selectError } = await workspace.admin
    .from("external_academy_classes")
    .select("id")
    .eq("academy_id", workspace.profile.academy_id)
    .eq("external_academy_id", externalAcademyId)
    .eq("day_of_week", dayOfWeek)
    .eq("start_time", startTime)
    .eq("end_time", endTime)
    .eq("is_active", true)
    .returns<ExternalAcademyClassRecord[]>();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const existing = classes?.[0];

  if (existing) {
    return { ok: true, data: existing };
  }

  const { data, error } = await workspace.admin
    .from("external_academy_classes")
    .insert({
      academy_id: workspace.profile.academy_id,
      external_academy_id: externalAcademyId,
      title: classTitle,
      subject,
      schedule_date: scheduleDate,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      memo,
      created_by: workspace.userId,
    })
    .select("id")
    .single<ExternalAcademyClassRecord>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

async function findOrCreateEnrollment({
  workspace,
  studentId,
  externalClassId,
}: {
  workspace: AuthorizedWorkspace;
  studentId: string;
  externalClassId: string;
}): Promise<{ ok: true; data: ExternalEnrollmentRecord } | { ok: false; error: string }> {
  const { data: existingEnrollments, error: selectError } = await workspace.admin
    .from("student_external_class_enrollments")
    .select("id, is_active")
    .eq("academy_id", workspace.profile.academy_id)
    .eq("student_id", studentId)
    .eq("external_academy_class_id", externalClassId)
    .returns<ExternalEnrollmentRecord[]>();

  if (selectError) {
    return { ok: false, error: selectError.message };
  }

  const existing = existingEnrollments?.[0];

  if (existing?.is_active) {
    return { ok: true, data: existing };
  }

  if (existing) {
    const { data, error } = await workspace.admin
      .from("student_external_class_enrollments")
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select("id, is_active")
      .single<ExternalEnrollmentRecord>();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, data };
  }

  const { data, error } = await workspace.admin
    .from("student_external_class_enrollments")
    .insert({
      academy_id: workspace.profile.academy_id,
      student_id: studentId,
      external_academy_class_id: externalClassId,
      created_by: workspace.userId,
    })
    .select("id, is_active")
    .single<ExternalEnrollmentRecord>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
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

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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
