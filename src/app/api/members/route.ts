import { NextResponse } from "next/server";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type MemberRequest = {
  memberId?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  role?: unknown;
  status?: unknown;
  password?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
  status: string;
};

type MemberRecord = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
};

type MemberPayload = {
  memberId?: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  password?: string;
};

const memberRoles = new Set(["owner", "manager", "teacher", "assistant"]);
const memberStatuses = new Set(["active", "inactive"]);

export async function GET() {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const { data, error } = await workspace.admin
    .from("profiles")
    .select("id, email, name, phone, role, status")
    .eq("academy_id", workspace.profile.academy_id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    members: ((data ?? []) as MemberRecord[]).map(toMemberResponse),
  });
}

export async function POST(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseMemberRequest(request, { mode: "create" });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const createdUser = await workspace.admin.auth.admin.createUser({
    email: parsedRequest.data.email,
    password: parsedRequest.data.password,
    email_confirm: true,
    user_metadata: {
      name: parsedRequest.data.name,
      role: parsedRequest.data.role,
      academy_id: workspace.profile.academy_id,
    },
  });

  if (createdUser.error || !createdUser.data.user) {
    return NextResponse.json(
      { error: createdUser.error?.message ?? "구성원 계정을 생성하지 못했습니다." },
      { status: 400 },
    );
  }

  const authUser = createdUser.data.user;
  const { data, error } = await workspace.admin
    .from("profiles")
    .insert({
      id: authUser.id,
      academy_id: workspace.profile.academy_id,
      email: parsedRequest.data.email,
      name: parsedRequest.data.name,
      phone: parsedRequest.data.phone,
      role: parsedRequest.data.role,
      status: parsedRequest.data.status,
    })
    .select("id, email, name, phone, role, status")
    .single<MemberRecord>();

  if (error) {
    await workspace.admin.auth.admin.deleteUser(authUser.id);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: toMemberResponse(data) });
}

export async function PATCH(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseMemberRequest(request, { mode: "edit" });

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const memberId = parsedRequest.data.memberId;

  if (!memberId) {
    return NextResponse.json({ error: "수정할 구성원 ID가 필요합니다." }, { status: 400 });
  }

  if (
    memberId === workspace.userId &&
    (parsedRequest.data.status !== "active" ||
      !["owner", "manager"].includes(parsedRequest.data.role))
  ) {
    return NextResponse.json(
      { error: "현재 로그인한 관리자 계정은 비활성화하거나 권한을 낮출 수 없습니다." },
      { status: 400 },
    );
  }

  const { data: existingMember, error: existingError } = await workspace.admin
    .from("profiles")
    .select("id")
    .eq("id", memberId)
    .eq("academy_id", workspace.profile.academy_id)
    .maybeSingle<{ id: string }>();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (!existingMember) {
    return NextResponse.json({ error: "수정할 구성원을 찾을 수 없습니다." }, { status: 404 });
  }

  const updatedUser = await workspace.admin.auth.admin.updateUserById(memberId, {
    email: parsedRequest.data.email,
    user_metadata: {
      name: parsedRequest.data.name,
      role: parsedRequest.data.role,
      academy_id: workspace.profile.academy_id,
    },
  });

  if (updatedUser.error) {
    return NextResponse.json({ error: updatedUser.error.message }, { status: 400 });
  }

  const { data, error } = await workspace.admin
    .from("profiles")
    .update({
      email: parsedRequest.data.email,
      name: parsedRequest.data.name,
      phone: parsedRequest.data.phone,
      role: parsedRequest.data.role,
      status: parsedRequest.data.status,
    })
    .eq("id", memberId)
    .eq("academy_id", workspace.profile.academy_id)
    .select("id, email, name, phone, role, status")
    .maybeSingle<MemberRecord>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "수정할 구성원을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ member: toMemberResponse(data) });
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
    .select("role, academy_id, status")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!profile) {
    return { ok: false, status: 403, error: "학원 워크스페이스 연결이 필요합니다." };
  }

  if (profile.status !== "active") {
    return { ok: false, status: 403, error: "비활성 구성원은 관리 기능을 사용할 수 없습니다." };
  }

  if (profile.role !== "owner" && profile.role !== "manager") {
    return { ok: false, status: 403, error: "구성원 관리는 원장 또는 관리자만 할 수 있습니다." };
  }

  return { ok: true, admin, profile, userId: user.id };
}

async function parseMemberRequest(
  request: Request,
  { mode }: { mode: "create" | "edit" },
): Promise<{ ok: true; data: MemberPayload } | { ok: false; error: string }> {
  let body: MemberRequest;

  try {
    body = (await request.json()) as MemberRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const memberId = optionalText(body.memberId);

  if (mode === "edit" && !memberId) {
    return { ok: false, error: "수정할 구성원 ID가 필요합니다." };
  }

  const name = optionalText(body.name);

  if (!name) {
    return { ok: false, error: "이름이 필요합니다." };
  }

  if (name.length > 40) {
    return { ok: false, error: "이름은 40자 이하로 입력해 주세요." };
  }

  const email = optionalText(body.email)?.toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "올바른 이메일을 입력해 주세요." };
  }

  const phone = optionalPhone(body.phone);
  const role = optionalText(body.role) ?? "teacher";

  if (!memberRoles.has(role)) {
    return { ok: false, error: "구성원 역할을 확인해 주세요." };
  }

  const status = optionalText(body.status) ?? "active";

  if (!memberStatuses.has(status)) {
    return { ok: false, error: "구성원 상태를 확인해 주세요." };
  }

  const password = optionalText(body.password);

  if (mode === "create" && (!password || password.length < 8)) {
    return { ok: false, error: "임시 비밀번호는 8자 이상으로 입력해 주세요." };
  }

  return {
    ok: true,
    data: {
      memberId: memberId ?? undefined,
      name,
      email,
      phone,
      role,
      status,
      password: password ?? undefined,
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

function optionalPhone(value: unknown) {
  const text = optionalText(value);

  if (!text) {
    return null;
  }

  const digits = text.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    return null;
  }

  return digits;
}

function toMemberResponse(member: MemberRecord) {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    phone: member.phone,
    role: member.role,
    status: member.status,
  };
}
