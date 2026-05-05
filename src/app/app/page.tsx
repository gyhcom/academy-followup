import { redirect } from "next/navigation";
import { AlertCircle, School, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/app/app/logout-button";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ProfileWithAcademy = {
  name: string;
  role: string;
  academy_id: string;
  academies: {
    name: string;
    category: string | null;
    brand_color: string;
    sender_name: string | null;
  } | null;
};

export default async function AppPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasSupabaseAdminEnv()) {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="서버 환경변수 확인 필요"
          description="SUPABASE_SERVICE_ROLE_KEY가 없어 학원 워크스페이스 정보를 조회할 수 없습니다."
        />
      </AppShell>
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select(
      "name, role, academy_id, academies(name, category, brand_color, sender_name)",
    )
    .eq("id", user.id)
    .maybeSingle<ProfileWithAcademy>();

  if (error) {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="프로필 조회 실패"
          description={error.message}
        />
      </AppShell>
    );
  }

  if (!profile || !profile.academies) {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="학원 워크스페이스 연결 대기"
          description="로그인은 완료됐지만 아직 학원 프로필이 연결되지 않았습니다. 다음 단계에서 학원 생성/초대 플로우를 붙입니다."
        />
      </AppShell>
    );
  }

  return (
    <AppShell email={user.email ?? ""}>
      <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-emerald-700">
              {profile.academies.category ?? "학원 워크스페이스"}
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950">
              {profile.academies.name} 운영 보드
            </h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {profile.name}님은 현재 {roleLabel(profile.role)} 권한으로 접속 중입니다.
            </p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3 text-emerald-800">
            <ShieldCheck size={24} />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-3">
        <StatusCard label="오늘 팔로업" value="준비 중" />
        <StatusCard label="반/학생 목록" value="다음 단계" />
        <StatusCard label="문자 발송" value="dry-run 예정" />
      </section>
    </AppShell>
  );
}

function AppShell({
  email,
  children,
}: {
  email: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-stone-50">
      <section className="mx-auto w-full max-w-6xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <School size={22} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Academy Follow-up</p>
              <h1 className="text-xl font-semibold text-stone-950">내 학원 운영 보드</h1>
              <p className="mt-1 text-xs text-stone-500">{email}</p>
            </div>
          </div>
          <LogoutButton />
        </header>

        <div className="py-6">{children}</div>
      </section>
    </main>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex gap-3">
        <div className="mt-0.5 text-amber-700">
          <AlertCircle size={21} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: "원장",
    manager: "관리자",
    teacher: "선생님",
    assistant: "보조 선생님",
  };

  return labels[role] ?? role;
}
