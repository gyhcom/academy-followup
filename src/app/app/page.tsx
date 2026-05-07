import { redirect } from "next/navigation";
import { AlertCircle, School } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppWorkspace,
  type ManagementClass,
  type ManagementMember,
  type ManagementStudent,
} from "@/app/app/app-workspace";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
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

type StudentScheduleRecord = {
  id: string;
  student_id: string;
  class_id: string | null;
  teacher_id: string | null;
  schedule_type: string;
  schedule_date: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string | null;
  title: string;
  memo: string | null;
  is_active: boolean;
  source_followup_id: string | null;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  class_id: string;
  teacher_id: string | null;
  attendance_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  checked_at: string | null;
  arrived_at: string | null;
  note: string | null;
  followup_id: string | null;
  followups: Array<{
    status: string;
    sent_at: string | null;
  }> | null;
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

  const attendanceDate = getTodayDateInTimeZone("Asia/Seoul");
  const [
    classesResult,
    studentsResult,
    membersResult,
    schedulesResult,
    attendanceResult,
  ] = await Promise.all([
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
    admin
      .from("student_schedules")
      .select(
        "id, student_id, class_id, teacher_id, schedule_type, schedule_date, day_of_week, start_time, end_time, subject, title, memo, is_active, source_followup_id",
      )
      .eq("academy_id", profile.academy_id)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    admin
      .from("attendance_records")
      .select(
        "id, student_id, class_id, teacher_id, attendance_date, scheduled_start_time, scheduled_end_time, status, checked_at, arrived_at, note, followup_id, followups(status, sent_at)",
      )
      .eq("academy_id", profile.academy_id)
      .eq("attendance_date", attendanceDate)
      .order("scheduled_start_time", { ascending: true }),
  ]);

  if (
    classesResult.error ||
    studentsResult.error ||
    membersResult.error ||
    schedulesResult.error ||
    attendanceResult.error
  ) {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="운영 데이터 조회 실패"
          description={
            classesResult.error?.message ??
            studentsResult.error?.message ??
            membersResult.error?.message ??
            schedulesResult.error?.message ??
            attendanceResult.error?.message ??
            "반과 학생 정보를 가져오지 못했습니다."
          }
        />
      </AppShell>
    );
  }

  const classes = (classesResult.data ?? []) as ClassRecord[];
  const students = (studentsResult.data ?? []) as StudentRecord[];
  const members = (membersResult.data ?? []) as MemberRecord[];
  const schedules = (schedulesResult.data ?? []) as StudentScheduleRecord[];
  const attendanceRecords = (attendanceResult.data ?? []) as AttendanceRecord[];
  const operationsClasses = buildOperationsClasses({
    classes,
    students,
    schedules,
    profileId: user.id,
    role: profile.role,
  });
  const managementClasses = buildManagementClasses({ classes, students, members });
  const managementStudents = buildManagementStudents({ classes, students, schedules });
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
        attendanceDate={attendanceDate}
        attendanceRecords={buildAttendanceRecords(attendanceRecords)}
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
      <section className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-8 sm:py-5">
        <header className="flex items-start justify-between gap-2 border-b border-stone-200 pb-4 sm:items-center sm:gap-3 sm:pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white sm:size-11">
              <School size={21} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-stone-500 sm:text-sm">{subtitle}</p>
              <h1 className="truncate text-base font-semibold leading-snug text-stone-950 sm:text-xl">
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
  schedules,
  profileId,
  role,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  schedules: StudentScheduleRecord[];
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
        schedules: schedules
          .filter((schedule) => schedule.student_id === student.id)
          .map((schedule) => ({
            id: schedule.id,
            classId: schedule.class_id,
            scheduleType: schedule.schedule_type,
            scheduleDate: schedule.schedule_date,
            dayOfWeek: schedule.day_of_week,
            startTime: schedule.start_time.slice(0, 5),
            endTime: schedule.end_time.slice(0, 5),
            subject: schedule.subject,
            title: schedule.title,
            memo: schedule.memo,
            isActive: schedule.is_active,
            sourceFollowupId: schedule.source_followup_id,
          })),
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
      teacherId: classItem.teacher_id,
      teacherName: teacher?.name ?? null,
      studentCount: students.filter(
        (student) => student.class_id === classItem.id && student.status === "active",
      ).length,
    };
  });
}

function buildAttendanceRecords(records: AttendanceRecord[]): AttendanceRecordItem[] {
  return records.map((record) => {
    const followup = record.followups?.[0] ?? null;

    return {
      id: record.id,
      studentId: record.student_id,
      classId: record.class_id,
      teacherId: record.teacher_id,
      attendanceDate: record.attendance_date,
      scheduledStartTime: record.scheduled_start_time.slice(0, 5),
      scheduledEndTime: record.scheduled_end_time.slice(0, 5),
      status: record.status,
      checkedAt: record.checked_at,
      arrivedAt: record.arrived_at,
      note: record.note,
      followupId: record.followup_id,
      followupStatus: followup?.status ?? null,
      followupSentAt: followup?.sent_at ?? null,
    };
  });
}

function buildManagementStudents({
  classes,
  students,
  schedules,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  schedules: StudentScheduleRecord[];
}): ManagementStudent[] {
  return students.map((student) => {
    const classItem = classes.find((item) => item.id === student.class_id);

    return {
      id: student.id,
      classId: student.class_id,
      name: student.name,
      className: classItem?.name ?? null,
      schoolName: student.school_name,
      gradeLabel: student.grade_label,
      parentName: student.parent_name,
      parentPhone: student.parent_phone,
      maskedParentPhone: maskPhone(student.parent_phone),
      status: student.status,
      schedules: schedules
        .filter((schedule) => schedule.student_id === student.id)
        .map((schedule) => ({
          id: schedule.id,
          studentId: schedule.student_id,
          classId: schedule.class_id,
          teacherId: schedule.teacher_id,
          scheduleType: schedule.schedule_type,
          scheduleDate: schedule.schedule_date,
          dayOfWeek: schedule.day_of_week,
          startTime: schedule.start_time.slice(0, 5),
          endTime: schedule.end_time.slice(0, 5),
          subject: schedule.subject,
          title: schedule.title,
          memo: schedule.memo,
          isActive: schedule.is_active,
          sourceFollowupId: schedule.source_followup_id,
        })),
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

function getTodayDateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return `${year}-${month}-${day}`;
}
