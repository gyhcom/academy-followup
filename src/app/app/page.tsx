import { redirect } from "next/navigation";
import { AlertCircle, School } from "lucide-react";
import type { ReactNode } from "react";
import { LogoutButton } from "@/app/app/logout-button";
import {
  OperationsBoard,
  type OperationsClass,
} from "@/app/app/operations-board";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

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

type ClassRecord = {
  id: string;
  name: string;
  subject: string | null;
  grade_label: string | null;
  teacher_id: string | null;
};

type StudentRecord = {
  id: string;
  class_id: string | null;
  name: string;
  school_name: string | null;
  grade_label: string | null;
  parent_name: string | null;
  parent_phone: string;
  status: string;
};

export default async function AppPage() {
  if (!hasSupabaseServerEnv()) {
    return (
      <AppShell email="">
        <EmptyState
          title="Supabase 환경변수 설정 필요"
          description="Vercel Production에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 등록해야 로그인 세션을 확인할 수 있습니다."
        />
      </AppShell>
    );
  }

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

  const [classesResult, studentsResult] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, subject, grade_label, teacher_id")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    admin
      .from("students")
      .select("id, class_id, name, school_name, grade_label, parent_name, parent_phone, status")
      .eq("academy_id", profile.academy_id)
      .eq("status", "active")
      .order("name"),
  ]);

  if (classesResult.error || studentsResult.error) {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="운영 데이터 조회 실패"
          description={
            classesResult.error?.message ??
            studentsResult.error?.message ??
            "반과 학생 정보를 가져오지 못했습니다."
          }
        />
      </AppShell>
    );
  }

  const operationsClasses = buildOperationsClasses({
    classes: (classesResult.data ?? []) as ClassRecord[],
    students: (studentsResult.data ?? []) as StudentRecord[],
    profileId: user.id,
    role: profile.role,
  });

  return (
    <AppShell
      email={user.email ?? ""}
      title={profile.academies.name}
      subtitle={profile.academies.category ?? "학원 워크스페이스"}
    >
      <OperationsBoard
        academyName={profile.academies.name}
        senderName={profile.academies.sender_name ?? profile.academies.name}
        teacherName={profile.name}
        roleLabel={roleLabel(profile.role)}
        classes={operationsClasses}
      />
    </AppShell>
  );
}

function AppShell({
  email,
  title = "내 학원 운영 보드",
  subtitle = "Academy Follow-up",
  children,
}: {
  email: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-stone-50">
      <section className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-8">
        <header className="flex flex-col gap-4 border-b border-stone-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <School size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-500">{subtitle}</p>
              <h1 className="truncate text-xl font-semibold text-stone-950">{title}</h1>
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

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: "원장",
    manager: "관리자",
    teacher: "선생님",
    assistant: "보조 선생님",
  };

  return labels[role] ?? role;
}

function buildOperationsClasses({
  classes,
  students,
  profileId,
  role,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  profileId: string;
  role: string;
}): OperationsClass[] {
  const scopedClasses = canViewAllClasses(role)
    ? classes
    : classes.filter((classItem) => classItem.teacher_id === profileId);
  const classIds = new Set(scopedClasses.map((classItem) => classItem.id));

  return scopedClasses.map((classItem) => ({
    id: classItem.id,
    name: classItem.name,
    subject: classItem.subject,
    gradeLabel: classItem.grade_label,
    students: students
      .filter((student) => student.class_id && classIds.has(student.class_id))
      .filter((student) => student.class_id === classItem.id)
      .map((student) => ({
        id: student.id,
        name: student.name,
        schoolName: student.school_name,
        gradeLabel: student.grade_label,
        parentName: student.parent_name,
        maskedParentPhone: maskPhone(student.parent_phone),
      })),
  }));
}

function canViewAllClasses(role: string) {
  return role === "owner" || role === "manager";
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 7) {
    return "연락처 확인";
  }

  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}
