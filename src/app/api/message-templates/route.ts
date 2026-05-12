import { NextResponse } from "next/server";
import {
  followupReasons,
  getDefaultFollowupTemplate,
  getDefaultFollowupTitle,
  isFollowupReason,
  type FollowupReason,
} from "@/lib/followup-templates";
import { canManageAcademy } from "@/lib/permissions";
import { getRouteWorkspace } from "@/lib/server/route-workspace";

type TemplateRequest = {
  reason?: unknown;
  title?: unknown;
  body?: unknown;
  isActive?: unknown;
};

type TemplateRecord = {
  id: string;
  reason: FollowupReason;
  title: string;
  body: string;
  is_active: boolean;
  created_at: string;
};

export async function GET() {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  if (!canManageAcademy(workspaceResult.workspace.profile.role)) {
    return NextResponse.json(
      { error: "문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다." },
      { status: 403 },
    );
  }

  const { data, error } = await workspaceResult.workspace.admin
    .from("message_templates")
    .select("id, reason, title, body, is_active, created_at")
    .eq("academy_id", workspaceResult.workspace.profile.academy_id)
    .order("created_at", { ascending: true })
    .returns<TemplateRecord[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const templatesByReason = new Map(
    (data ?? []).map((template) => [template.reason, template]),
  );

  return NextResponse.json({
    templates: followupReasons.map((reason) => {
      const template = templatesByReason.get(reason.id);

      return {
        id: template?.id ?? null,
        reason: reason.id,
        reasonLabel: reason.label,
        title: template?.title ?? getDefaultFollowupTitle(reason.id),
        body: template?.body ?? getDefaultFollowupTemplate(reason.id),
        isActive: template?.is_active ?? true,
      };
    }),
  });
}

export async function PATCH(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  if (!canManageAcademy(workspaceResult.workspace.profile.role)) {
    return NextResponse.json(
      { error: "문자 템플릿 관리는 원장 또는 관리자만 할 수 있습니다." },
      { status: 403 },
    );
  }

  const parsedRequest = await parseTemplateRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const { data, error } = await workspaceResult.workspace.admin
    .from("message_templates")
    .upsert(
      {
        academy_id: workspaceResult.workspace.profile.academy_id,
        reason: parsedRequest.reason,
        title: parsedRequest.title,
        body: parsedRequest.body,
        is_active: parsedRequest.isActive,
      },
      { onConflict: "academy_id,reason" },
    )
    .select("id, reason, title, body, is_active, created_at")
    .single<TemplateRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    template: {
      id: data.id,
      reason: data.reason,
      title: data.title,
      body: data.body,
      isActive: data.is_active,
    },
  });
}

async function parseTemplateRequest(request: Request): Promise<
  | {
      ok: true;
      reason: FollowupReason;
      title: string;
      body: string;
      isActive: boolean;
    }
  | { ok: false; error: string }
> {
  let body: TemplateRequest;

  try {
    body = (await request.json()) as TemplateRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  if (!isFollowupReason(body.reason)) {
    return { ok: false, error: "지원하지 않는 템플릿 사유입니다." };
  }

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return { ok: false, error: "템플릿 제목이 필요합니다." };
  }

  if (typeof body.body !== "string" || body.body.trim().length === 0) {
    return { ok: false, error: "템플릿 본문이 필요합니다." };
  }

  if (body.title.trim().length > 80) {
    return { ok: false, error: "템플릿 제목은 80자 이하로 입력해 주세요." };
  }

  if (body.body.trim().length > 1000) {
    return { ok: false, error: "템플릿 본문은 1000자 이하로 입력해 주세요." };
  }

  return {
    ok: true,
    reason: body.reason,
    title: body.title.trim(),
    body: body.body.trim(),
    isActive: body.isActive !== false,
  };
}
