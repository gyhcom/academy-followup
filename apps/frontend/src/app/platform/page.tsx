import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/app/app/logout-button";
import {
  PlatformConsole,
  type PlatformAcademySummary,
} from "@/app/platform/platform-console";
import { getPlatformAdminContext } from "@/lib/server/platform-admin";

type AcademyRecord = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  category: string | null;
  owner_user_id: string | null;
  created_at: string;
};

type ProfileRecord = {
  id: string;
  academy_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
};

type ClassRecord = {
  id: string;
  academy_id: string;
};

type StudentRecord = {
  id: string;
  academy_id: string;
  status: string;
};

type AcademySettingRecord = {
  academy_id: string;
};

export default async function PlatformPage() {
  const context = await getPlatformAdminContext();

  if (!context.ok) {
    if (context.status === 401) {
      redirect("/login");
    }

    return (
      <PlatformShell email="">
        <ErrorPanel title="슈퍼어드민 접근 불가" description={context.error} />
      </PlatformShell>
    );
  }

  const [
    academiesResult,
    profilesResult,
    classesResult,
    studentsResult,
    settingsResult,
    myProfileResult,
  ] =
    await Promise.all([
      context.admin
        .from("academies")
        .select("id, name, slug, plan, status, category, owner_user_id, created_at")
        .order("created_at", { ascending: false })
        .returns<AcademyRecord[]>(),
      context.admin
        .from("profiles")
        .select("id, academy_id, email, name, role, status")
        .returns<ProfileRecord[]>(),
      context.admin.from("classes").select("id, academy_id").returns<ClassRecord[]>(),
      context.admin.from("students").select("id, academy_id, status").returns<StudentRecord[]>(),
      context.admin
        .from("academy_settings")
        .select("academy_id")
        .returns<AcademySettingRecord[]>(),
      context.admin
        .from("profiles")
        .select("id")
        .eq("id", context.userId)
        .maybeSingle<{ id: string }>(),
    ]);

  if (
    academiesResult.error ||
    profilesResult.error ||
    classesResult.error ||
    studentsResult.error ||
    settingsResult.error
  ) {
    return (
      <PlatformShell email={context.email}>
        <ErrorPanel
          title="플랫폼 데이터 조회 실패"
          description={
            academiesResult.error?.message ??
            profilesResult.error?.message ??
            classesResult.error?.message ??
            studentsResult.error?.message ??
            settingsResult.error?.message ??
            "학원 현황을 불러오지 못했습니다."
          }
        />
      </PlatformShell>
    );
  }

  const academies = buildAcademySummaries({
    academies: academiesResult.data ?? [],
    profiles: profilesResult.data ?? [],
    classes: classesResult.data ?? [],
    students: studentsResult.data ?? [],
    settings: settingsResult.data ?? [],
  });

  return (
    <PlatformShell email={context.email} hasAcademyProfile={Boolean(myProfileResult.data)}>
      <PlatformConsole academies={academies} />
    </PlatformShell>
  );
}

function buildAcademySummaries({
  academies,
  profiles,
  classes,
  students,
  settings,
}: {
  academies: AcademyRecord[];
  profiles: ProfileRecord[];
  classes: ClassRecord[];
  students: StudentRecord[];
  settings: AcademySettingRecord[];
}): PlatformAcademySummary[] {
  return academies.map((academy) => {
    const academyProfiles = profiles.filter((profile) => profile.academy_id === academy.id);
    const owner =
      academyProfiles.find((profile) => profile.id === academy.owner_user_id) ??
      academyProfiles.find((profile) => profile.role === "owner") ??
      null;

    return {
      id: academy.id,
      name: academy.name,
      slug: academy.slug,
      plan: academy.plan,
      status: academy.status,
      category: academy.category,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
      memberCount: academyProfiles.filter((profile) => profile.status === "active").length,
      classCount: classes.filter((classItem) => classItem.academy_id === academy.id).length,
      studentCount: students.filter(
        (student) => student.academy_id === academy.id && student.status === "active",
      ).length,
      hasSettings: settings.some((setting) => setting.academy_id === academy.id),
      createdAt: academy.created_at,
    };
  });
}

function PlatformShell({
  email,
  hasAcademyProfile = false,
  children,
}: {
  email: string;
  hasAcademyProfile?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F7F3EA]">
      <section className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-8 sm:py-5">
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4 sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-stone-950 text-white">
              <ShieldCheck size={21} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-stone-500">Academy Follow-up</p>
              <h1 className="truncate text-base font-black text-stone-950 sm:text-xl">
                플랫폼 관리자 콘솔
              </h1>
              <p className="mt-1 break-all text-xs text-stone-500">{email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasAcademyProfile ? (
              <Link
                href="/app"
                className="hidden min-h-10 items-center rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 sm:flex"
              >
                학원 앱
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </header>
        <div className="py-4 sm:py-6">{children}</div>
      </section>
    </main>
  );
}

function ErrorPanel({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 text-red-700" size={20} />
        <div>
          <h2 className="text-lg font-black text-stone-950">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
        </div>
      </div>
    </section>
  );
}
