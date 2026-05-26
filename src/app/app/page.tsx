import { redirect } from "next/navigation";
import Link from "next/link";
import { AlertCircle, School } from "lucide-react";
import type { ReactNode } from "react";
import {
  AppWorkspace,
  type HomeScheduleItem,
  type ManagementClass,
  type ManagementMessageTemplate,
  type ManagementMember,
  type ManagementSettings,
  type ManagementStudent,
} from "@/app/app/app-workspace";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
import { LogoutButton } from "@/app/app/logout-button";
import type { OperationsClass } from "@/app/app/operations-board";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  followupReasons,
  getDefaultFollowupTemplate,
  getDefaultFollowupTitle,
  type FollowupReason,
} from "@/lib/followup-templates";
import { canManageAcademy, canViewAllClasses, roleLabel } from "@/lib/permissions";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type ProfileWithAcademy = {
  name: string;
  role: string;
  status: string;
  academy_id: string;
  academies: {
    name: string;
    category: string | null;
    brand_color: string;
    sender_name: string | null;
    sender_phone: string | null;
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
  student_phone: string | null;
  schedule_share_consent_confirmed: boolean;
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
  phone: string | null;
  role: string;
  status: string;
};

type AcademySettingsRecord = {
  sms_dry_run: boolean;
  allow_assistant_send: boolean;
  duplicate_guard_minutes: number;
};

type MessageTemplateRecord = {
  id: string;
  reason: FollowupReason;
  title: string;
  body: string;
  is_active: boolean;
};

type ShareLinkRecord = {
  id: string;
  source_academy_id: string;
  source_student_id: string;
  target_academy_id: string;
  target_student_id: string;
};

type SharedStudentConsentRecord = {
  id: string;
  academy_id: string;
  schedule_share_consent_confirmed: boolean;
};

type SharedScheduleRecord = {
  id: string;
  academy_id: string;
  student_id: string;
  schedule_type: string;
  schedule_date: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string | null;
  title: string;
  is_active: boolean;
};

type ExternalAcademyRecord = {
  id: string;
  name: string;
  category: string | null;
  memo: string | null;
  is_active: boolean;
};

type ExternalAcademyClassRecord = {
  id: string;
  external_academy_id: string;
  title: string;
  subject: string | null;
  schedule_date: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  memo: string | null;
  is_active: boolean;
};

type StudentExternalClassEnrollmentRecord = {
  id: string;
  student_id: string;
  external_academy_class_id: string;
  is_active: boolean;
};

type ManualExternalScheduleRecord = {
  enrollmentId: string;
  studentId: string;
  externalAcademyId: string;
  externalAcademyName: string;
  externalClassId: string;
  title: string;
  subject: string | null;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  memo: string | null;
  isActive: boolean;
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
      "name, role, status, academy_id, academies(name, category, brand_color, sender_name, sender_phone)",
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

  if (profile.status !== "active") {
    return (
      <AppShell email={user.email ?? ""}>
        <EmptyState
          title="비활성 구성원 계정"
          description="이 계정은 현재 비활성 상태입니다. 원장 또는 관리자에게 계정 상태 확인을 요청해 주세요."
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
    settingsResult,
    templatesResult,
  ] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, subject, grade_label, teacher_id")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    admin
      .from("students")
      .select("id, class_id, name, school_name, grade_label, parent_name, parent_phone, student_phone, schedule_share_consent_confirmed, status")
      .eq("academy_id", profile.academy_id)
      .order("name"),
    admin
      .from("profiles")
      .select("id, email, name, phone, role, status")
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
    admin
      .from("academy_settings")
      .select("sms_dry_run, allow_assistant_send, duplicate_guard_minutes")
      .eq("academy_id", profile.academy_id)
      .maybeSingle<AcademySettingsRecord>(),
    admin
      .from("message_templates")
      .select("id, reason, title, body, is_active")
      .eq("academy_id", profile.academy_id)
      .order("created_at", { ascending: true })
      .returns<MessageTemplateRecord[]>(),
  ]);

  if (
    classesResult.error ||
    studentsResult.error ||
    membersResult.error ||
    schedulesResult.error ||
    attendanceResult.error ||
    settingsResult.error ||
    templatesResult.error
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
            settingsResult.error?.message ??
            templatesResult.error?.message ??
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
  const templates = (templatesResult.data ?? []) as MessageTemplateRecord[];
  const { data: platformAdmin } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle<{ user_id: string }>();
  const canManage = canManageAcademy(profile.role);
  const externalData = await loadExternalAcademyData({
    admin,
    academyId: profile.academy_id,
  });
  const manualExternalSchedules = buildManualExternalSchedules(externalData);
  const operationsClasses = buildOperationsClasses({
    classes,
    students,
    schedules,
    manualExternalSchedules,
    profileId: user.id,
    role: profile.role,
  });
  const sharedScheduleItems = await buildSharedHomeScheduleItems({
    admin,
    academyId: profile.academy_id,
    students,
  });
  const homeScheduleSummaryItems = buildHomeScheduleItems({
    classes,
    students,
    schedules,
    manualExternalSchedules,
    sharedScheduleItems,
  });
  const homeScheduleItems = buildHomeScheduleItems({
    classes,
    students: canViewAllClasses(profile.role)
      ? students
      : students.filter((student) =>
          classes.some(
            (classItem) =>
              classItem.id === student.class_id && classItem.teacher_id === user.id,
          ),
        ),
    schedules,
    manualExternalSchedules,
    sharedScheduleItems,
  });
  const managementClasses = canManage
    ? buildManagementClasses({ classes, students, members })
    : [];
  const managementStudents = canManage
    ? buildManagementStudents({
        classes,
        students,
        schedules,
        manualExternalSchedules,
      })
    : [];
  const managementMembers = canManage
    ? buildManagementMembers({ classes, members })
    : [];
  const managementSettings = buildManagementSettings({
    academyName: profile.academies.name,
    senderName: profile.academies.sender_name,
    senderPhone: profile.academies.sender_phone,
    settings: settingsResult.data,
  });
  const managementTemplates = buildManagementTemplates(templates);

  return (
    <AppShell
      email={user.email ?? ""}
      title={profile.academies.name}
      subtitle={profile.academies.category ?? "학원 워크스페이스"}
      hasPlatformAdmin={Boolean(platformAdmin)}
    >
      <AppWorkspace
        academyName={profile.academies.name}
        teacherName={profile.name}
        role={profile.role}
        roleLabel={roleLabel(profile.role)}
        classes={operationsClasses}
        homeScheduleItems={homeScheduleItems}
        homeScheduleSummaryItems={homeScheduleSummaryItems}
        attendanceDate={attendanceDate}
        attendanceRecords={buildAttendanceRecords(attendanceRecords)}
        managementClasses={managementClasses}
        managementStudents={managementStudents}
        managementMembers={managementMembers}
        managementSettings={managementSettings}
        managementTemplates={managementTemplates}
      />
    </AppShell>
  );
}

async function loadExternalAcademyData({
  admin,
  academyId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
}): Promise<{
  externalAcademies: ExternalAcademyRecord[];
  externalClasses: ExternalAcademyClassRecord[];
  externalEnrollments: StudentExternalClassEnrollmentRecord[];
}> {
  const [academiesResult, classesResult, enrollmentsResult] = await Promise.all([
    admin
      .from("external_academies")
      .select("id, name, category, memo, is_active")
      .eq("academy_id", academyId)
      .returns<ExternalAcademyRecord[]>(),
    admin
      .from("external_academy_classes")
      .select(
        "id, external_academy_id, title, subject, schedule_date, day_of_week, start_time, end_time, memo, is_active",
      )
      .eq("academy_id", academyId)
      .returns<ExternalAcademyClassRecord[]>(),
    admin
      .from("student_external_class_enrollments")
      .select("id, student_id, external_academy_class_id, is_active")
      .eq("academy_id", academyId)
      .returns<StudentExternalClassEnrollmentRecord[]>(),
  ]);

  if (
    isMissingExternalAcademyTable(academiesResult.error) ||
    isMissingExternalAcademyTable(classesResult.error) ||
    isMissingExternalAcademyTable(enrollmentsResult.error)
  ) {
    return {
      externalAcademies: [],
      externalClasses: [],
      externalEnrollments: [],
    };
  }

  return {
    externalAcademies: academiesResult.data ?? [],
    externalClasses: classesResult.data ?? [],
    externalEnrollments: enrollmentsResult.data ?? [],
  };
}

function buildManualExternalSchedules({
  externalAcademies,
  externalClasses,
  externalEnrollments,
}: {
  externalAcademies: ExternalAcademyRecord[];
  externalClasses: ExternalAcademyClassRecord[];
  externalEnrollments: StudentExternalClassEnrollmentRecord[];
}): ManualExternalScheduleRecord[] {
  const academyById = new Map(externalAcademies.map((academy) => [academy.id, academy]));
  const classById = new Map(externalClasses.map((classItem) => [classItem.id, classItem]));

  return externalEnrollments
    .filter((enrollment) => enrollment.is_active)
    .map((enrollment): ManualExternalScheduleRecord | null => {
      const classItem = classById.get(enrollment.external_academy_class_id);
      const externalAcademy = classItem
        ? academyById.get(classItem.external_academy_id)
        : null;

      if (!classItem || !classItem.is_active || !externalAcademy?.is_active) {
        return null;
      }

      return {
        enrollmentId: enrollment.id,
        studentId: enrollment.student_id,
        externalAcademyId: externalAcademy.id,
        externalAcademyName: externalAcademy.name,
        externalClassId: classItem.id,
        title: classItem.title,
        subject: classItem.subject,
        scheduleDate: classItem.schedule_date,
        dayOfWeek: classItem.day_of_week,
        startTime: classItem.start_time.slice(0, 5),
        endTime: classItem.end_time.slice(0, 5),
        memo: classItem.memo,
        isActive: true,
      };
    })
    .filter((schedule): schedule is ManualExternalScheduleRecord => Boolean(schedule));
}

function buildManagementTemplates(
  templates: MessageTemplateRecord[],
): ManagementMessageTemplate[] {
  const templatesByReason = new Map(
    templates.map((template) => [template.reason, template]),
  );

  return followupReasons.map((reason) => {
    const template = templatesByReason.get(reason.id);

    return {
      id: template?.id ?? null,
      reason: reason.id,
      reasonLabel: reason.label,
      title: template?.title ?? getDefaultFollowupTitle(reason.id),
      body: template?.body ?? getDefaultFollowupTemplate(reason.id),
      isActive: template?.is_active ?? true,
    };
  });
}

function buildHomeScheduleItems({
  classes,
  students,
  schedules,
  manualExternalSchedules,
  sharedScheduleItems,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  schedules: StudentScheduleRecord[];
  manualExternalSchedules: ManualExternalScheduleRecord[];
  sharedScheduleItems: HomeScheduleItem[];
}): HomeScheduleItem[] {
  const activeStudents = students.filter((student) => student.status === "active");
  const studentIds = new Set(activeStudents.map((student) => student.id));
  const classById = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const groupedClassSchedules = new Map<string, HomeScheduleItem>();
  const studentScheduleItems: HomeScheduleItem[] = [];

  schedules
    .filter((schedule) => schedule.is_active)
    .filter((schedule) => studentIds.has(schedule.student_id))
    .forEach((schedule) => {
      const student = activeStudents.find((item) => item.id === schedule.student_id);
      const classItem = schedule.class_id ? classById.get(schedule.class_id) : null;
      const isClassSession =
        Boolean(classItem) &&
        (schedule.schedule_type === "regular_class" || schedule.schedule_type === "makeup");

      if (isClassSession && classItem) {
        const key = [
          schedule.class_id,
          schedule.schedule_type,
          schedule.schedule_date ?? "weekly",
          schedule.day_of_week,
          schedule.start_time.slice(0, 5),
          schedule.end_time.slice(0, 5),
        ].join(":");
        const existing = groupedClassSchedules.get(key);

        if (existing) {
          groupedClassSchedules.set(key, {
            ...existing,
            studentCount: (existing.studentCount ?? 0) + 1,
          });
          return;
        }

        groupedClassSchedules.set(key, {
          id: `class:${key}`,
          kind: "class_session",
          scheduleType: schedule.schedule_type,
          scheduleDate: schedule.schedule_date,
          dayOfWeek: schedule.day_of_week,
          startTime: schedule.start_time.slice(0, 5),
          endTime: schedule.end_time.slice(0, 5),
          title: classItem.name,
          subtitle: [classItem.grade_label, classItem.subject].filter(Boolean).join(" · "),
          studentName: null,
          className: classItem.name,
          classId: classItem.id,
          studentId: null,
          studentCount: 1,
          isShared: false,
          canOpenAttendance: true,
        });
        return;
      }

      if (!student) {
        return;
      }

      studentScheduleItems.push({
        id: `student:${schedule.id}`,
        kind: "student_schedule",
        scheduleType: schedule.schedule_type,
        scheduleDate: schedule.schedule_date,
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time.slice(0, 5),
        endTime: schedule.end_time.slice(0, 5),
        title: student.name,
        subtitle: schedule.title || [schedule.subject, student.grade_label].filter(Boolean).join(" · "),
        studentName: student.name,
        className: classItem?.name ?? null,
        classId: schedule.class_id,
        studentId: student.id,
        studentCount: null,
        isShared: false,
        canOpenAttendance: false,
      });
    });

  return [
    ...Array.from(groupedClassSchedules.values()),
    ...studentScheduleItems,
    ...manualExternalSchedules
      .filter((schedule) => schedule.isActive)
      .filter((schedule) => studentIds.has(schedule.studentId))
      .map((schedule) => {
        const student = activeStudents.find((item) => item.id === schedule.studentId);

        return {
          id: `manual-external:${schedule.enrollmentId}`,
          kind: "manual_external_class" as const,
          scheduleType: "manual_external_class",
          scheduleDate: schedule.scheduleDate,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          title: student?.name ?? "학생",
          subtitle: [schedule.externalAcademyName, schedule.title, schedule.subject]
            .filter(Boolean)
            .join(" · "),
          studentName: student?.name ?? null,
          className: null,
          classId: student?.class_id ?? null,
          studentId: schedule.studentId,
          studentCount: null,
          isShared: false,
          canOpenAttendance: false,
        };
      }),
    ...sharedScheduleItems.filter((item) => item.studentId && studentIds.has(item.studentId)),
  ].sort(compareHomeScheduleItems);
}

async function buildSharedHomeScheduleItems({
  admin,
  academyId,
  students,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  students: StudentRecord[];
}): Promise<HomeScheduleItem[]> {
  const localStudents = students.filter(
    (student) => student.status === "active" && student.schedule_share_consent_confirmed,
  );
  const localStudentById = new Map(localStudents.map((student) => [student.id, student]));

  if (localStudents.length === 0) {
    return [];
  }

  const localStudentIds = localStudents.map((student) => student.id);
  const [sourceResult, targetResult] = await Promise.all([
    admin
      .from("student_schedule_links")
      .select("id, source_academy_id, source_student_id, target_academy_id, target_student_id")
      .eq("source_academy_id", academyId)
      .in("source_student_id", localStudentIds)
      .eq("status", "active")
      .returns<ShareLinkRecord[]>(),
    admin
      .from("student_schedule_links")
      .select("id, source_academy_id, source_student_id, target_academy_id, target_student_id")
      .eq("target_academy_id", academyId)
      .in("target_student_id", localStudentIds)
      .eq("status", "active")
      .returns<ShareLinkRecord[]>(),
  ]);

  if (sourceResult.error || targetResult.error) {
    if (isMissingSharingTable(sourceResult.error) || isMissingSharingTable(targetResult.error)) {
      return [];
    }

    return [];
  }

  const links = [...(sourceResult.data ?? []), ...(targetResult.data ?? [])];

  if (links.length === 0) {
    return [];
  }

  const remoteRefs = links.map((link) => getRemoteScheduleRef({ link, academyId }));
  const remoteStudentIds = [...new Set(remoteRefs.map((ref) => ref.remoteStudentId))];

  const [remoteConsentResult, remoteSchedulesResult] = await Promise.all([
    admin
      .from("students")
      .select("id, academy_id, schedule_share_consent_confirmed")
      .in("id", remoteStudentIds)
      .returns<SharedStudentConsentRecord[]>(),
    admin
      .from("student_schedules")
      .select(
        "id, academy_id, student_id, schedule_type, schedule_date, day_of_week, start_time, end_time, subject, title, is_active",
      )
      .in("student_id", remoteStudentIds)
      .eq("is_active", true)
      .returns<SharedScheduleRecord[]>(),
  ]);

  if (remoteConsentResult.error || remoteSchedulesResult.error) {
    return [];
  }

  const consentedRemoteStudentKeys = new Set(
    (remoteConsentResult.data ?? [])
      .filter((student) => student.schedule_share_consent_confirmed)
      .map((student) => `${student.academy_id}:${student.id}`),
  );
  const localStudentIdByRemoteKey = new Map(
    remoteRefs.map((ref) => [`${ref.remoteAcademyId}:${ref.remoteStudentId}`, ref.localStudentId]),
  );

  return (remoteSchedulesResult.data ?? [])
    .filter((schedule) =>
      consentedRemoteStudentKeys.has(`${schedule.academy_id}:${schedule.student_id}`),
    )
    .map((schedule): HomeScheduleItem | null => {
      const localStudentId = localStudentIdByRemoteKey.get(
        `${schedule.academy_id}:${schedule.student_id}`,
      );
      const localStudent = localStudentId ? localStudentById.get(localStudentId) : null;

      if (!localStudent) {
        return null;
      }

      return {
        id: `shared:${schedule.id}`,
        kind: "shared_schedule" as const,
        scheduleType: schedule.schedule_type,
        scheduleDate: schedule.schedule_date,
        dayOfWeek: schedule.day_of_week,
        startTime: schedule.start_time.slice(0, 5),
        endTime: schedule.end_time.slice(0, 5),
        title: localStudent.name,
        subtitle: schedule.title || "연결 학원 일정",
        studentName: localStudent.name,
        className: null,
        classId: localStudent.class_id,
        studentId: localStudent.id,
        studentCount: null,
        isShared: true,
        canOpenAttendance: false,
      };
    })
    .filter((item): item is HomeScheduleItem => Boolean(item));
}

function compareHomeScheduleItems(first: HomeScheduleItem, second: HomeScheduleItem) {
  return (
    first.startTime.localeCompare(second.startTime) ||
    first.endTime.localeCompare(second.endTime) ||
    first.title.localeCompare(second.title, "ko") ||
    first.kind.localeCompare(second.kind)
  );
}

function getRemoteScheduleRef({
  link,
  academyId,
}: {
  link: ShareLinkRecord;
  academyId: string;
}) {
  if (link.source_academy_id === academyId) {
    return {
      localStudentId: link.source_student_id,
      remoteAcademyId: link.target_academy_id,
      remoteStudentId: link.target_student_id,
    };
  }

  return {
    localStudentId: link.target_student_id,
    remoteAcademyId: link.source_academy_id,
    remoteStudentId: link.source_student_id,
  };
}

function isMissingSharingTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("student_schedule_links")) ||
    Boolean(error?.message?.includes("student_share_tokens"))
  );
}

