import { NextResponse } from "next/server";
import { canManageAcademy } from "@/lib/permissions";
import {
  syncAutomaticScheduleLinks,
  type ShareableStudentRecord,
} from "@/lib/server/automatic-schedule-sharing";
import { writeAuditLog } from "@/lib/server/audit-log";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

const studentStatuses = ["active", "paused", "left"] as const;

type StudentStatus = (typeof studentStatuses)[number];

type StudentRequest = {
  studentId?: unknown;
  classId?: unknown;
  name?: unknown;
  schoolName?: unknown;
  gradeLabel?: unknown;
  parentName?: unknown;
  parentPhone?: unknown;
  studentPhone?: unknown;
  scheduleShareConsentConfirmed?: unknown;
  status?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type StudentPayload = {
  studentId?: string;
  classId: string | null;
  name: string;
  schoolName: string | null;
  gradeLabel: string | null;
  parentName: string | null;
  parentPhone: string;
  studentPhone: string | null;
  scheduleShareConsentConfirmed: boolean;
  status: StudentStatus;
};

type StudentRecord = {
  id: string;
  academy_id?: string;
  class_id: string | null;
  name: string;
  school_name: string | null;
  grade_label: string | null;
  parent_name: string | null;
  parent_phone: string;
  student_phone: string | null;
  schedule_share_consent_confirmed: boolean;
  status: string;
};

export async function POST(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseStudentRequest(request, { requireStudentId: false });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const classCheck = await validateClass({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    classId: parsedRequest.data.classId,
  });

  if (!classCheck.ok) {
    return NextResponse.json({ error: classCheck.error }, { status: 400 });
  }

  const { data, error } = await workspace.admin
    .from("students")
    .insert({
      academy_id: workspace.profile.academy_id,
      class_id: parsedRequest.data.classId,
      name: parsedRequest.data.name,
      school_name: parsedRequest.data.schoolName,
      grade_label: parsedRequest.data.gradeLabel,
      parent_name: parsedRequest.data.parentName,
      parent_phone: parsedRequest.data.parentPhone,
      student_phone: parsedRequest.data.studentPhone,
      schedule_share_consent_confirmed: parsedRequest.data.scheduleShareConsentConfirmed,
      schedule_share_consent_confirmed_at: parsedRequest.data.scheduleShareConsentConfirmed
        ? new Date().toISOString()
        : null,
      schedule_share_consent_confirmed_by: parsedRequest.data.scheduleShareConsentConfirmed
        ? workspace.userId
        : null,
      status: parsedRequest.data.status,
    })
    .select(
      "id, academy_id, class_id, name, school_name, grade_label, parent_name, parent_phone, student_phone, schedule_share_consent_confirmed, status",
    )
    .single<StudentRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const syncResult = await syncAutomaticScheduleLinks({
    admin: workspace.admin,
    student: toShareableStudentRecord(data, workspace.profile.academy_id),
    userId: workspace.userId,
  });

  if (!syncResult.ok) {
    return NextResponse.json({ error: syncResult.error }, { status: 500 });
  }

  await writeAuditLog({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    actorUserId: workspace.userId,
    action: "student.create",
    entityType: "student",
    entityId: data.id,
    summary: `${data.name} 학생을 등록했습니다.`,
  });

  return NextResponse.json({ student: toStudentResponse(data) });
}

export async function PATCH(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseStudentRequest(request, { requireStudentId: true });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const classCheck = await validateClass({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    classId: parsedRequest.data.classId,
  });

  if (!classCheck.ok) {
    return NextResponse.json({ error: classCheck.error }, { status: 400 });
  }

  const { data, error } = await workspace.admin
    .from("students")
    .update({
      class_id: parsedRequest.data.classId,
      name: parsedRequest.data.name,
      school_name: parsedRequest.data.schoolName,
      grade_label: parsedRequest.data.gradeLabel,
      parent_name: parsedRequest.data.parentName,
      parent_phone: parsedRequest.data.parentPhone,
      student_phone: parsedRequest.data.studentPhone,
      schedule_share_consent_confirmed: parsedRequest.data.scheduleShareConsentConfirmed,
      schedule_share_consent_confirmed_at: parsedRequest.data.scheduleShareConsentConfirmed
        ? new Date().toISOString()
        : null,
      schedule_share_consent_confirmed_by: parsedRequest.data.scheduleShareConsentConfirmed
        ? workspace.userId
        : null,
      status: parsedRequest.data.status,
    })
    .eq("id", parsedRequest.data.studentId)
    .eq("academy_id", workspace.profile.academy_id)
    .select(
      "id, academy_id, class_id, name, school_name, grade_label, parent_name, parent_phone, student_phone, schedule_share_consent_confirmed, status",
    )
    .maybeSingle<StudentRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "수정할 학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const syncResult = await syncAutomaticScheduleLinks({
    admin: workspace.admin,
    student: toShareableStudentRecord(data, workspace.profile.academy_id),
    userId: workspace.userId,
  });

  if (!syncResult.ok) {
    return NextResponse.json({ error: syncResult.error }, { status: 500 });
  }

  await writeAuditLog({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    actorUserId: workspace.userId,
    action: "student.update",
    entityType: "student",
    entityId: data.id,
    summary: `${data.name} 학생 정보를 수정했습니다.${
      data.schedule_share_consent_confirmed ? " 타 학원 스케줄 공유 동의 확인 포함." : ""
    }`,
  });

  return NextResponse.json({ student: toStudentResponse(data) });
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

  if (!canManageAcademy(profile.role)) {
    return { ok: false, status: 403, error: "학생 관리는 원장 또는 관리자만 할 수 있습니다." };
  }

  return { ok: true, admin, profile, userId: user.id };
}

