import { redirect } from "next/navigation";
import { School } from "lucide-react";
import { LoginForm } from "@/app/login/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/app");
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

        <LoginForm />
      </section>
    </main>
  );
}
