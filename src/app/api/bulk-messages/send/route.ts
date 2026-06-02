import { NextResponse } from "next/server";
import {
  isMessageRecipientType,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import {
  getMessageLengthError,
  normalizeMessageForSending,
} from "@/lib/message-length";
import { canManageAcademy } from "@/lib/permissions";
import {
  resolveBulkMessageRecipients,
  type BulkMessageTargetType,
  type BulkRecipient,
} from "@/lib/server/bulk-message-recipients";
import { getRouteWorkspace } from "@/lib/server/route-workspace";
import { sendSms } from "@/lib/sms/solapi";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type BulkMessageRequest = {
  targetType?: unknown;
  classId?: unknown;
  gradeLabel?: unknown;
  recipientType?: unknown;
  messageBody?: unknown;
  excludeDuplicateRecipients?: unknown;
};

type AcademySettingsRecord = {
  sms_dry_run: boolean;
};

type CreatedFollowupRecord = {
  id: string;
  student_id: string;
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

  if (!canManageAcademy(profile.role)) {
    return NextResponse.json(
      { error: "전체문자는 원장 또는 관리자만 보낼 수 있습니다." },
      { status: 403 },
    );
  }

  const parsedRequest = await parseBulkMessageRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const [recipientsResult, settingsResult] = await Promise.all([
    resolveBulkMessageRecipients({
      admin,
      academyId: profile.academy_id,
      targetType: parsedRequest.targetType,
      classId: parsedRequest.classId,
      gradeLabel: parsedRequest.gradeLabel,
      recipientType: parsedRequest.recipientType,
      excludeDuplicateRecipients: parsedRequest.excludeDuplicateRecipients,
    }),
    admin
      .from("academy_settings")
      .select("sms_dry_run")
      .eq("academy_id", profile.academy_id)
      .maybeSingle<AcademySettingsRecord>(),
  ]);

  if (!recipientsResult.ok) {
    return NextResponse.json(
      { error: recipientsResult.error },
      { status: recipientsResult.status },
    );
  }

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  }

  const dryRun = settingsResult.data?.sms_dry_run ?? process.env.SMS_DRY_RUN !== "false";
  const followups = await createBulkFollowups({
    admin,
    academyId: profile.academy_id,
    teacherId: userId,
    messageBody: parsedRequest.messageBody,
    recipients: recipientsResult.recipients,
  });

  if (!followups.ok) {
    return NextResponse.json({ error: followups.error }, { status: 500 });
  }

  if (dryRun) {
    await saveBulkMessageLogs({
      admin,
      academyId: profile.academy_id,
      followups: followups.records,
      recipients: recipientsResult.recipients,
      status: "dry_run",
    });

    return NextResponse.json({
      dryRun: true,
      message: "전체문자 테스트 발송 기록을 저장했습니다.",
      ...recipientsResult.preview,
    });
  }

  const sentResults = [];

  for (const recipient of recipientsResult.recipients) {
    const result = await sendSms({
      to: recipient.phone,
      text: parsedRequest.messageBody,
    });
    sentResults.push({ ...recipient, providerMessageId: getProviderMessageId(result) });
  }

  await saveBulkMessageLogs({
    admin,
    academyId: profile.academy_id,
    followups: followups.records,
    recipients: sentResults,
    status: "sent",
  });

  return NextResponse.json({
    dryRun: false,
    message: "전체문자를 발송했습니다.",
    ...recipientsResult.preview,
  });
}

async function parseBulkMessageRequest(request: Request): Promise<
  | {
      ok: true;
      targetType: BulkMessageTargetType;
      classId: string | null;
      gradeLabel: string | null;
      recipientType: MessageRecipientType;
      messageBody: string;
      excludeDuplicateRecipients: boolean;
    }
  | { ok: false; error: string }
> {
  let body: BulkMessageRequest;

  try {
    body = (await request.json()) as BulkMessageRequest;
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

  if (typeof body.messageBody !== "string" || body.messageBody.trim().length === 0) {
    return { ok: false, error: "전체문자 본문을 입력해 주세요." };
  }

  const messageBody = normalizeMessageForSending(body.messageBody);
  const messageLengthError = getMessageLengthError(messageBody);

  if (messageLengthError) {
    return { ok: false, error: messageLengthError };
  }

  return {
    ok: true,
    targetType,
    classId: targetType === "class" ? classId : null,
    gradeLabel: targetType === "grade" ? gradeLabel : null,
    recipientType: body.recipientType,
    messageBody,
    excludeDuplicateRecipients: body.excludeDuplicateRecipients !== false,
  };
}

async function createBulkFollowups({
  admin,
  academyId,
  teacherId,
  messageBody,
  recipients,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  teacherId: string;
  messageBody: string;
  recipients: BulkRecipient[];
}): Promise<{ ok: true; records: CreatedFollowupRecord[] } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("followups")
    .insert(
      recipients.map((recipient) => ({
        academy_id: academyId,
        student_id: recipient.studentId,
        class_id: recipient.classId,
        teacher_id: teacherId,
        reason: "consultation",
        message_body: messageBody,
        recipient_type: recipient.recipientType,
        status: "draft",
      })),
    )
    .select("id, student_id")
    .returns<CreatedFollowupRecord[]>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, records: data ?? [] };
}

async function saveBulkMessageLogs({
  admin,
  academyId,
  followups,
  recipients,
  status,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  followups: CreatedFollowupRecord[];
  recipients: Array<BulkRecipient & { providerMessageId?: string }>;
  status: "dry_run" | "sent";
}) {
  const now = new Date().toISOString();

  const [logResult, followupResult] = await Promise.all([
    admin.from("message_logs").insert(
      recipients.map((recipient, index) => ({
        academy_id: academyId,
        followup_id: followups[index]?.id ?? null,
        provider: "solapi",
        provider_message_id: recipient.providerMessageId ?? null,
        recipient_phone: recipient.phone,
        recipient_type: recipient.recipientType,
        status,
        error_message: null,
      })),
    ),
    admin
      .from("followups")
      .update({ status: "sent", sent_at: now })
      .in(
        "id",
        followups.map((followup) => followup.id),
      )
      .eq("academy_id", academyId),
  ]);

  if (logResult.error) {
    throw new Error(logResult.error.message);
  }

  if (followupResult.error) {
    throw new Error(followupResult.error.message);
  }
}

function getProviderMessageId(result: unknown) {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const record = result as Record<string, unknown>;
  const candidate =
    record.messageId ??
    record.message_id ??
    record.groupId ??
    record.group_id ??
    record.requestId;

  return typeof candidate === "string" ? candidate : undefined;
}
