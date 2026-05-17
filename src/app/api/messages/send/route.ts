import { NextResponse } from "next/server";
import type { MessageRecipientType } from "@/lib/message-recipients";
import { getMessageLengthError } from "@/lib/message-length";
import { canSendFollowupMessage } from "@/lib/permissions";
import { getRouteWorkspace } from "@/lib/server/route-workspace";
import { sendSms } from "@/lib/sms/solapi";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SendMessageRequest = {
  followupId?: unknown;
};

type FollowupRecord = {
  id: string;
  academy_id: string;
  student_id: string;
  class_id: string | null;
  reason: string;
  message_body: string;
  recipient_type: MessageRecipientType;
  status: string;
  students: {
    parent_phone: string;
    student_phone: string | null;
    status: string;
  } | null;
  classes: {
    teacher_id: string | null;
  } | null;
};

type AcademySettingsRecord = {
  duplicate_guard_minutes: number | null;
  allow_assistant_send: boolean;
  sms_dry_run: boolean;
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

  const parsedRequest = await parseSendMessageRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const { data: followup, error: followupError } = await admin
    .from("followups")
    .select(
      "id, academy_id, student_id, class_id, reason, message_body, recipient_type, status, students(parent_phone, student_phone, status), classes(teacher_id)",
    )
    .eq("id", parsedRequest.followupId)
    .eq("academy_id", profile.academy_id)
    .maybeSingle<FollowupRecord>();

  if (followupError) {
    return NextResponse.json({ error: followupError.message }, { status: 500 });
  }

  if (!followup || !followup.students) {
    return NextResponse.json(
      { error: "발송할 팔로업 기록을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (followup.students.status !== "active") {
    return NextResponse.json(
      { error: "비활성 학생에게는 문자를 발송할 수 없습니다." },
      { status: 403 },
    );
  }

  const { data: settings, error: settingsError } = await admin
    .from("academy_settings")
    .select("allow_assistant_send, sms_dry_run")
    .eq("academy_id", profile.academy_id)
    .maybeSingle<AcademySettingsRecord>();

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  if (
    !canSendFollowupMessage({
      role: profile.role,
      classTeacherId: followup.classes?.teacher_id ?? null,
      userId,
      allowAssistantSend: settings?.allow_assistant_send ?? false,
    })
  ) {
    return NextResponse.json(
      { error: "이 팔로업 기록을 발송할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const recipients = getMessageRecipients({
    recipientType: followup.recipient_type,
    parentPhone: followup.students.parent_phone,
    studentPhone: followup.students.student_phone,
  });

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "발송 가능한 수신자 연락처가 없습니다." },
      { status: 400 },
    );
  }

  const messageLengthError = getMessageLengthError(followup.message_body);

  if (messageLengthError) {
    return NextResponse.json({ error: messageLengthError }, { status: 400 });
  }

  const duplicateCheck = await getDuplicateSendCheck({
    admin,
    academyId: profile.academy_id,
    studentId: followup.student_id,
    reason: followup.reason,
    recipientType: followup.recipient_type,
  });

  if (!duplicateCheck.ok) {
    return NextResponse.json({ error: duplicateCheck.error }, { status: 500 });
  }

  if (duplicateCheck.isDuplicate) {
    return NextResponse.json(
      {
        error:
          "최근 발송 기록이 있어 중복 발송을 차단했습니다. 같은 학생/사유/수신자에게 이미 문자를 보냈습니다.",
        duplicate: true,
        duplicateGuardMinutes: duplicateCheck.duplicateGuardMinutes,
      },
      { status: 409 },
    );
  }

  const dryRun = settings?.sms_dry_run ?? process.env.SMS_DRY_RUN !== "false";

  if (dryRun) {
    await saveMessageResult({
      admin,
      academyId: profile.academy_id,
      followupId: followup.id,
      recipients,
      status: "dry_run",
    });

    return NextResponse.json({
      dryRun: true,
      message: "SMS_DRY_RUN이 활성화되어 실제 문자를 발송하지 않았습니다.",
      recipientPhone: recipients.map((recipient) => maskPhone(recipient.phone)).join(", "),
      recipientCount: recipients.length,
      followupId: followup.id,
    });
  }

  try {
    const sentResults = [];

    for (const recipient of recipients) {
      const result = await sendSms({
        to: recipient.phone,
        text: followup.message_body,
      });

      sentResults.push({
        recipient,
        providerMessageId: getProviderMessageId(result),
      });
    }

    await saveMessageResult({
      admin,
      academyId: profile.academy_id,
      followupId: followup.id,
      recipients: sentResults.map((result) => ({
        ...result.recipient,
        providerMessageId: result.providerMessageId,
      })),
      status: "sent",
    });

    return NextResponse.json({
      dryRun: false,
      message: "문자를 발송했습니다.",
      recipientPhone: recipients.map((recipient) => maskPhone(recipient.phone)).join(", "),
      recipientCount: recipients.length,
      followupId: followup.id,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "문자 발송에 실패했습니다.";

    await saveMessageResult({
      admin,
      academyId: profile.academy_id,
      followupId: followup.id,
      recipients,
      status: "failed",
      errorMessage,
    });

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function parseSendMessageRequest(request: Request): Promise<
  | { ok: true; followupId: string }
  | { ok: false; error: string }
> {
  let body: SendMessageRequest;

  try {
    body = (await request.json()) as SendMessageRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  if (typeof body.followupId !== "string" || body.followupId.length === 0) {
    return { ok: false, error: "팔로업 ID가 필요합니다." };
  }

  return { ok: true, followupId: body.followupId };
}

async function getDuplicateSendCheck({
  admin,
  academyId,
  studentId,
  reason,
  recipientType,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  studentId: string;
  reason: string;
  recipientType: MessageRecipientType;
}): Promise<
  | { ok: true; isDuplicate: boolean; duplicateGuardMinutes: number }
  | { ok: false; error: string }
> {
  const { data: settings, error: settingsError } = await admin
    .from("academy_settings")
    .select("duplicate_guard_minutes")
    .eq("academy_id", academyId)
    .maybeSingle<AcademySettingsRecord>();

  if (settingsError) {
    return { ok: false, error: settingsError.message };
  }

  const duplicateGuardMinutes = Math.max(
    0,
    settings?.duplicate_guard_minutes ?? 1440,
  );
  const duplicateWindowStartedAt = getDuplicateWindowStartedAt(
    duplicateGuardMinutes,
  );

  const { data: duplicateFollowup, error: duplicateError } = await admin
    .from("followups")
    .select("id")
    .eq("academy_id", academyId)
    .eq("student_id", studentId)
    .eq("reason", reason)
    .eq("recipient_type", recipientType)
    .eq("status", "sent")
    .gte("sent_at", duplicateWindowStartedAt)
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (duplicateError) {
    return { ok: false, error: duplicateError.message };
  }

  return {
    ok: true,
    isDuplicate: Boolean(duplicateFollowup),
    duplicateGuardMinutes,
  };
}

function getDuplicateWindowStartedAt(duplicateGuardMinutes: number) {
  const now = new Date();
  const guardWindowStart = new Date(
    now.getTime() - duplicateGuardMinutes * 60 * 1000,
  );
  const todayStart = getKoreanDayStart(now);
  const earlierStart =
    todayStart.getTime() < guardWindowStart.getTime()
      ? todayStart
      : guardWindowStart;

  return earlierStart.toISOString();
}

function getKoreanDayStart(date: Date) {
  const koreanDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = koreanDateParts.find((part) => part.type === "year")?.value;
  const month = koreanDateParts.find((part) => part.type === "month")?.value;
  const day = koreanDateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date(date);
  }

  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
}

async function saveMessageResult({
  admin,
  academyId,
  followupId,
  recipients,
  status,
  errorMessage,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  followupId: string;
  recipients: Array<{
    recipientType: MessageRecipientType;
    phone: string;
    providerMessageId?: string;
  }>;
  status: "dry_run" | "sent" | "failed";
  errorMessage?: string;
}) {
  const followupStatus = status === "failed" ? "failed" : "sent";
  const sentAt = status === "failed" ? null : new Date().toISOString();

  const [logResult, followupResult] = await Promise.all([
    admin.from("message_logs").insert(
      recipients.map((recipient) => ({
        academy_id: academyId,
        followup_id: followupId,
        provider: "solapi",
        provider_message_id: recipient.providerMessageId ?? null,
        recipient_phone: recipient.phone,
        recipient_type: recipient.recipientType,
        status,
        error_message: errorMessage ?? null,
      })),
    ),
    admin
      .from("followups")
      .update({
        status: followupStatus,
        sent_at: sentAt,
      })
      .eq("id", followupId)
      .eq("academy_id", academyId),
  ]);

  if (logResult.error) {
    throw new Error(logResult.error.message);
  }

  if (followupResult.error) {
    throw new Error(followupResult.error.message);
  }
}

function getMessageRecipients({
  recipientType,
  parentPhone,
  studentPhone,
}: {
  recipientType: MessageRecipientType;
  parentPhone: string;
  studentPhone: string | null;
}) {
  const recipients: Array<{ recipientType: MessageRecipientType; phone: string }> = [];
  const normalizedParentPhone = normalizePhone(parentPhone);
  const normalizedStudentPhone = normalizePhone(studentPhone ?? "");

  if ((recipientType === "parent" || recipientType === "both") && normalizedParentPhone) {
    recipients.push({ recipientType: "parent", phone: normalizedParentPhone });
  }

  if ((recipientType === "student" || recipientType === "both") && normalizedStudentPhone) {
    recipients.push({ recipientType: "student", phone: normalizedStudentPhone });
  }

  return recipients;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    return "";
  }

  return digits;
}

function maskPhone(phone: string) {
  if (phone.length < 7) {
    return "연락처 확인";
  }

  return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
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
