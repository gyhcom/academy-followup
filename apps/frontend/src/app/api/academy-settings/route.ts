import { NextResponse } from "next/server";
import { canManageAcademy } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/server/audit-log";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type SettingsRequest = {
  academyName?: unknown;
  senderName?: unknown;
  senderPhone?: unknown;
  smsDryRun?: unknown;
  duplicateGuardMinutes?: unknown;
  allowAssistantSend?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type SettingsPayload = {
  academyName: string;
  senderName: string | null;
  senderPhone: string | null;
  smsDryRun: boolean;
  duplicateGuardMinutes: number;
  allowAssistantSend: boolean;
};

export async function PATCH(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseSettingsRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const [academyResult, settingsResult] = await Promise.all([
    workspace.admin
      .from("academies")
      .update({
        name: parsedRequest.data.academyName,
        sender_name: parsedRequest.data.senderName,
        sender_phone: parsedRequest.data.senderPhone,
      })
      .eq("id", workspace.profile.academy_id)
      .select("id")
      .maybeSingle<{ id: string }>(),
    workspace.admin
      .from("academy_settings")
      .upsert({
        academy_id: workspace.profile.academy_id,
        sms_dry_run: parsedRequest.data.smsDryRun,
        duplicate_guard_minutes: parsedRequest.data.duplicateGuardMinutes,
        allow_assistant_send: parsedRequest.data.allowAssistantSend,
        updated_at: new Date().toISOString(),
      })
      .select("academy_id")
      .maybeSingle<{ academy_id: string }>(),
  ]);

  if (academyResult.error) {
    return NextResponse.json({ error: academyResult.error.message }, { status: 500 });
  }

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  }

  await writeAuditLog({
    admin: workspace.admin,
    academyId: workspace.profile.academy_id,
    actorUserId: workspace.userId,
    action: "academy_settings.update",
    entityType: "academy_settings",
    entityId: workspace.profile.academy_id,
    summary: "학원 운영 설정을 수정했습니다.",
  });

  return NextResponse.json({
    settings: {
      academyName: parsedRequest.data.academyName,
      senderName: parsedRequest.data.senderName,
      senderPhone: parsedRequest.data.senderPhone,
      smsDryRun: parsedRequest.data.smsDryRun,
      duplicateGuardMinutes: parsedRequest.data.duplicateGuardMinutes,
      allowAssistantSend: parsedRequest.data.allowAssistantSend,
    },
  });
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
    return { ok: false, status: 403, error: "설정 관리는 원장 또는 관리자만 할 수 있습니다." };
  }

  return { ok: true, admin, profile, userId: user.id };
}

async function parseSettingsRequest(
  request: Request,
): Promise<{ ok: true; data: SettingsPayload } | { ok: false; error: string }> {
  let body: SettingsRequest;

  try {
    body = (await request.json()) as SettingsRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const academyName = optionalText(body.academyName);

  if (!academyName) {
    return { ok: false, error: "학원명이 필요합니다." };
  }

  if (academyName.length > 80) {
    return { ok: false, error: "학원명은 80자 이하로 입력해 주세요." };
  }

  const duplicateGuardMinutes = Number(body.duplicateGuardMinutes);

  if (!Number.isInteger(duplicateGuardMinutes) || duplicateGuardMinutes < 0) {
    return { ok: false, error: "중복 발송 방지 시간은 0 이상의 정수로 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      academyName,
      senderName: optionalText(body.senderName),
      senderPhone: normalizePhone(body.senderPhone),
      smsDryRun: body.smsDryRun === true,
      duplicateGuardMinutes,
      allowAssistantSend: body.allowAssistantSend === true,
    },
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
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  const digits = text.replace(/\D/g, "");

  return digits.length >= 9 && digits.length <= 11 ? digits : null;
}
