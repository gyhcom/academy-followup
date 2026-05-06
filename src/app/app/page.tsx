import { redirect } from "next/navigation";
import { AlertCircle, School } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppWorkspace,
  type ManagementClass,
  type ManagementMember,
  type ManagementStudent,
} from "@/app/app/app-workspace";
import { LogoutButton } from "@/app/app/logout-button";
import type { OperationsClass } from "@/app/app/operations-board";
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

type MemberRecord = {
  id: string;
  email: string;
  name: string;
  role: string;
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

  const [classesResult, studentsResult, membersResult] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, subject, grade_label, teacher_id")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    admin
      .from("students")
      .select("id, class_id, name, school_name, grade_label, parent_name, parent_phone, status")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    admin
      .from("profiles")
      .select("id, email, name, role")
      .eq("academy_id", profile.academy_id)
      .order("name"),
  ]);

  if (classesResult.error || studentsResult.error || membersResult.error) {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="운영 데이터 조회 실패"
          description={
            classesResult.error?.message ??
            studentsResult.error?.message ??
            membersResult.error?.message ??
            "반과 학생 정보를 가져오지 못했습니다."
          }
        />
      </AppShell>
    );
  }

  const classes = (classesResult.data ?? []) as ClassRecord[];
  const students = (studentsResult.data ?? []) as StudentRecord[];
  const members = (membersResult.data ?? []) as MemberRecord[];
  const operationsClasses = buildOperationsClasses({
    classes,
    students,
    profileId: user.id,
    role: profile.role,
  });
  const managementClasses = buildManagementClasses({ classes, students, members });
  const managementStudents = buildManagementStudents({ classes, students });
  const managementMembers = buildManagementMembers({ classes, members });

  return (
    <AppShell
      email={user.email ?? ""}
      title={profile.academies.name}
      subtitle={profile.academies.category ?? "학원 워크스페이스"}
    >
      <AppWorkspace
        academyName={profile.academies.name}
        teacherName={profile.name}
        role={profile.role}
        roleLabel={roleLabel(profile.role)}
        classes={operationsClasses}
        managementClasses={managementClasses}
        managementStudents={managementStudents}
        managementMembers={managementMembers}
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
    <main className="min-h-screen bg-stone-50 pb-[env(safe-area-inset-bottom)]">
      <section className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-8 sm:py-5">
        <header className="flex items-start justify-between gap-3 border-b border-stone-200 pb-4 sm:items-center sm:pb-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white sm:size-11">
              <School size={22} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-500">{subtitle}</p>
              <h1 className="text-lg font-semibold leading-snug text-stone-950 sm:text-xl">
                {title}
              </h1>
              <p className="mt-1 break-all text-xs text-stone-500">{email}</p>
            </div>
          </div>
          <LogoutButton />
        </header>

        <div className="py-4 sm:py-6">{children}</div>
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
      .filter((student) => student.status === "active")
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

function buildManagementClasses({
  classes,
  students,
  members,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  members: MemberRecord[];
}): ManagementClass[] {
  return classes.map((classItem) => {
    const teacher = members.find((member) => member.id === classItem.teacher_id);

    return {
      id: classItem.id,
      name: classItem.name,
      subject: classItem.subject,
      gradeLabel: classItem.grade_label,
      teacherName: teacher?.name ?? null,
      studentCount: students.filter(
        (student) => student.class_id === classItem.id && student.status === "active",
      ).length,
    };
  });
}

function buildManagementStudents({
  classes,
  students,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
}): ManagementStudent[] {
  return students.map((student) => {
    const classItem = classes.find((item) => item.id === student.class_id);

    return {
      id: student.id,
      name: student.name,
      className: classItem?.name ?? null,
      schoolName: student.school_name,
      gradeLabel: student.grade_label,
      parentName: student.parent_name,
      maskedParentPhone: maskPhone(student.parent_phone),
      status: student.status,
    };
  });
}

function buildManagementMembers({
  classes,
  members,
}: {
  classes: ClassRecord[];
  members: MemberRecord[];
}): ManagementMember[] {
  return members.map((member) => ({
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    classCount: classes.filter((classItem) => classItem.teacher_id === member.id).length,
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
