import { NextResponse } from "next/server";
import { canManageAcademy } from "@/lib/permissions";
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

type ShareableStudentRecord = {
  id: string;
  academy_id: string;
  name: string;
  school_name: string | null;
  grade_label: string | null;
  parent_phone: string;
  student_phone: string | null;
  schedule_share_consent_confirmed: boolean;
};

type ScheduleLinkRecord = {
  id: string;
  source_academy_id: string;
  source_student_id: string;
  target_academy_id: string;
  target_student_id: string;
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

async function syncAutomaticScheduleLinks({
  admin,
  student,
  userId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  student: ShareableStudentRecord;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const linksResult = await getActiveScheduleLinksForStudent({ admin, student });

  if (!linksResult.ok) {
    return linksResult;
  }

  if (!student.schedule_share_consent_confirmed) {
    return revokeScheduleLinks({
      admin,
      linkIds: linksResult.links.map((link) => link.id),
      userId,
    });
  }

  const linkedRemoteRefs = linksResult.links.map((link) =>
    getRemoteStudentRefFromLink(link, student),
  );
  const remoteStudentsResult = await getStudentsByRefs({ admin, refs: linkedRemoteRefs });

  if (!remoteStudentsResult.ok) {
    return remoteStudentsResult;
  }

  const remoteStudentsByKey = new Map(
    remoteStudentsResult.students.map((remoteStudent) => [
      `${remoteStudent.academy_id}:${remoteStudent.id}`,
      remoteStudent,
    ]),
  );
  const invalidLinkIds = linksResult.links
    .filter((link) => {
      const remoteRef = getRemoteStudentRefFromLink(link, student);
      const remoteStudent = remoteStudentsByKey.get(`${remoteRef.academyId}:${remoteRef.studentId}`);
      return !remoteStudent || !isAutomaticShareMatch(student, remoteStudent);
    })
    .map((link) => link.id);
  const revokeInvalidResult = await revokeScheduleLinks({
    admin,
    linkIds: invalidLinkIds,
    userId,
  });

  if (!revokeInvalidResult.ok) {
    return revokeInvalidResult;
  }

  const candidatesResult = await getAutomaticShareCandidates({ admin, student });

  if (!candidatesResult.ok) {
    return candidatesResult;
  }

  for (const candidate of candidatesResult.students) {
    const { error } = await admin.from("student_schedule_links").insert({
      source_academy_id: student.academy_id,
      source_student_id: student.id,
      target_academy_id: candidate.academy_id,
      target_student_id: candidate.id,
      status: "active",
      consent_method: "manual",
      created_by: userId,
    });

    if (error && isMissingSharingTable(error)) {
      return { ok: true };
    }

    if (error && error.code !== "23505") {
      return { ok: false, error: error.message };
    }
  }

  return { ok: true };
}

async function getActiveScheduleLinksForStudent({
  admin,
  student,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  student: ShareableStudentRecord;
}): Promise<{ ok: true; links: ScheduleLinkRecord[] } | { ok: false; error: string }> {
  const [sourceResult, targetResult] = await Promise.all([
    admin
      .from("student_schedule_links")
      .select("id, source_academy_id, source_student_id, target_academy_id, target_student_id")
      .eq("source_academy_id", student.academy_id)
      .eq("source_student_id", student.id)
      .eq("status", "active")
      .returns<ScheduleLinkRecord[]>(),
    admin
      .from("student_schedule_links")
      .select("id, source_academy_id, source_student_id, target_academy_id, target_student_id")
      .eq("target_academy_id", student.academy_id)
      .eq("target_student_id", student.id)
      .eq("status", "active")
      .returns<ScheduleLinkRecord[]>(),
  ]);

  if (sourceResult.error || targetResult.error) {
    if (isMissingSharingTable(sourceResult.error) || isMissingSharingTable(targetResult.error)) {
      return { ok: true, links: [] };
    }

    return { ok: false, error: sourceResult.error?.message ?? targetResult.error?.message ?? "" };
  }

  return { ok: true, links: [...(sourceResult.data ?? []), ...(targetResult.data ?? [])] };
}

async function getStudentsByRefs({
  admin,
  refs,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  refs: Array<{ academyId: string; studentId: string }>;
}): Promise<{ ok: true; students: ShareableStudentRecord[] } | { ok: false; error: string }> {
  const studentIds = [...new Set(refs.map((ref) => ref.studentId))];

  if (studentIds.length === 0) {
    return { ok: true, students: [] };
  }

  const { data, error } = await admin
    .from("students")
    .select(
      "id, academy_id, name, school_name, grade_label, parent_phone, student_phone, schedule_share_consent_confirmed",
    )
    .in("id", studentIds)
    .returns<ShareableStudentRecord[]>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, students: data ?? [] };
}

async function getAutomaticShareCandidates({
  admin,
  student,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  student: ShareableStudentRecord;
}): Promise<{ ok: true; students: ShareableStudentRecord[] } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("students")
    .select(
      "id, academy_id, name, school_name, grade_label, parent_phone, student_phone, schedule_share_consent_confirmed",
    )
    .neq("academy_id", student.academy_id)
    .eq("status", "active")
    .eq("schedule_share_consent_confirmed", true)
    .returns<ShareableStudentRecord[]>();

  if (error) {
    if (isMissingSharingTable(error)) {
      return { ok: true, students: [] };
    }

    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    students: (data ?? []).filter((candidate) => isAutomaticShareMatch(student, candidate)),
  };
}

async function revokeScheduleLinks({
  admin,
  linkIds,
  userId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  linkIds: string[];
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (linkIds.length === 0) {
    return { ok: true };
  }

  const { error } = await admin
    .from("student_schedule_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: userId,
    })
    .in("id", linkIds);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

function isAutomaticShareMatch(source: ShareableStudentRecord, target: ShareableStudentRecord) {
  if (!source.schedule_share_consent_confirmed || !target.schedule_share_consent_confirmed) {
    return false;
  }

  if (
    source.academy_id === target.academy_id ||
    normalizeStudentIdentityValue(source.name) !== normalizeStudentIdentityValue(target.name) ||
    normalizeStudentIdentityValue(source.school_name) !==
      normalizeStudentIdentityValue(target.school_name) ||
    normalizeStudentIdentityValue(source.grade_label) !==
      normalizeStudentIdentityValue(target.grade_label)
  ) {
    return false;
  }

  const sourcePhones = getStudentMatchPhones(source);
  const targetPhones = getStudentMatchPhones(target);

  return sourcePhones.some((phone) => targetPhones.includes(phone));
}

function getStudentMatchPhones(student: ShareableStudentRecord) {
  return [student.parent_phone, student.student_phone]
    .map((phone) => normalizePhone(phone))
    .filter((phone): phone is string => Boolean(phone));
}

function normalizeStudentIdentityValue(value: string | null) {
  return (value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

function getRemoteStudentRefFromLink(link: ScheduleLinkRecord, student: ShareableStudentRecord) {
  if (link.source_academy_id === student.academy_id && link.source_student_id === student.id) {
    return {
      academyId: link.target_academy_id,
      studentId: link.target_student_id,
    };
  }

  return {
    academyId: link.source_academy_id,
    studentId: link.source_student_id,
  };
}

function isMissingSharingTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("student_schedule_links")) ||
    Boolean(error?.message?.includes("student_share_tokens"))
  );
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

  const digits = value.replace(/\D/g, "");

  if (digits.length < 8 || digits.length > 11) {
    return null;
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
