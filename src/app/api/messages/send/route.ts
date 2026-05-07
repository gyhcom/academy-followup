import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms/solapi";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type SendMessageRequest = {
  followupId?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type FollowupRecord = {
  id: string;
  academy_id: string;
  student_id: string;
  class_id: string | null;
  message_body: string;
  status: string;
  students: {
    parent_phone: string;
    status: string;
  } | null;
  classes: {
    teacher_id: string | null;
  } | null;
};

export async function POST(request: Request) {
  const parsedRequest = await parseSendMessageRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json({
      error: "Supabase 세션 환경변수가 설정되지 않았습니다.",
    }, { status: 500 });
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
    .select("role, academy_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json(
      { error: "학원 워크스페이스 연결이 필요합니다." },
      { status: 403 },
    );
  }

  const { data: followup, error: followupError } = await admin
    .from("followups")
    .select(
      "id, academy_id, student_id, class_id, message_body, status, students(parent_phone, status), classes(teacher_id)",
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

  if (!canSendFollowup(profile.role, followup.classes, user.id)) {
    return NextResponse.json(
      { error: "이 팔로업 기록을 발송할 권한이 없습니다." },
      { status: 403 },
    );
  }

  const recipientPhone = normalizePhone(followup.students.parent_phone);

  if (!recipientPhone) {
    return NextResponse.json(
      { error: "학부모 연락처 형식이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const dryRun = process.env.SMS_DRY_RUN !== "false";

  if (dryRun) {
    await saveMessageResult({
      admin,
      academyId: profile.academy_id,
      followupId: followup.id,
      recipientPhone,
      status: "dry_run",
    });

    return NextResponse.json({
      dryRun: true,
      message: "SMS_DRY_RUN이 활성화되어 실제 문자를 발송하지 않았습니다.",
      recipientPhone: maskPhone(recipientPhone),
      followupId: followup.id,
    });
  }

  try {
    const result = await sendSms({
      to: recipientPhone,
      text: followup.message_body,
    });
    const providerMessageId = getProviderMessageId(result);

    await saveMessageResult({
      admin,
      academyId: profile.academy_id,
      followupId: followup.id,
      recipientPhone,
      status: "sent",
      providerMessageId,
    });

    return NextResponse.json({
      dryRun: false,
      message: "문자를 발송했습니다.",
      recipientPhone: maskPhone(recipientPhone),
      followupId: followup.id,
      providerMessageId,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "문자 발송에 실패했습니다.";

    await saveMessageResult({
      admin,
      academyId: profile.academy_id,
      followupId: followup.id,
      recipientPhone,
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

function canSendFollowup(
  role: string,
  classRecord: { teacher_id: string | null } | null,
  userId: string,
) {
  if (role === "owner" || role === "manager") {
    return true;
  }

  return classRecord?.teacher_id === userId;
}

async function saveMessageResult({
  admin,
  academyId,
  followupId,
  recipientPhone,
  status,
  providerMessageId,
  errorMessage,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  followupId: string;
  recipientPhone: string;
  status: "dry_run" | "sent" | "failed";
  providerMessageId?: string;
  errorMessage?: string;
}) {
  const followupStatus = status === "failed" ? "failed" : "sent";
  const sentAt = status === "failed" ? null : new Date().toISOString();

  const [logResult, followupResult] = await Promise.all([
    admin.from("message_logs").insert({
      academy_id: academyId,
      followup_id: followupId,
      provider: "solapi",
      provider_message_id: providerMessageId ?? null,
      recipient_phone: recipientPhone,
      status,
      error_message: errorMessage ?? null,
    }),
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
