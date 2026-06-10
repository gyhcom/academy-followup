import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { canManageAcademy } from "@/lib/permissions";
import {
  getRouteWorkspace,
  getStudentForFollowupAccess,
  type RouteWorkspaceContext,
} from "@/lib/server/route-workspace";

type ShareAction = "create_token" | "connect" | "revoke";

type ShareRequest = {
  action?: unknown;
  studentId?: unknown;
  code?: unknown;
  linkId?: unknown;
};

type ShareTokenRecord = {
  id: string;
  academy_id: string;
  student_id: string;
  status: string;
  expires_at: string;
};

type SharedStudentIdentity = {
  id: string;
  name: string;
  school_name: string | null;
  grade_label: string | null;
  schedule_share_consent_confirmed: boolean;
};

type ShareLinkRecord = {
  id: string;
  source_academy_id: string;
  source_student_id: string;
  target_academy_id: string;
  target_student_id: string;
  status: string;
  consent_method: string;
  created_at: string;
};

type StudentShareConsentRecord = {
  id: string;
  academy_id: string;
  schedule_share_consent_confirmed: boolean;
};

type SharedScheduleRecord = {
  id: string;
  academy_id: string;
  student_id: string;
  schedule_type: string;
  schedule_date: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string | null;
  title: string;
  is_active: boolean;
};

const tokenLifetimeDays = 14;
const studentIdentityMismatchMessage =
  "공유 코드의 학생 정보와 현재 선택한 학생 정보가 다릅니다. 이름, 학교, 학년을 확인해 주세요.";
const studentWorkspaceMismatchMessage =
  "현재 로그인한 학원과 선택한 학생 정보가 맞지 않습니다. 다른 학원 계정으로 로그인했거나 화면이 오래된 상태일 수 있습니다. 새로고침 후 다시 확인해 주세요.";
const scheduleShareConsentRequiredMessage =
  "보호자 동의 확인 후 공유 코드를 만들 수 있습니다.";

export async function GET(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId")?.trim() ?? "";

  if (!studentId) {
    return NextResponse.json({ error: "학생 ID가 필요합니다." }, { status: 400 });
  }

  const access = await getStudentForFollowupAccess({
    workspace: workspaceResult.workspace,
    studentId,
    requireActiveStudent: false,
    permissionError: "이 학생의 공유 스케줄을 볼 권한이 없습니다.",
  });

  if (!access.ok) {
    return NextResponse.json(
      { error: getStudentContextError(access.error) },
      { status: access.status },
    );
  }

  const sharedData = await getSharedSchedules({
    workspace: workspaceResult.workspace,
    studentId,
  });

  if (!sharedData.ok) {
    return NextResponse.json({ error: sharedData.error }, { status: 500 });
  }

  return NextResponse.json({
    canManage: canManageAcademy(workspaceResult.workspace.profile.role),
    links: sharedData.links,
  });
}

export async function POST(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  if (!canManageAcademy(workspaceResult.workspace.profile.role)) {
    return NextResponse.json(
      { error: "원장 또는 관리자만 스케줄 공유를 관리할 수 있습니다." },
      { status: 403 },
    );
  }

  const parsedRequest = await parseShareRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  if (parsedRequest.data.action === "create_token") {
    return createShareToken({
      workspace: workspaceResult.workspace,
      studentId: parsedRequest.data.studentId,
    });
  }

  if (parsedRequest.data.action === "connect") {
    return connectWithShareCode({
      workspace: workspaceResult.workspace,
      studentId: parsedRequest.data.studentId,
      code: parsedRequest.data.code,
    });
  }

  return revokeShareLink({
    workspace: workspaceResult.workspace,
    studentId: parsedRequest.data.studentId,
    linkId: parsedRequest.data.linkId,
  });
}

