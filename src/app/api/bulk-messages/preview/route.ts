import { NextResponse } from "next/server";
import {
  isMessageRecipientType,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import { canManageAcademy } from "@/lib/permissions";
import {
  resolveBulkMessageRecipients,
  type BulkMessageTargetType,
} from "@/lib/server/bulk-message-recipients";
import { getRouteWorkspace } from "@/lib/server/route-workspace";

type BulkMessagePreviewRequest = {
  targetType?: unknown;
  classId?: unknown;
  gradeLabel?: unknown;
  recipientType?: unknown;
  excludeDuplicateRecipients?: unknown;
};

export async function POST(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const { admin, profile } = workspaceResult.workspace;

  if (!canManageAcademy(profile.role)) {
    return NextResponse.json(
      { error: "전체문자는 원장 또는 관리자만 확인할 수 있습니다." },
      { status: 403 },
    );
  }

  const parsedRequest = await parseBulkMessagePreviewRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const recipientsResult = await resolveBulkMessageRecipients({
    admin,
    academyId: profile.academy_id,
    targetType: parsedRequest.targetType,
    classId: parsedRequest.classId,
    gradeLabel: parsedRequest.gradeLabel,
    recipientType: parsedRequest.recipientType,
    excludeDuplicateRecipients: parsedRequest.excludeDuplicateRecipients,
  });

  if (!recipientsResult.ok) {
    return NextResponse.json(
      { error: recipientsResult.error },
      { status: recipientsResult.status },
    );
  }

  return NextResponse.json(recipientsResult.preview);
}

async function parseBulkMessagePreviewRequest(request: Request): Promise<
  | {
      ok: true;
      targetType: BulkMessageTargetType;
      classId: string | null;
      gradeLabel: string | null;
      recipientType: MessageRecipientType;
      excludeDuplicateRecipients: boolean;
    }
  | { ok: false; error: string }
> {
  let body: BulkMessagePreviewRequest;

  try {
    body = (await request.json()) as BulkMessagePreviewRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const targetType = body.targetType;

  if (targetType !== "all" && targetType !== "class" && targetType !== "grade") {
    return { ok: false, error: "전체문자 대상 범위를 확인해 주세요." };
  }

  const classId = typeof body.classId === "string" ? body.classId.trim() : "";
  const gradeLabel = typeof body.gradeLabel === "string" ? body.gradeLabel.trim() : "";

  if (targetType === "class" && !classId) {
    return { ok: false, error: "반을 선택해 주세요." };
  }

  if (targetType === "grade" && !gradeLabel) {
    return { ok: false, error: "학년을 선택해 주세요." };
  }

  if (!isMessageRecipientType(body.recipientType)) {
    return { ok: false, error: "지원하지 않는 문자 수신자입니다." };
  }

  return {
    ok: true,
    targetType,
    classId: targetType === "class" ? classId : null,
    gradeLabel: targetType === "grade" ? gradeLabel : null,
    recipientType: body.recipientType,
    excludeDuplicateRecipients: body.excludeDuplicateRecipients !== false,
  };
}
