import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function hasSupabaseAdminEnv() {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv()) {
    throw new Error("Supabase admin 환경변수가 설정되지 않았습니다.");
  }

  // Service role key는 서버 전용입니다. RLS를 우회하므로 Route Handler 내부 권한 검증과 함께 사용합니다.
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