async function createShareToken({
  workspace,
  studentId,
}: {
  workspace: RouteWorkspaceContext;
  studentId: string;
}) {
  const student = await assertManageableStudent({ workspace, studentId });

  if (!student.ok) {
    return NextResponse.json({ error: student.error }, { status: student.status });
  }

  const consentCheck = await verifyStudentShareConsent({
    workspace,
    academyId: workspace.profile.academy_id,
    studentId,
  });

  if (!consentCheck.ok) {
    return NextResponse.json(
      { error: consentCheck.error },
      { status: consentCheck.status },
    );
  }

  const code = createShareCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + tokenLifetimeDays);

  const { error } = await workspace.admin.from("student_share_tokens").insert({
    academy_id: workspace.profile.academy_id,
    student_id: studentId,
    token_hash: hashShareCode(code),
    status: "active",
    expires_at: expiresAt.toISOString(),
    created_by: workspace.userId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    code,
    expiresAt: expiresAt.toISOString(),
    message: "공유 코드를 만들었습니다. 보호자 동의가 확인된 학원에만 전달해 주세요.",
  });
}

async function connectWithShareCode({
  workspace,
  studentId,
  code,
}: {
  workspace: RouteWorkspaceContext;
  studentId: string;
  code: string;
}) {
  const student = await assertManageableStudent({ workspace, studentId });

  if (!student.ok) {
    return NextResponse.json({ error: student.error }, { status: student.status });
  }

  const { data: token, error: tokenError } = await workspace.admin
    .from("student_share_tokens")
    .select("id, academy_id, student_id, status, expires_at")
    .eq("token_hash", hashShareCode(code))
    .maybeSingle<ShareTokenRecord>();

  if (tokenError) {
    return NextResponse.json({ error: tokenError.message }, { status: 500 });
  }

  if (!token || token.status !== "active") {
    return NextResponse.json({ error: "유효한 공유 코드를 찾을 수 없습니다." }, { status: 404 });
  }

  if (new Date(token.expires_at).getTime() < Date.now()) {
    await workspace.admin
      .from("student_share_tokens")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", token.id);

    return NextResponse.json({ error: "만료된 공유 코드입니다." }, { status: 410 });
  }

  if (token.academy_id === workspace.profile.academy_id || token.student_id === studentId) {
    return NextResponse.json(
      { error: "같은 학원 또는 같은 학생에는 공유 코드를 연결할 수 없습니다." },
      { status: 400 },
    );
  }

  const identityCheck = await verifySameStudentIdentity({
    workspace,
    sourceAcademyId: token.academy_id,
    sourceStudentId: token.student_id,
    targetAcademyId: workspace.profile.academy_id,
    targetStudentId: studentId,
  });

  if (!identityCheck.ok) {
    return NextResponse.json(
      { error: identityCheck.error },
      { status: identityCheck.status },
    );
  }

  const { error: insertError } = await workspace.admin.from("student_schedule_links").insert({
    source_academy_id: token.academy_id,
    source_student_id: token.student_id,
    target_academy_id: workspace.profile.academy_id,
    target_student_id: studentId,
    status: "active",
    consent_method: "manual",
    created_by: workspace.userId,
  });

  if (insertError) {
    const isDuplicate = insertError.code === "23505";
    return NextResponse.json(
      {
        error: isDuplicate
          ? "이미 연결된 학생 스케줄입니다."
          : insertError.message,
      },
      { status: isDuplicate ? 409 : 500 },
    );
  }

  await workspace.admin
    .from("student_share_tokens")
    .update({
      status: "used",
      used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", token.id);

  return NextResponse.json({ message: "학생 스케줄 공유를 연결했습니다." });
}

async function revokeShareLink({
  workspace,
  studentId,
  linkId,
}: {
  workspace: RouteWorkspaceContext;
  studentId: string;
  linkId: string;
}) {
  const student = await assertManageableStudent({ workspace, studentId });

  if (!student.ok) {
    return NextResponse.json({ error: student.error }, { status: student.status });
  }

  const { data: link, error: linkError } = await workspace.admin
    .from("student_schedule_links")
    .select(
      "id, source_academy_id, source_student_id, target_academy_id, target_student_id, status, consent_method, created_at",
    )
    .eq("id", linkId)
    .eq("status", "active")
    .maybeSingle<ShareLinkRecord>();

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 });
  }

  if (!link || !isOwnSideLink(link, workspace.profile.academy_id, studentId)) {
    return NextResponse.json({ error: "연결된 공유 스케줄을 찾을 수 없습니다." }, { status: 404 });
  }

  const { error } = await workspace.admin
    .from("student_schedule_links")
    .update({
      status: "revoked",
      revoked_at: new Date().toISOString(),
      revoked_by: workspace.userId,
    })
    .eq("id", link.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: "스케줄 공유 연결을 해제했습니다." });
}

