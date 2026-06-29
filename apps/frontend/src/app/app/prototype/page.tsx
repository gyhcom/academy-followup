import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { LogoutButton } from "@/app/app/logout-button";
import {
  PrototypeWorkspace,
  type PrototypeWorkspaceData,
} from "@/app/app/prototype-workspace";
import { canManageAcademy, canViewAllClasses, roleLabel } from "@/lib/permissions";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
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
  parent_phone: string;
  student_phone: string | null;
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
  title: string;
  is_active: boolean;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  class_id: string;
  attendance_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  status: string;
  followup_id: string | null;
};

type AuditLogRecord = {
  id: string;
  action: string;
  entity_type: string;
  summary: string;
  created_at: string;
};

export default async function PrototypePage() {
  if (!hasSupabaseServerEnv()) {
    return (
      <PrototypeFallback
        title="Supabase 환경변수 설정 필요"
        description="로그인 세션을 확인할 수 없어 새 UI 프로토타입을 열 수 없습니다."
      />
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
      <PrototypeFallback
        title="서버 환경변수 확인 필요"
        description="SUPABASE_SERVICE_ROLE_KEY가 없어 학원 데이터를 조회할 수 없습니다."
        email={user.email ?? ""}
      />
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("name, role, status, academy_id, academies(name, category)")
    .eq("id", user.id)
    .maybeSingle<ProfileWithAcademy>();

  if (error) {
    return (
      <PrototypeFallback
        title="프로필 조회 실패"
        description={error.message}
        email={user.email ?? ""}
      />
    );
  }

  if (!profile || !profile.academies) {
    return (
      <PrototypeFallback
        title="학원 워크스페이스 연결 대기"
        description="로그인은 완료됐지만 아직 학원 프로필이 연결되지 않았습니다."
        email={user.email ?? ""}
      />
    );
  }

  if (profile.status !== "active") {
    return (
      <PrototypeFallback
        title="비활성 구성원 계정"
        description="이 계정은 현재 비활성 상태입니다. 원장 또는 관리자에게 확인을 요청해 주세요."
        email={user.email ?? ""}
      />
    );
  }

  const date = getTodayDateInTimeZone("Asia/Seoul");
  const dayOfWeek = getDayOfWeek(date);
  const canManage = canManageAcademy(profile.role);
  const canViewAll = canViewAllClasses(profile.role);

  const [classesResult, studentsResult, schedulesResult, attendanceResult, auditResult] =
    await Promise.all([
      admin
        .from("classes")
        .select("id, name, subject, grade_label, teacher_id")
        .eq("academy_id", profile.academy_id)
        .order("name")
        .returns<ClassRecord[]>(),
      admin
        .from("students")
        .select("id, class_id, name, school_name, grade_label, parent_phone, student_phone, status")
        .eq("academy_id", profile.academy_id)
        .order("name")
        .returns<StudentRecord[]>(),
      admin
        .from("student_schedules")
        .select(
          "id, student_id, class_id, teacher_id, schedule_type, schedule_date, day_of_week, start_time, end_time, title, is_active",
        )
        .eq("academy_id", profile.academy_id)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true })
        .returns<StudentScheduleRecord[]>(),
      admin
        .from("attendance_records")
        .select(
          "id, student_id, class_id, attendance_date, scheduled_start_time, scheduled_end_time, status, followup_id",
        )
        .eq("academy_id", profile.academy_id)
        .eq("attendance_date", date)
        .order("scheduled_start_time", { ascending: true })
        .returns<AttendanceRecord[]>(),
      canManage
        ? admin
            .from("audit_logs")
            .select("id, action, entity_type, summary, created_at")
            .eq("academy_id", profile.academy_id)
            .order("created_at", { ascending: false })
            .limit(5)
            .returns<AuditLogRecord[]>()
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (
    classesResult.error ||
    studentsResult.error ||
    schedulesResult.error ||
    attendanceResult.error ||
    auditResult.error
  ) {
    return (
      <PrototypeFallback
        title="프로토타입 데이터 조회 실패"
        description={
          classesResult.error?.message ??
          studentsResult.error?.message ??
          schedulesResult.error?.message ??
          attendanceResult.error?.message ??
          auditResult.error?.message ??
          "운영 데이터를 가져오지 못했습니다."
        }
        email={user.email ?? ""}
      />
    );
  }

  const classes = classesResult.data ?? [];
  const students = studentsResult.data ?? [];
  const schedules = schedulesResult.data ?? [];
  const attendanceRecords = attendanceResult.data ?? [];
  const auditLogs = auditResult.data ?? [];
  const classById = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const studentById = new Map(students.map((student) => [student.id, student]));
  const visibleClassIds = new Set(
    canViewAll
      ? classes.map((classItem) => classItem.id)
      : classes
          .filter((classItem) => classItem.teacher_id === user.id)
          .map((classItem) => classItem.id),
  );
  const visibleStudents = students.filter((student) => {
    if (student.status === "withdrawn") return false;
    if (canViewAll) return true;
    return student.class_id ? visibleClassIds.has(student.class_id) : false;
  });
  const visibleStudentIds = new Set(visibleStudents.map((student) => student.id));
  const todaySchedules = schedules.filter((schedule) => {
    if (!schedule.is_active || !visibleStudentIds.has(schedule.student_id)) return false;
    if (schedule.class_id && !visibleClassIds.has(schedule.class_id)) return false;
    if (schedule.schedule_date) return schedule.schedule_date === date;
    return schedule.day_of_week === dayOfWeek;
  });
  const todayStudentIds = new Set(todaySchedules.map((schedule) => schedule.student_id));
  const attendanceByStudentId = new Map(
    attendanceRecords
      .filter((record) => todayStudentIds.has(record.student_id))
      .map((record) => [record.student_id, record]),
  );
  const presentCount = countAttendance(attendanceByStudentId, "present");
  const lateCount = countAttendance(attendanceByStudentId, "late");
  const absentCount = countAttendance(attendanceByStudentId, "absent");
  const checkedRecordCount = Array.from(attendanceByStudentId.values()).filter(
    (record) => record.status !== "pending",
  ).length;
  const uncheckedCount = Math.max(todayStudentIds.size - checkedRecordCount, 0);
  const contactNeedCount = Array.from(attendanceByStudentId.values()).filter(
    (record) =>
      ["late", "absent", "needs_check"].includes(record.status) && !record.followup_id,
  ).length;
  const activeStudentIds = new Set(
    visibleStudents.filter((student) => student.status === "active").map((student) => student.id),
  );
  const scheduledStudentIds = new Set(
    schedules
      .filter((schedule) => schedule.is_active && visibleStudentIds.has(schedule.student_id))
      .map((schedule) => schedule.student_id),
  );
  const missingScheduleCount = Array.from(activeStudentIds).filter(
    (studentId) => !scheduledStudentIds.has(studentId),
  ).length;
  const sessionMap = new Map<
    string,
    {
      id: string;
      title: string;
      time: string;
      teacherLabel: string;
      studentIds: Set<string>;
      studentPreviewNames: string[];
      late: number;
      absent: number;
      unchecked: number;
    }
  >();

  for (const schedule of todaySchedules) {
    const classItem = schedule.class_id ? classById.get(schedule.class_id) : null;
    const sessionKey = [
      schedule.class_id ?? "custom",
      schedule.start_time,
      schedule.end_time,
      schedule.title,
    ].join(":");
    const session =
      sessionMap.get(sessionKey) ??
      {
        id: sessionKey,
        title: classItem?.name ?? schedule.title,
        time: `${formatTime(schedule.start_time)}-${formatTime(schedule.end_time)}`,
        teacherLabel: profile.name,
        studentIds: new Set<string>(),
        studentPreviewNames: [],
        late: 0,
        absent: 0,
        unchecked: 0,
      };

    session.studentIds.add(schedule.student_id);
    const student = studentById.get(schedule.student_id);
    if (student && !session.studentPreviewNames.includes(student.name)) {
      session.studentPreviewNames.push(student.name);
    }
    const attendance = attendanceByStudentId.get(schedule.student_id);
    if (!attendance || attendance.status === "pending") session.unchecked += 1;
    if (attendance?.status === "late") session.late += 1;
    if (attendance?.status === "absent") session.absent += 1;
    sessionMap.set(sessionKey, session);
  }

  const data: PrototypeWorkspaceData = {
    academyName: profile.academies.name,
    academyCategory: profile.academies.category ?? "학원 운영",
    userName: profile.name,
    userRole: roleLabel(profile.role),
    canManage,
    date,
    summary: {
      todaySessionCount: sessionMap.size,
      todayStudentCount: todayStudentIds.size,
      presentCount,
      lateCount,
      absentCount,
      uncheckedCount,
      contactNeedCount,
      missingScheduleCount,
      activeStudentCount: activeStudentIds.size,
      classCount: classes.length,
      recentAuditCount: auditLogs.length,
    },
    sessions: Array.from(sessionMap.values())
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 6)
      .map((session) => ({
        id: session.id,
        title: session.title,
        time: session.time,
        teacherLabel: session.teacherLabel,
        studentCount: session.studentIds.size,
        lateCount: session.late,
        absentCount: session.absent,
        uncheckedCount: session.unchecked,
        studentPreviewNames: session.studentPreviewNames.slice(0, 8),
      })),
    attendanceRows: todaySchedules
      .map((schedule) => {
        const student = studentById.get(schedule.student_id);
        if (!student) return null;
        const classItem = schedule.class_id ? classById.get(schedule.class_id) : null;
        const attendance = attendanceByStudentId.get(schedule.student_id);
        const status = attendance?.status ?? "pending";
        const contactStatus: "done" | "needed" | "none" =
          attendance?.followup_id
            ? "done"
            : ["late", "absent", "needs_check"].includes(status)
              ? "needed"
              : "none";
        return {
          id: schedule.id,
          sessionId: [
            schedule.class_id ?? "custom",
            schedule.start_time,
            schedule.end_time,
            schedule.title,
          ].join(":"),
          studentId: student.id,
          studentName: student.name,
          schoolGrade: [student.school_name, student.grade_label].filter(Boolean).join(" · "),
          className: classItem?.name ?? schedule.title,
          time: `${formatTime(schedule.start_time)}-${formatTime(schedule.end_time)}`,
          status,
          contactStatus,
          maskedPhone: maskPhone(student.student_phone ?? student.parent_phone),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => a.time.localeCompare(b.time) || a.studentName.localeCompare(b.studentName))
      .slice(0, 80),
    recentLogs: auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      target: log.entity_type,
      summary: log.summary,
      createdAt: log.created_at,
    })),
  };

  return <PrototypeWorkspace data={data} />;
}

function PrototypeFallback({
  title,
  description,
  email = "",
}: {
  title: string;
  description: string;
  email?: string;
}) {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6 text-stone-950">
      <div className="mx-auto flex max-w-3xl items-center justify-between border border-stone-200 bg-white px-4 py-3">
        <Link
          href="/app"
          className="inline-flex min-h-10 items-center gap-2 border border-stone-300 px-3 text-sm font-semibold text-stone-800 hover:bg-stone-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          기존 앱으로
        </Link>
        {email ? <LogoutButton /> : null}
      </div>
      <section className="mx-auto mt-6 max-w-3xl border border-stone-200 bg-white p-6">
        <div className="flex gap-3">
          <AlertCircle className="mt-1 h-5 w-5 text-amber-600" aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-stone-950">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function countAttendance(records: Map<string, AttendanceRecord>, status: string) {
  return Array.from(records.values()).filter((record) => record.status === status).length;
}

function formatTime(value: string) {
  return value.slice(0, 5);
}

function maskPhone(phone: string | null | undefined) {
  if (!phone) return "연락처 없음";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "등록됨";
  return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
}

function getDayOfWeek(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).getDay();
}

function getTodayDateInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
