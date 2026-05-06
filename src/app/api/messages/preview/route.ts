import { NextResponse } from "next/server";
import {
  isFollowupReason,
  renderFollowupTemplate,
  type FollowupReason,
} from "@/lib/followup-templates";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type PreviewMessageRequest = {
  studentId?: unknown;
  reason?: unknown;
};

type ProfileWithAcademy = {
  name: string;
  role: string;
  academy_id: string;
  academies: {
    name: string;
    sender_name: string | null;
  } | null;
};

type StudentRecord = {
  id: string;
  academy_id: string;
  class_id: string | null;
  name: string;
  status: string;
};

type ClassRecord = {
  id: string;
  academy_id: string;
  name: string;
  teacher_id: string | null;
};

type MessageTemplateRecord = {
  id: string;
  title: string;
  body: string;
};

export async function POST(request: Request) {
  const parsedRequest = await parsePreviewRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase 세션 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { error: "서버 전용 Supabase 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("name, role, academy_id, academies(name, sender_name)")
    .eq("id", user.id)
    .maybeSingle<ProfileWithAcademy>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile || !profile.academies) {
    return NextResponse.json(
      { error: "학원 워크스페이스 연결이 필요합니다." },
      { status: 403 },
    );
  }

  const [studentResult, templateResult] = await Promise.all([
    admin
      .from("students")
      .select("id, academy_id, class_id, name, status")
      .eq("id", parsedRequest.studentId)
      .eq("academy_id", profile.academy_id)
      .maybeSingle<StudentRecord>(),
    admin
      .from("message_templates")
      .select("id, title, body")
      .eq("academy_id", profile.academy_id)
      .eq("reason", parsedRequest.reason)
      .eq("is_active", true)
      .maybeSingle<MessageTemplateRecord>(),
  ]);

  if (studentResult.error) {
    return NextResponse.json({ error: studentResult.error.message }, { status: 500 });
  }

  if (templateResult.error) {
    return NextResponse.json({ error: templateResult.error.message }, { status: 500 });
  }

  if (!studentResult.data) {
    return NextResponse.json(
      { error: "선택한 학생을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (studentResult.data.status !== "active") {
    return NextResponse.json(
      { error: "비활성 학생은 문자 미리보기를 만들 수 없습니다." },
      { status: 403 },
    );
  }

  if (!templateResult.data) {
    return NextResponse.json(
      { error: "선택한 사유의 활성 문자 템플릿이 없습니다." },
      { status: 404 },
    );
  }

  const classRecord = await getStudentClass({
    admin,
    academyId: profile.academy_id,
    classId: studentResult.data.class_id,
  });

  if (classRecord.error) {
    return NextResponse.json({ error: classRecord.error }, { status: 500 });
  }

  if (!canPreviewStudent(profile.role, classRecord.data, user.id)) {
    return NextResponse.json(
      { error: "이 학생의 문자 미리보기를 만들 권한이 없습니다." },
      { status: 403 },
    );
  }

  const senderName = profile.academies.sender_name ?? profile.academies.name;
  const body = renderFollowupTemplate(templateResult.data.body, {
    academyName: senderName,
    studentName: studentResult.data.name,
    teacherName: profile.name,
    className: classRecord.data?.name,
  });

  return NextResponse.json({
    templateId: templateResult.data.id,
    title: templateResult.data.title,
    body,
    reason: parsedRequest.reason,
    student: {
      id: studentResult.data.id,
      name: studentResult.data.name,
    },
  });
}

async function parsePreviewRequest(request: Request): Promise<
  | { ok: true; studentId: string; reason: FollowupReason }
  | { ok: false; error: string }
> {
  let body: PreviewMessageRequest;

  try {
    body = (await request.json()) as PreviewMessageRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  if (typeof body.studentId !== "string" || body.studentId.length === 0) {
    return { ok: false, error: "학생 ID가 필요합니다." };
  }

  if (!isFollowupReason(body.reason)) {
    return { ok: false, error: "지원하지 않는 팔로업 사유입니다." };
  }

  return {
    ok: true,
    studentId: body.studentId,
    reason: body.reason,
  };
}

async function getStudentClass({
  admin,
  academyId,
  classId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  classId: string | null;
}): Promise<{ data: ClassRecord | null; error: string | null }> {
  if (!classId) {
    return { data: null, error: null };
  }

  const { data, error } = await admin
    .from("classes")
    .select("id, academy_id, name, teacher_id")
    .eq("id", classId)
    .eq("academy_id", academyId)
    .maybeSingle<ClassRecord>();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

function canPreviewStudent(
  role: string,
  classRecord: ClassRecord | null,
  userId: string,
) {
  if (role === "owner" || role === "manager") {
    return true;
  }

  return classRecord?.teacher_id === userId;
}
