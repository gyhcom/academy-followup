import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export function hasSupabaseServerEnv() {
  return Boolean(env.supabaseUrl && env.supabasePublishableKey);
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  if (!hasSupabaseServerEnv()) {
    throw new Error("Supabase 환경변수가 설정되지 않았습니다.");
  }

  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot set cookies. Route Handlers and Server Actions can.
        }
      },
    },
  });
}