function isMissingExternalAcademyTable(error: { code?: string; message?: string } | null) {
  return (
    error?.code === "42P01" ||
    Boolean(error?.message?.includes("external_academies")) ||
    Boolean(error?.message?.includes("external_academy_classes")) ||
    Boolean(error?.message?.includes("student_external_class_enrollments"))
  );
}

function AppShell({
  email,
  title = "내 학원 운영 보드",
  subtitle = "Academy Follow-up",
  hasPlatformAdmin = false,
  children,
}: {
  email: string;
  title?: string;
  subtitle?: string;
  hasPlatformAdmin?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#F7F3EA] pb-[env(safe-area-inset-bottom)]">
      <section className="mx-auto w-full max-w-7xl px-3 py-3 sm:px-8 sm:py-5">
        <header className="flex items-start justify-between gap-2 border-b border-stone-200 pb-4 sm:items-center sm:gap-3 sm:pb-5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#315C7C] text-white sm:size-11">
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
          <div className="flex shrink-0 items-center gap-2">
            {hasPlatformAdmin ? (
              <Link
                href="/platform"
                className="hidden min-h-10 items-center rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 sm:flex"
              >
                플랫폼 관리
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

function buildOperationsClasses({
  classes,
  students,
  schedules,
  manualExternalSchedules,
  profileId,
  role,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  schedules: StudentScheduleRecord[];
  manualExternalSchedules: ManualExternalScheduleRecord[];
  profileId: string;
  role: string;
}): OperationsClass[] {
  const canViewPhoneNumbers = canManageAcademy(role);
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
        maskedParentPhone: displayPhoneStatus({
          phone: student.parent_phone,
          label: "학부모",
          canViewPhoneNumbers,
        }),
        maskedStudentPhone: student.student_phone
          ? displayPhoneStatus({
              phone: student.student_phone,
              label: "학생",
              canViewPhoneNumbers,
            })
          : null,
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
          ...manualExternalSchedules
            .filter((schedule) => schedule.studentId === student.id)
            .map((schedule) => ({
              id: `manual-external:${schedule.enrollmentId}`,
              classId: null,
              sharedAcademyName: schedule.externalAcademyName,
              isShared: false,
              scheduleType: "manual_external_class",
              scheduleDate: schedule.scheduleDate,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              subject: schedule.subject,
              title: schedule.title,
              memo: schedule.externalAcademyName,
              isActive: schedule.isActive,
              sourceFollowupId: null,
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
  manualExternalSchedules,
}: {
  classes: ClassRecord[];
  students: StudentRecord[];
  schedules: StudentScheduleRecord[];
  manualExternalSchedules: ManualExternalScheduleRecord[];
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
      studentPhone: student.student_phone,
      maskedStudentPhone: student.student_phone ? maskPhone(student.student_phone) : null,
      scheduleShareConsentConfirmed: student.schedule_share_consent_confirmed,
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
      externalClassEnrollments: manualExternalSchedules
        .filter((schedule) => schedule.studentId === student.id)
        .map((schedule) => ({
          id: schedule.enrollmentId,
          externalAcademyId: schedule.externalAcademyId,
          externalAcademyName: schedule.externalAcademyName,
          externalClassId: schedule.externalClassId,
          title: schedule.title,
          subject: schedule.subject,
          scheduleDate: schedule.scheduleDate,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          memo: schedule.memo,
          isActive: schedule.isActive,
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
    phone: member.phone,
    maskedPhone: member.phone ? maskPhone(member.phone) : null,
    role: member.role,
    status: member.status,
    classCount: classes.filter((classItem) => classItem.teacher_id === member.id).length,
  }));
}

function buildManagementSettings({
  academyName,
  senderName,
  senderPhone,
  settings,
}: {
  academyName: string;
  senderName: string | null;
  senderPhone: string | null;
  settings: AcademySettingsRecord | null;
}): ManagementSettings {
  return {
    academyName,
    senderName: senderName ?? "",
    senderPhone: senderPhone ?? "",
    smsDryRun: settings?.sms_dry_run ?? true,
    duplicateGuardMinutes: settings?.duplicate_guard_minutes ?? 1440,
    allowAssistantSend: settings?.allow_assistant_send ?? false,
  };
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 7) {
    return "연락처 확인";
  }

  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function displayPhoneStatus({
  phone,
  label,
  canViewPhoneNumbers,
}: {
  phone: string;
  label: "학부모" | "학생";
  canViewPhoneNumbers: boolean;
}) {
  if (canViewPhoneNumbers) {
    return maskPhone(phone);
  }

  return phone ? `${label} 연락처 등록됨` : `${label} 연락처 미등록`;
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
