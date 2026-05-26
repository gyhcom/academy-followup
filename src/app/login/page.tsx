import { redirect } from "next/navigation";
import { AlertCircle, School } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";
import { getPostLoginRedirectTarget } from "@/lib/server/platform-admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

export default async function LoginPage() {
  if (hasSupabaseServerEnv()) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(await getPostLoginRedirectTarget());
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-5 py-10">
      <section className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-700 text-white">
            <School size={22} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-500">Academy Follow-up</p>
            <h1 className="text-xl font-semibold text-stone-950">학원 운영 보드 로그인</h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-stone-600">
          원장과 선생님이 수업 후 팔로업 문자를 관리하는 내부 화면입니다.
        </p>

        {hasSupabaseServerEnv() ? (
          <LoginForm />
        ) : (
          <div className="mt-8 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <AlertCircle size={17} />
              Supabase 환경변수 설정 필요
            </div>
            Vercel Production에 Supabase URL과 publishable key를 등록하면 로그인 화면을 사용할 수 있습니다.
          </div>
        )}
      </section>
    </main>
  );
}
