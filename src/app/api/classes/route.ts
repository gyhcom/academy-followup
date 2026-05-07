import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type ClassRequest = {
  classId?: unknown;
  name?: unknown;
  subject?: unknown;
  gradeLabel?: unknown;
  teacherId?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type ClassRecord = {
  id: string;
  name: string;
  subject: string | null;
  grade_label: string | null;
  teacher_id: string | null;
};

type ClassPayload = {
  classId?: string;
  name: string;
  subject: string | null;
  gradeLabel: string | null;
  teacherId: string | null;
};

export async function POST(request: Request) {
  const parsedRequest = await parseClassRequest(request, { requireClassId: false });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const teacherCheck = await validateTeacher({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    teacherId: parsedRequest.data.teacherId,
  });

  if (!teacherCheck.ok) {
    return NextResponse.json({ error: teacherCheck.error }, { status: 400 });
  }

  const { data, error } = await workspace.admin
    .from("classes")
    .insert({
      academy_id: workspace.profile.academy_id,
      name: parsedRequest.data.name,
      subject: parsedRequest.data.subject,
      grade_label: parsedRequest.data.gradeLabel,
      teacher_id: parsedRequest.data.teacherId,
    })
    .select("id, name, subject, grade_label, teacher_id")
    .single<ClassRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ class: toClassResponse(data) });
}

export async function PATCH(request: Request) {
  const parsedRequest = await parseClassRequest(request, { requireClassId: true });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const teacherCheck = await validateTeacher({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    teacherId: parsedRequest.data.teacherId,
  });

  if (!teacherCheck.ok) {
    return NextResponse.json({ error: teacherCheck.error }, { status: 400 });
  }

  const { data, error } = await workspace.admin
    .from("classes")
    .update({
      name: parsedRequest.data.name,
      subject: parsedRequest.data.subject,
      grade_label: parsedRequest.data.gradeLabel,
      teacher_id: parsedRequest.data.teacherId,
    })
    .eq("id", parsedRequest.data.classId)
    .eq("academy_id", workspace.profile.academy_id)
    .select("id, name, subject, grade_label, teacher_id")
    .maybeSingle<ClassRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "수정할 반을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ class: toClassResponse(data) });
}

async function getAuthorizedWorkspace(): Promise<
  | {
      ok: true;
      admin: ReturnType<typeof createSupabaseAdminClient>;
      profile: ProfileRecord;
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

  if (profile.role !== "owner" && profile.role !== "manager") {
    return { ok: false, status: 403, error: "반 관리는 원장 또는 관리자만 할 수 있습니다." };
  }

  return { ok: true, admin, profile };
}

async function parseClassRequest(
  request: Request,
  { requireClassId }: { requireClassId: boolean },
): Promise<{ ok: true; data: ClassPayload } | { ok: false; error: string }> {
  let body: ClassRequest;

  try {
    body = (await request.json()) as ClassRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const classId = optionalText(body.classId);

  if (requireClassId && !classId) {
    return { ok: false, error: "수정할 반 ID가 필요합니다." };
  }

  const name = optionalText(body.name);

  if (!name) {
    return { ok: false, error: "반 이름이 필요합니다." };
  }

  if (name.length > 60) {
    return { ok: false, error: "반 이름은 60자 이하로 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      classId: classId ?? undefined,
      name,
      subject: optionalText(body.subject),
      gradeLabel: optionalText(body.gradeLabel),
      teacherId: optionalText(body.teacherId),
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

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toClassResponse(classRecord: ClassRecord) {
  return {
    id: classRecord.id,
    name: classRecord.name,
    subject: classRecord.subject,
    gradeLabel: classRecord.grade_label,
    teacherId: classRecord.teacher_id,
  };
}
