import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

export type PlatformAdminRecord = {
  user_id: string;
  role: string;
};

export async function getPlatformAdminContext(): Promise<
  | {
      ok: true;
      admin: ReturnType<typeof createSupabaseAdminClient>;
      userId: string;
      email: string;
      platformAdmin: PlatformAdminRecord;
    }
  | { ok: false; status: number; error: string }
> {
  if (!hasSupabaseServerEnv()) {
    return {
      ok: false,
      status: 500,
      error: "Supabase 세션 환경변수가 설정되지 않았습니다.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  if (!hasSupabaseAdminEnv()) {
    return {
      ok: false,
      status: 500,
      error: "서버 전용 Supabase 키가 설정되지 않았습니다.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: platformAdmin, error } = await admin
    .from("platform_admins")
    .select("user_id, role")
    .eq("user_id", user.id)
    .maybeSingle<PlatformAdminRecord>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!platformAdmin) {
    return { ok: false, status: 403, error: "슈퍼어드민 권한이 필요합니다." };
  }

  return {
    ok: true,
    admin,
    userId: user.id,
    email: user.email ?? "",
    platformAdmin,
  };
}

export async function getPostLoginRedirectTarget() {
  if (!hasSupabaseServerEnv() || !hasSupabaseAdminEnv()) {
    return "/app";
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  const admin = createSupabaseAdminClient();
  const [profileResult, platformResult] = await Promise.all([
    admin
      .from("profiles")
      .select("id, status")
      .eq("id", user.id)
      .maybeSingle<{ id: string; status: string }>(),
    admin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle<{ user_id: string }>(),
  ]);

  const hasActiveProfile =
    !profileResult.error && Boolean(profileResult.data?.status === "active");
  const hasPlatformAdmin = !platformResult.error && Boolean(platformResult.data);

  if (hasActiveProfile) {
    return "/app";
  }

  if (hasPlatformAdmin) {
    return "/platform";
  }

  return "/app";
}
