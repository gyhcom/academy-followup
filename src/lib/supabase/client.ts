import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export function createSupabaseBrowserClient() {
  if (!env.supabaseUrl || !env.supabasePublishableKey) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return createBrowserClient(env.supabaseUrl, env.supabasePublishableKey);
}
