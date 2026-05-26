import { NextResponse } from "next/server";
import { getPlatformAdminContext } from "@/lib/server/platform-admin";

const academyPlans = ["free", "starter", "standard", "pro", "pilot"] as const;
const academyStatuses = ["active", "trialing", "paused", "cancelled"] as const;

type AcademyPlan = (typeof academyPlans)[number];
type AcademyStatus = (typeof academyStatuses)[number];

type AcademyRequest = {
  action?: unknown;
  academyId?: unknown;
  name?: unknown;
  slug?: unknown;
  category?: unknown;
  plan?: unknown;
  status?: unknown;
  ownerEmail?: unknown;
  ownerName?: unknown;
  ownerPassword?: unknown;
};

export async function GET() {
  const context = await getPlatformAdminContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const { data, error } = await context.admin
    .from("academies")
    .select("id, name, slug, plan, status, category, owner_user_id, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ academies: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getPlatformAdminContext();

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  let body: AcademyRequest;

  try {
    body = (await request.json()) as AcademyRequest;
  } catch {
    return NextResponse.json({ error: "요청 본문을 읽을 수 없습니다." }, { status: 400 });
  }

  const action = optionalText(body.action) ?? "create";

  if (action === "create") {
    return createAcademy({ context, body });
  }

  if (action === "update_status") {
    return updateAcademyStatus({ context, body });
  }

  return NextResponse.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
}

async function createAcademy({
  context,
  body,
}: {
  context: Awaited<ReturnType<typeof getPlatformAdminContext>> & { ok: true };
  body: AcademyRequest;
}) {
  const name = optionalText(body.name);
  const slug = normalizeSlug(optionalText(body.slug));
  const category = optionalText(body.category);
  const plan = parsePlan(body.plan);
  const status = parseStatus(body.status) ?? "active";
  const ownerEmail = optionalText(body.ownerEmail)?.toLowerCase();
  const ownerName = optionalText(body.ownerName);
  const ownerPassword = optionalText(body.ownerPassword);

  if (!name || !slug || !ownerEmail || !ownerName || !ownerPassword) {
    return NextResponse.json(
      { error: "학원명, slug, 원장 이메일, 원장 이름, 임시 비밀번호가 필요합니다." },
      { status: 400 },
    );
  }

  if (!plan) {
    return NextResponse.json({ error: "지원하지 않는 플랜입니다." }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "지원하지 않는 학원 상태입니다." }, { status: 400 });
  }

  if (ownerPassword.length < 8) {
    return NextResponse.json(
      { error: "원장 임시 비밀번호는 8자 이상이어야 합니다." },
      { status: 400 },
    );
  }

  const { data: existingAcademy, error: existingAcademyError } = await context.admin
    .from("academies")
    .select("id")
    .eq("slug", slug)
    .maybeSingle<{ id: string }>();

  if (existingAcademyError) {
    return NextResponse.json(
      { error: "학원 slug 중복 여부를 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  if (existingAcademy) {
    return NextResponse.json(
      { error: "이미 사용 중인 slug입니다. 다른 slug를 입력해 주세요." },
      { status: 409 },
    );
  }

  const { data: existingUsers, error: existingUserError } =
    await context.admin.auth.admin.listUsers();

  if (existingUserError) {
    return NextResponse.json(
      { error: "원장 이메일 중복 여부를 확인하지 못했습니다." },
      { status: 500 },
    );
  }

  const normalizedOwnerEmail = ownerEmail.toLowerCase();
  const existingUser = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === normalizedOwnerEmail,
  );

  if (existingUser) {
    return NextResponse.json(
      {
        error:
          "이미 Supabase Auth에 등록된 이메일입니다. 다른 이메일을 사용하거나 기존 계정 연결 정책을 별도로 정해야 합니다.",
      },
      { status: 409 },
    );
  }

  const { data: createdUser, error: userError } =
    await context.admin.auth.admin.createUser({
      email: normalizedOwnerEmail,
      password: ownerPassword,
      email_confirm: true,
      user_metadata: {
        name: ownerName,
        role: "owner",
      },
    });

  if (userError || !createdUser.user) {
    return NextResponse.json(
      { error: userError?.message ?? "원장 계정을 생성하지 못했습니다." },
      { status: 500 },
    );
  }

  const ownerUserId = createdUser.user.id;
  let createdAcademyId = "";

  const { data: academy, error: academyError } = await context.admin
    .from("academies")
    .insert({
      name,
      slug,
      category,
      plan,
      status,
      owner_user_id: ownerUserId,
    })
    .select("id, name, slug")
    .single<{ id: string; name: string; slug: string }>();

  if (academyError || !academy) {
    await context.admin.auth.admin.deleteUser(ownerUserId);
    return NextResponse.json(
      { error: academyError?.message ?? "학원을 생성하지 못했습니다." },
      { status: 500 },
    );
  }

  createdAcademyId = academy.id;

  const [settingsResult, profileResult] = await Promise.all([
    context.admin.from("academy_settings").insert({
      academy_id: createdAcademyId,
      sms_dry_run: true,
    }),
    context.admin.from("profiles").insert({
      id: ownerUserId,
      academy_id: createdAcademyId,
      email: normalizedOwnerEmail,
      name: ownerName,
      role: "owner",
      status: "active",
    }),
  ]);

  if (settingsResult.error || profileResult.error) {
    await Promise.all([
      context.admin.from("academies").delete().eq("id", createdAcademyId),
      context.admin.auth.admin.deleteUser(ownerUserId),
    ]);

    return NextResponse.json(
      {
        error:
          settingsResult.error?.message ??
          profileResult.error?.message ??
          "학원 초기 설정을 만들지 못했습니다.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    message: "학원과 원장 계정을 생성했습니다.",
    academy,
  });
}

async function updateAcademyStatus({
  context,
  body,
}: {
  context: Awaited<ReturnType<typeof getPlatformAdminContext>> & { ok: true };
  body: AcademyRequest;
}) {
  const academyId = optionalText(body.academyId);
  const status = parseStatus(body.status);
  const plan = parsePlan(body.plan);

  if (!academyId) {
    return NextResponse.json({ error: "학원 ID가 필요합니다." }, { status: 400 });
  }

  if (!status && !plan) {
    return NextResponse.json({ error: "변경할 상태 또는 플랜이 필요합니다." }, { status: 400 });
  }

  const updatePayload: { status?: AcademyStatus; plan?: AcademyPlan } = {};

  if (status) {
    updatePayload.status = status;
  }

  if (plan) {
    updatePayload.plan = plan;
  }

  const { data, error } = await context.admin
    .from("academies")
    .update(updatePayload)
    .eq("id", academyId)
    .select("id, name, slug, plan, status")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "학원을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ message: "학원 상태를 수정했습니다.", academy: data });
}

function optionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeSlug(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized.length > 0 ? normalized : null;
}

function parsePlan(value: unknown): AcademyPlan | null {
  return typeof value === "string" && academyPlans.includes(value as AcademyPlan)
    ? (value as AcademyPlan)
    : null;
}

function parseStatus(value: unknown): AcademyStatus | null {
  return typeof value === "string" && academyStatuses.includes(value as AcademyStatus)
    ? (value as AcademyStatus)
    : null;
}
