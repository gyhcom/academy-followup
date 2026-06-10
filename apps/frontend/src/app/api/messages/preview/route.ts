import { NextResponse } from "next/server";
import {
  getDefaultFollowupTemplate,
  getDefaultFollowupTitle,
  isFollowupReason,
  renderFollowupTemplate,
  type FollowupReason,
} from "@/lib/followup-templates";
import {
  getRouteWorkspace,
  getStudentForFollowupAccess,
} from "@/lib/server/route-workspace";
import { getMessageLengthMetrics } from "@/lib/message-length";

type PreviewMessageRequest = {
  studentId?: unknown;
  reason?: unknown;
  makeupCandidateTime?: unknown;
};

type ProfileWithAcademy = {
  name: string;
  academies: {
    name: string;
    sender_name: string | null;
  } | null;
};

type MessageTemplateRecord = {
  id: string;
  title: string;
  body: string;
};

export async function POST(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const { admin, profile, userId } = workspaceResult.workspace;

  const parsedRequest = await parsePreviewRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const [profileResult, templateResult] = await Promise.all([
    admin
      .from("profiles")
      .select("name, academies(name, sender_name)")
      .eq("id", userId)
      .maybeSingle<ProfileWithAcademy>(),
    admin
      .from("message_templates")
      .select("id, title, body")
      .eq("academy_id", profile.academy_id)
      .eq("reason", parsedRequest.reason)
      .eq("is_active", true)
      .maybeSingle<MessageTemplateRecord>(),
  ]);

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  if (templateResult.error) {
    return NextResponse.json({ error: templateResult.error.message }, { status: 500 });
  }

  if (!profileResult.data || !profileResult.data.academies) {
    return NextResponse.json(
      { error: "학원 워크스페이스 연결이 필요합니다." },
      { status: 403 },
    );
  }

  const accessResult = await getStudentForFollowupAccess({
    workspace: workspaceResult.workspace,
    studentId: parsedRequest.studentId,
    requireActiveStudent: true,
    inactiveError: "비활성 학생은 문자 미리보기를 만들 수 없습니다.",
    permissionError: "이 학생의 문자 미리보기를 만들 권한이 없습니다.",
  });

  if (!accessResult.ok) {
    return NextResponse.json(
      { error: accessResult.error },
      { status: accessResult.status },
    );
  }

  const templateBody =
    templateResult.data?.body ?? getDefaultFollowupTemplate(parsedRequest.reason);
  const templateTitle =
    templateResult.data?.title ?? getDefaultFollowupTitle(parsedRequest.reason);
  const senderName =
    profileResult.data.academies.sender_name ?? profileResult.data.academies.name;
  const body = renderFollowupTemplate(templateBody, {
    academyName: senderName,
    studentName: accessResult.student.name,
    teacherName: profileResult.data.name,
    className: accessResult.classRecord?.name,
    makeupCandidateTime: parsedRequest.makeupCandidateTime,
  });

  return NextResponse.json({
    templateId: templateResult.data?.id ?? null,
    title: templateTitle,
    body,
    metrics: getMessageLengthMetrics(body),
    reason: parsedRequest.reason,
    student: {
      id: accessResult.student.id,
      name: accessResult.student.name,
    },
  });
}

async function parsePreviewRequest(request: Request): Promise<
  | {
      ok: true;
      studentId: string;
      reason: FollowupReason;
      makeupCandidateTime?: string;
    }
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
    return { ok: false, error: "지원하지 않는 연락 사유입니다." };
  }

  if (
    body.makeupCandidateTime !== undefined &&
    (typeof body.makeupCandidateTime !== "string" ||
      body.makeupCandidateTime.length > 80)
  ) {
    return { ok: false, error: "보강 후보 시간 형식이 올바르지 않습니다." };
  }

  return {
    ok: true,
    studentId: body.studentId,
    reason: body.reason,
    makeupCandidateTime: body.makeupCandidateTime?.trim() || undefined,
  };
}