async function getSharedSchedules({
  workspace,
  studentId,
}: {
  workspace: RouteWorkspaceContext;
  studentId: string;
}): Promise<
  | {
      ok: true;
      links: Array<{
        id: string;
        academyName: string;
        connectedAt: string;
        schedules: Array<{
          id: string;
          academyName: string;
          scheduleType: string;
          scheduleDate: string | null;
          dayOfWeek: number;
          startTime: string;
          endTime: string;
          subject: string | null;
          title: string;
        }>;
      }>;
    }
  | { ok: false; error: string }
> {
  const [sourceResult, targetResult] = await Promise.all([
    workspace.admin
      .from("student_schedule_links")
      .select(
        "id, source_academy_id, source_student_id, target_academy_id, target_student_id, status, consent_method, created_at",
      )
      .eq("source_academy_id", workspace.profile.academy_id)
      .eq("source_student_id", studentId)
      .eq("status", "active")
      .returns<ShareLinkRecord[]>(),
    workspace.admin
      .from("student_schedule_links")
      .select(
        "id, source_academy_id, source_student_id, target_academy_id, target_student_id, status, consent_method, created_at",
      )
      .eq("target_academy_id", workspace.profile.academy_id)
      .eq("target_student_id", studentId)
      .eq("status", "active")
      .returns<ShareLinkRecord[]>(),
  ]);

  if (sourceResult.error || targetResult.error) {
    if (isMissingSharingTable(sourceResult.error) || isMissingSharingTable(targetResult.error)) {
      return { ok: true, links: [] };
    }

    return { ok: false, error: sourceResult.error?.message ?? targetResult.error?.message ?? "" };
  }

  const links = [...(sourceResult.data ?? []), ...(targetResult.data ?? [])];
  const remoteRefs = links.map((link) => getRemoteRef(link, workspace.profile.academy_id, studentId));

  if (remoteRefs.length === 0) {
    return { ok: true, links: [] };
  }

  const studentIds = [...new Set(remoteRefs.map((ref) => ref.studentId))];

  const localConsent = await verifyStudentShareConsent({
    workspace,
    academyId: workspace.profile.academy_id,
    studentId,
  });

  if (!localConsent.ok) {
    if (localConsent.status === 400) {
      return { ok: true, links: [] };
    }

    return { ok: false, error: localConsent.error };
  }

  const remoteConsentResult = await workspace.admin
    .from("students")
    .select("id, academy_id, schedule_share_consent_confirmed")
    .in("id", studentIds)
    .returns<StudentShareConsentRecord[]>();

  if (remoteConsentResult.error) {
    return {
      ok: false,
      error: remoteConsentResult.error.message,
    };
  }

  const consentedRemoteStudents = new Set(
    (remoteConsentResult.data ?? [])
      .filter((student) => student.schedule_share_consent_confirmed)
      .map((student) => `${student.academy_id}:${student.id}`),
  );

  const schedulesResult = await workspace.admin
    .from("student_schedules")
    .select(
      "id, academy_id, student_id, schedule_type, schedule_date, day_of_week, start_time, end_time, subject, title, is_active",
    )
    .in("student_id", studentIds)
    .eq("is_active", true)
    .order("day_of_week", { ascending: true })
    .order("start_time", { ascending: true })
    .returns<SharedScheduleRecord[]>();

  if (schedulesResult.error) {
    return {
      ok: false,
      error: schedulesResult.error.message,
    };
  }

  const schedules = schedulesResult.data ?? [];

  return {
    ok: true,
    links: links.map((link, index) => {
      const remote = getRemoteRef(link, workspace.profile.academy_id, studentId);
      const academyName = `연결 학원 ${index + 1}`;

      return {
        id: link.id,
        academyName,
        connectedAt: link.created_at,
        schedules: schedules
          .filter(
            (schedule) =>
              schedule.student_id === remote.studentId && schedule.academy_id === remote.academyId,
          )
          .filter((schedule) =>
            consentedRemoteStudents.has(`${schedule.academy_id}:${schedule.student_id}`),
          )
          .map((schedule) => ({
            id: schedule.id,
            academyName,
            scheduleType: schedule.schedule_type,
            scheduleDate: schedule.schedule_date,
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time.slice(0, 5),
            endTime: schedule.end_time.slice(0, 5),
            subject: schedule.subject,
            title: schedule.title,
          })),
      };
    }),
  };
}

function isMissingSharingTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("student_schedule_links")) ||
    Boolean(error?.message?.includes("student_share_tokens"))
  );
}

async function assertManageableStudent({
  workspace,
  studentId,
}: {
  workspace: RouteWorkspaceContext;
  studentId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const access = await getStudentForFollowupAccess({
    workspace,
    studentId,
    requireActiveStudent: false,
    permissionError: "이 학생의 스케줄 공유를 관리할 권한이 없습니다.",
  });

  if (!access.ok) {
    return {
      ...access,
      error: getStudentContextError(access.error),
    };
  }

  return { ok: true };
}

async function verifyStudentShareConsent({
  workspace,
  academyId,
  studentId,
}: {
  workspace: RouteWorkspaceContext;
  academyId: string;
  studentId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { data, error } = await workspace.admin
    .from("students")
    .select("id, schedule_share_consent_confirmed")
    .eq("id", studentId)
    .eq("academy_id", academyId)
    .maybeSingle<{ id: string; schedule_share_consent_confirmed: boolean }>();

  if (error) {
    return {
      ok: false,
      status: 500,
      error: error.message,
    };
  }

  if (!data) {
    return {
      ok: false,
      status: 404,
      error: "학생 정보를 찾을 수 없습니다.",
    };
  }

  if (!data.schedule_share_consent_confirmed) {
    return {
      ok: false,
      status: 400,
      error: scheduleShareConsentRequiredMessage,
    };
  }

  return { ok: true };
}

function getStudentContextError(error: string) {
  return error === "선택한 학생을 찾을 수 없습니다."
    ? studentWorkspaceMismatchMessage
    : error;
}

async function verifySameStudentIdentity({
  workspace,
  sourceAcademyId,
  sourceStudentId,
  targetAcademyId,
  targetStudentId,
}: {
  workspace: RouteWorkspaceContext;
  sourceAcademyId: string;
  sourceStudentId: string;
  targetAcademyId: string;
  targetStudentId: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const [sourceResult, targetResult] = await Promise.all([
    workspace.admin
      .from("students")
      .select("id, name, school_name, grade_label, schedule_share_consent_confirmed")
      .eq("id", sourceStudentId)
      .eq("academy_id", sourceAcademyId)
      .maybeSingle<SharedStudentIdentity>(),
    workspace.admin
      .from("students")
      .select("id, name, school_name, grade_label, schedule_share_consent_confirmed")
      .eq("id", targetStudentId)
      .eq("academy_id", targetAcademyId)
      .maybeSingle<SharedStudentIdentity>(),
  ]);

  if (sourceResult.error || targetResult.error) {
    return {
      ok: false,
      status: 500,
      error: sourceResult.error?.message ?? targetResult.error?.message ?? "",
    };
  }

  if (!sourceResult.data || !targetResult.data) {
    return {
      ok: false,
      status: 404,
      error: "학생 정보를 찾을 수 없습니다.",
    };
  }

  if (!isSameStudentIdentity(sourceResult.data, targetResult.data)) {
    return {
      ok: false,
      status: 400,
      error: studentIdentityMismatchMessage,
    };
  }

  if (
    !sourceResult.data.schedule_share_consent_confirmed ||
    !targetResult.data.schedule_share_consent_confirmed
  ) {
    return {
      ok: false,
      status: 400,
      error: scheduleShareConsentRequiredMessage,
    };
  }

  return { ok: true };
}

function isSameStudentIdentity(source: SharedStudentIdentity, target: SharedStudentIdentity) {
  const sourceName = normalizeStudentIdentityValue(source.name);
  const sourceSchool = normalizeStudentIdentityValue(source.school_name);
  const sourceGrade = normalizeStudentIdentityValue(source.grade_label);
  const targetName = normalizeStudentIdentityValue(target.name);
  const targetSchool = normalizeStudentIdentityValue(target.school_name);
  const targetGrade = normalizeStudentIdentityValue(target.grade_label);

  if (!sourceName || !sourceSchool || !sourceGrade || !targetName || !targetSchool || !targetGrade) {
    return false;
  }

  return (
    sourceName === targetName &&
    sourceSchool === targetSchool &&
    sourceGrade === targetGrade
  );
}

function normalizeStudentIdentityValue(value: string | null) {
  return (value ?? "").replace(/\s+/g, "").trim().toLowerCase();
}

async function parseShareRequest(
  request: Request,
): Promise<
  | {
      ok: true;
      data:
        | { action: "create_token"; studentId: string }
        | { action: "connect"; studentId: string; code: string }
        | { action: "revoke"; studentId: string; linkId: string };
    }
  | { ok: false; error: string }
> {
  let body: ShareRequest;

  try {
    body = (await request.json()) as ShareRequest;
  } catch {
    return { ok: false, error: "요청 본문을 확인해 주세요." };
  }

  const action = typeof body.action === "string" ? body.action : "";
  const studentId = typeof body.studentId === "string" ? body.studentId.trim() : "";

  if (!isShareAction(action)) {
    return { ok: false, error: "지원하지 않는 공유 요청입니다." };
  }

  if (!studentId) {
    return { ok: false, error: "학생 ID가 필요합니다." };
  }

  if (action === "create_token") {
    return { ok: true, data: { action, studentId } };
  }

  if (action === "connect") {
    const code = normalizeShareCode(typeof body.code === "string" ? body.code : "");

    if (!code) {
      return { ok: false, error: "공유 코드가 필요합니다." };
    }

    return { ok: true, data: { action, studentId, code } };
  }

  const linkId = typeof body.linkId === "string" ? body.linkId.trim() : "";

  if (!linkId) {
    return { ok: false, error: "해제할 공유 연결 ID가 필요합니다." };
  }

  return { ok: true, data: { action, studentId, linkId } };
}

function isShareAction(value: string): value is ShareAction {
  return value === "create_token" || value === "connect" || value === "revoke";
}

function createShareCode() {
  return randomBytes(6).toString("base64url").toUpperCase();
}

function normalizeShareCode(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
}

function hashShareCode(code: string) {
  return createHash("sha256").update(normalizeShareCode(code)).digest("hex");
}

function isOwnSideLink(link: ShareLinkRecord, academyId: string, studentId: string) {
  return (
    (link.source_academy_id === academyId && link.source_student_id === studentId) ||
    (link.target_academy_id === academyId && link.target_student_id === studentId)
  );
}

function getRemoteRef(link: ShareLinkRecord, academyId: string, studentId: string) {
  if (link.source_academy_id === academyId && link.source_student_id === studentId) {
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