async function parseStudentRequest(
  request: Request,
  { requireStudentId }: { requireStudentId: boolean },
): Promise<{ ok: true; data: StudentPayload } | { ok: false; error: string }> {
  let body: StudentRequest;

  try {
    body = (await request.json()) as StudentRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const studentId = optionalText(body.studentId);

  if (requireStudentId && !studentId) {
    return { ok: false, error: "수정할 학생 ID가 필요합니다." };
  }

  const name = optionalText(body.name);

  if (!name) {
    return { ok: false, error: "학생 이름이 필요합니다." };
  }

  if (name.length > 40) {
    return { ok: false, error: "학생 이름은 40자 이하로 입력해 주세요." };
  }

  const parentPhone = normalizePhone(body.parentPhone);

  if (!parentPhone) {
    return { ok: false, error: "학부모 연락처가 필요합니다." };
  }

  const studentPhone = normalizeOptionalPhone(body.studentPhone);

  if (studentPhone === undefined) {
    return { ok: false, error: "학생 연락처 형식이 올바르지 않습니다." };
  }

  if (!isStudentStatus(body.status)) {
    return { ok: false, error: "지원하지 않는 학생 상태입니다." };
  }

  return {
    ok: true,
    data: {
      studentId: studentId ?? undefined,
      classId: optionalText(body.classId),
      name,
      schoolName: optionalText(body.schoolName),
      gradeLabel: optionalText(body.gradeLabel),
      parentName: optionalText(body.parentName),
      parentPhone,
      studentPhone,
      scheduleShareConsentConfirmed: body.scheduleShareConsentConfirmed === true,
      status: body.status,
    },
  };
}

async function validateClass({
  admin,
  academyId,
  classId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  classId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!classId) {
    return { ok: true };
  }

  const { data, error } = await admin
    .from("classes")
    .select("id")
    .eq("id", classId)
    .eq("academy_id", academyId)
    .maybeSingle<{ id: string }>();

  if (error) {
    return { ok: false, error: error.message };
  }

  if (!data) {
    return { ok: false, error: "소속 반을 찾을 수 없습니다." };
  }

  return { ok: true };
}

function toShareableStudentRecord(
  student: StudentRecord,
  fallbackAcademyId: string,
): ShareableStudentRecord {
  return {
    id: student.id,
    academy_id: student.academy_id ?? fallbackAcademyId,
    name: student.name,
    school_name: student.school_name,
    grade_label: student.grade_label,
    parent_phone: student.parent_phone,
    student_phone: student.student_phone,
    schedule_share_consent_confirmed: student.schedule_share_consent_confirmed,
  };
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhone(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const digits = restoreMissingKoreanMobileLeadingZero(value.replace(/\D/g, ""));

  if (digits.length < 8 || digits.length > 11) {
    return null;
  }

  return digits;
}

function restoreMissingKoreanMobileLeadingZero(digits: string) {
  if (/^(10|11|16|17|18|19)\d{7,8}$/.test(digits)) {
    return `0${digits}`;
  }

  return digits;
}

function normalizeOptionalPhone(value: unknown) {
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  return normalizePhone(text) ?? undefined;
}

function isStudentStatus(value: unknown): value is StudentStatus {
  return typeof value === "string" && studentStatuses.includes(value as StudentStatus);
}

function toStudentResponse(student: StudentRecord) {
  return {
    id: student.id,
    classId: student.class_id,
    name: student.name,
    schoolName: student.school_name,
    gradeLabel: student.grade_label,
    parentName: student.parent_name,
    parentPhone: student.parent_phone,
    studentPhone: student.student_phone,
    scheduleShareConsentConfirmed: student.schedule_share_consent_confirmed,
    status: student.status,
  };
}
