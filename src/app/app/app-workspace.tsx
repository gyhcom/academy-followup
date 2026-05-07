"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Pencil,
  Plus,
  Save,
  GraduationCap,
  LayoutDashboard,
  ListFilter,
  Search,
  Settings,
  UsersRound,
  X,
} from "lucide-react";
import {
  OperationsBoard,
  type OperationsClass,
} from "@/app/app/operations-board";

export type ManagementClass = {
  id: string;
  name: string;
  subject: string | null;
  gradeLabel: string | null;
  teacherId: string | null;
  teacherName: string | null;
  studentCount: number;
};

export type ManagementStudentSchedule = {
  id: string;
  studentId: string;
  classId: string | null;
  teacherId: string | null;
  scheduleType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
  memo: string | null;
  isActive: boolean;
};

export type ManagementStudent = {
  id: string;
  classId: string | null;
  name: string;
  className: string | null;
  schoolName: string | null;
  gradeLabel: string | null;
  parentName: string | null;
  parentPhone: string;
  maskedParentPhone: string;
  status: string;
  schedules: ManagementStudentSchedule[];
};

export type ManagementMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  classCount: number;
};

type AppWorkspaceProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  classes: OperationsClass[];
  managementClasses: ManagementClass[];
  managementStudents: ManagementStudent[];
  managementMembers: ManagementMember[];
};

type WorkspaceView = "operations" | "management";
type ClassFormMode = "create" | "edit";
type FormStatus = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};
type ClassFormState = {
  mode: ClassFormMode;
  classId: string;
  name: string;
  subject: string;
  gradeLabel: string;
  teacherId: string;
};
type StudentFormMode = "create" | "edit";
type StudentFormState = {
  mode: StudentFormMode;
  studentId: string;
  classId: string;
  name: string;
  schoolName: string;
  gradeLabel: string;
  parentName: string;
  parentPhone: string;
  status: string;
};
type ScheduleFormMode = "create" | "edit";
type ScheduleFormState = {
  mode: ScheduleFormMode;
  scheduleId: string;
  studentId: string;
  studentName: string;
  classId: string;
  teacherId: string;
  scheduleType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  title: string;
  memo: string;
  isActive: boolean;
};
type StudentSortMode = "time" | "name" | "class";
type StudentScheduleFilter = "all" | "has_schedule" | "missing_schedule" | "external";

export function AppWorkspace({
  academyName,
  teacherName,
  role,
  roleLabel,
  classes,
  managementClasses,
  managementStudents,
  managementMembers,
}: AppWorkspaceProps) {
  const canManage = role === "owner" || role === "manager";
  const [activeView, setActiveView] = useState<WorkspaceView>("operations");
  const visibleView = canManage ? activeView : "operations";

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-5">
      <WorkspaceNavigation
        activeView={visibleView}
        canManage={canManage}
        onChange={setActiveView}
      />

      {visibleView === "operations" ? (
        <OperationsBoard
          academyName={academyName}
          teacherName={teacherName}
          roleLabel={roleLabel}
          classes={classes}
        />
      ) : (
        <ManagementHome
          academyName={academyName}
          classes={managementClasses}
          members={managementMembers}
          students={managementStudents}
        />
      )}
    </div>
  );
}

function WorkspaceNavigation({
  activeView,
  canManage,
  onChange,
}: {
  activeView: WorkspaceView;
  canManage: boolean;
  onChange: (view: WorkspaceView) => void;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-2 shadow-sm">
      <div className="grid grid-cols-2 gap-2">
        <WorkspaceNavButton
          icon={<LayoutDashboard size={17} />}
          label="운영 보드"
          description="수업 후 팔로업"
          isActive={activeView === "operations"}
          onClick={() => onChange("operations")}
        />
        <WorkspaceNavButton
          icon={<Settings size={17} />}
          label="관리"
          description={canManage ? "학생·반·구성원" : "원장/관리자 권한"}
          isActive={activeView === "management"}
          disabled={!canManage}
          onClick={() => onChange("management")}
        />
      </div>
    </section>
  );
}

function WorkspaceNavButton({
  icon,
  label,
  description,
  isActive,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  isActive: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "flex min-h-16 items-center gap-3 rounded-lg border px-3 text-left transition",
        isActive
          ? "border-stone-950 bg-stone-950 text-white"
          : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-white",
        disabled ? "cursor-not-allowed opacity-55 hover:border-stone-200 hover:bg-stone-50" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          isActive ? "bg-white/14 text-white" : "bg-white text-emerald-700",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span
          className={[
            "mt-0.5 block truncate text-xs",
            isActive ? "text-white/70" : "text-stone-500",
          ].join(" ")}
        >
          {description}
        </span>
      </span>
    </button>
  );
}

function ManagementHome({
  academyName,
  classes,
  members,
  students,
}: {
  academyName: string;
  classes: ManagementClass[];
  members: ManagementMember[];
  students: ManagementStudent[];
}) {
  const router = useRouter();
  const [classForm, setClassForm] = useState<ClassFormState | null>(null);
  const [classFormStatus, setClassFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });
  const [studentForm, setStudentForm] = useState<StudentFormState | null>(null);
  const [studentFormStatus, setStudentFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [scheduleFormStatus, setScheduleFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentClassFilter, setStudentClassFilter] = useState("all");
  const [studentStatusFilter, setStudentStatusFilter] = useState("active");
  const [studentScheduleFilter, setStudentScheduleFilter] =
    useState<StudentScheduleFilter>("all");
  const [studentSortMode, setStudentSortMode] = useState<StudentSortMode>("time");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    students[0]?.id ?? null,
  );
  const activeStudents = useMemo(
    () => students.filter((student) => student.status === "active"),
    [students],
  );
  const inactiveStudents = students.length - activeStudents.length;
  const teacherOptions = members.filter((member) =>
    ["owner", "manager", "teacher", "assistant"].includes(member.role),
  );

  function openCreateClassForm() {
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setClassForm({
      mode: "create",
      classId: "",
      name: "",
      subject: "",
      gradeLabel: "",
      teacherId: "",
    });
    setClassFormStatus({ status: "idle", message: "" });
  }

  function openEditClassForm(classItem: ManagementClass) {
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setClassForm({
      mode: "edit",
      classId: classItem.id,
      name: classItem.name,
      subject: classItem.subject ?? "",
      gradeLabel: classItem.gradeLabel ?? "",
      teacherId: classItem.teacherId ?? "",
    });
    setClassFormStatus({ status: "idle", message: "" });
  }

  async function saveClassForm() {
    if (!classForm) {
      return;
    }

    setClassFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/classes", {
        method: classForm.mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: classForm.classId,
          name: classForm.name,
          subject: classForm.subject,
          gradeLabel: classForm.gradeLabel,
          teacherId: classForm.teacherId,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "반 정보를 저장하지 못했습니다.");
      }

      setClassFormStatus({
        status: "saved",
        message: classForm.mode === "create" ? "반을 등록했습니다." : "반 정보를 수정했습니다.",
      });
      setClassForm(null);
      router.refresh();
    } catch (error) {
      setClassFormStatus({
        status: "error",
        message: error instanceof Error ? error.message : "반 정보를 저장하지 못했습니다.",
      });
    }
  }

  function openCreateStudentForm() {
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setStudentForm({
      mode: "create",
      studentId: "",
      classId: "",
      name: "",
      schoolName: "",
      gradeLabel: "",
      parentName: "",
      parentPhone: "",
      status: "active",
    });
    setStudentFormStatus({ status: "idle", message: "" });
  }

  function openEditStudentForm(student: ManagementStudent) {
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setStudentForm({
      mode: "edit",
      studentId: student.id,
      classId: student.classId ?? "",
      name: student.name,
      schoolName: student.schoolName ?? "",
      gradeLabel: student.gradeLabel ?? "",
      parentName: student.parentName ?? "",
      parentPhone: student.parentPhone,
      status: student.status,
    });
    setStudentFormStatus({ status: "idle", message: "" });
  }

  async function saveStudentForm() {
    if (!studentForm) {
      return;
    }

    setStudentFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/students", {
        method: studentForm.mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId: studentForm.studentId,
          classId: studentForm.classId,
          name: studentForm.name,
          schoolName: studentForm.schoolName,
          gradeLabel: studentForm.gradeLabel,
          parentName: studentForm.parentName,
          parentPhone: studentForm.parentPhone,
          status: studentForm.status,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "학생 정보를 저장하지 못했습니다.");
      }

      setStudentFormStatus({
        status: "saved",
        message:
          studentForm.mode === "create"
            ? "학생을 등록했습니다. 다음 단계에서 주간 스케줄을 이어서 입력합니다."
            : "학생 정보를 수정했습니다.",
      });
      setStudentForm(null);
      router.refresh();
    } catch (error) {
      setStudentFormStatus({
        status: "error",
        message: error instanceof Error ? error.message : "학생 정보를 저장하지 못했습니다.",
      });
    }
  }

  function openCreateScheduleForm(student: ManagementStudent) {
    const classItem = classes.find((item) => item.id === student.classId);
    const defaultTitle = student.className ?? "정규 수업";

    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm({
      mode: "create",
      scheduleId: "",
      studentId: student.id,
      studentName: student.name,
      classId: student.classId ?? "",
      teacherId: classItem?.teacherId ?? "",
      scheduleType: "regular_class",
      dayOfWeek: 1,
      startTime: "16:30",
      endTime: "18:00",
      subject: classItem?.subject ?? "",
      title: defaultTitle,
      memo: "",
      isActive: true,
    });
    setScheduleFormStatus({ status: "idle", message: "" });
  }

  function openEditScheduleForm(student: ManagementStudent, schedule: ManagementStudentSchedule) {
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm({
      mode: "edit",
      scheduleId: schedule.id,
      studentId: student.id,
      studentName: student.name,
      classId: schedule.classId ?? "",
      teacherId: schedule.teacherId ?? "",
      scheduleType: schedule.scheduleType,
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: schedule.subject ?? "",
      title: schedule.title,
      memo: schedule.memo ?? "",
      isActive: schedule.isActive,
    });
    setScheduleFormStatus({ status: "idle", message: "" });
  }

  async function saveScheduleForm() {
    if (!scheduleForm) {
      return;
    }

    setScheduleFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/student-schedules", {
        method: scheduleForm.mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scheduleId: scheduleForm.scheduleId,
          studentId: scheduleForm.studentId,
          classId: scheduleForm.classId,
          teacherId: scheduleForm.teacherId,
          scheduleType: scheduleForm.scheduleType,
          dayOfWeek: scheduleForm.dayOfWeek,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          subject: scheduleForm.subject,
          title: scheduleForm.title,
          memo: scheduleForm.memo,
          isActive: scheduleForm.isActive,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "스케줄을 저장하지 못했습니다.");
      }

      setScheduleFormStatus({
        status: "saved",
        message:
          scheduleForm.mode === "create"
            ? "학생 스케줄을 등록했습니다."
            : "학생 스케줄을 수정했습니다.",
      });
      setScheduleForm(null);
      router.refresh();
    } catch (error) {
      setScheduleFormStatus({
        status: "error",
        message: error instanceof Error ? error.message : "스케줄을 저장하지 못했습니다.",
      });
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-700">{academyName}</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-stone-950 sm:text-3xl">
              학원 기본 관리
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              실제 등록 기능을 붙이기 전에, 원장이 확인해야 하는 학생·반·구성원 정보를
              한 화면에 모았습니다.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            학생 등록 후 주간 스케줄 입력 화면으로 이어지게 확장합니다.
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={<GraduationCap size={19} />}
          label="재원 학생"
          value={`${activeStudents.length}명`}
          detail={inactiveStudents > 0 ? `비활성 ${inactiveStudents}명 별도 관리` : "팔로업 대상 기준"}
        />
        <SummaryCard
          icon={<BookOpen size={19} />}
          label="반"
          value={`${classes.length}개`}
          detail="운영 보드 반 목록과 연결"
        />
        <SummaryCard
          icon={<UsersRound size={19} />}
          label="구성원"
          value={`${members.length}명`}
          detail="원장·관리자·선생님 권한"
        />
        <SummaryCard
          icon={<ClipboardList size={19} />}
          label="등록 준비"
          value="3개 화면"
          detail="학생, 반, 선생님"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <ManagementPanel
          title="반 관리"
          description="반 이름, 과목, 학년, 담당 선생님을 등록하고 수정합니다."
          actionLabel="반 등록"
          actionIcon={<Plus size={14} />}
          onAction={openCreateClassForm}
        >
          {classForm ? (
            <ClassForm
              form={classForm}
              status={classFormStatus}
              teacherOptions={teacherOptions}
              onChange={setClassForm}
              onCancel={() => {
                setClassForm(null);
                setClassFormStatus({ status: "idle", message: "" });
              }}
              onSave={saveClassForm}
            />
          ) : null}

          {classFormStatus.status === "saved" || classFormStatus.status === "error" ? (
            <p
              className={[
                "mb-3 rounded-md border px-3 py-2 text-sm",
                classFormStatus.status === "saved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {classFormStatus.message}
            </p>
          ) : null}

          <div className="divide-y divide-stone-100">
            {classes.map((classItem) => (
              <div key={classItem.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{classItem.name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {[classItem.subject, classItem.gradeLabel].filter(Boolean).join(" · ") ||
                      "과목/학년 미지정"}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    담당: {classItem.teacherName ?? "미지정"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-fit rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    학생 {classItem.studentCount}명
                  </span>
                  <button
                    type="button"
                    onClick={() => openEditClassForm(classItem)}
                    className="flex min-h-8 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                  >
                    <Pencil size={13} />
                    수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ManagementPanel>

        <ManagementPanel
          title="구성원 관리"
          description="로그인 가능한 학원 내부 사용자를 확인합니다."
          actionLabel="선생님 초대 예정"
        >
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{member.name}</p>
                    <p className="mt-1 truncate text-xs text-stone-500">{member.email}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700">
                    {roleLabel(member.role)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-500">담당 반 {member.classCount}개</p>
              </div>
            ))}
          </div>
        </ManagementPanel>
      </section>

      <ManagementPanel
        title="학생 관리"
        description="학생과 학부모 연락처는 팔로업 발송의 기준 데이터입니다."
        actionLabel="학생 등록"
        actionIcon={<Plus size={14} />}
        onAction={openCreateStudentForm}
      >
        {studentForm ? (
          <StudentForm
            form={studentForm}
            status={studentFormStatus}
            classes={classes}
            onChange={setStudentForm}
            onCancel={() => {
              setStudentForm(null);
              setStudentFormStatus({ status: "idle", message: "" });
            }}
            onSave={saveStudentForm}
          />
        ) : null}

        {studentFormStatus.status === "saved" || studentFormStatus.status === "error" ? (
          <p
            className={[
              "mb-3 rounded-md border px-3 py-2 text-sm",
              studentFormStatus.status === "saved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            {studentFormStatus.message}
          </p>
        ) : null}

        {scheduleForm ? (
          <ScheduleForm
            form={scheduleForm}
            status={scheduleFormStatus}
            classes={classes}
            members={teacherOptions}
            onChange={setScheduleForm}
            onCancel={() => {
              setScheduleForm(null);
              setScheduleFormStatus({ status: "idle", message: "" });
            }}
            onSave={saveScheduleForm}
          />
        ) : null}

        {scheduleFormStatus.status === "saved" || scheduleFormStatus.status === "error" ? (
          <p
            className={[
              "mb-3 rounded-md border px-3 py-2 text-sm",
              scheduleFormStatus.status === "saved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            {scheduleFormStatus.message}
          </p>
        ) : null}

        <StudentDirectory
          students={students}
          classes={classes}
          selectedStudentId={selectedStudentId}
          searchQuery={studentSearch}
          classFilter={studentClassFilter}
          statusFilter={studentStatusFilter}
          scheduleFilter={studentScheduleFilter}
          sortMode={studentSortMode}
          onSelectStudent={setSelectedStudentId}
          onSearchChange={setStudentSearch}
          onClassFilterChange={setStudentClassFilter}
          onStatusFilterChange={setStudentStatusFilter}
          onScheduleFilterChange={setStudentScheduleFilter}
          onSortModeChange={setStudentSortMode}
          onEditStudent={openEditStudentForm}
          onCreateSchedule={openCreateScheduleForm}
          onEditSchedule={openEditScheduleForm}
        />
      </ManagementPanel>
    </div>
  );
}

function StudentDirectory({
  students,
  classes,
  selectedStudentId,
  searchQuery,
  classFilter,
  statusFilter,
  scheduleFilter,
  sortMode,
  onSelectStudent,
  onSearchChange,
  onClassFilterChange,
  onStatusFilterChange,
  onScheduleFilterChange,
  onSortModeChange,
  onEditStudent,
  onCreateSchedule,
  onEditSchedule,
}: {
  students: ManagementStudent[];
  classes: ManagementClass[];
  selectedStudentId: string | null;
  searchQuery: string;
  classFilter: string;
  statusFilter: string;
  scheduleFilter: StudentScheduleFilter;
  sortMode: StudentSortMode;
  onSelectStudent: (studentId: string) => void;
  onSearchChange: (value: string) => void;
  onClassFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onScheduleFilterChange: (value: StudentScheduleFilter) => void;
  onSortModeChange: (value: StudentSortMode) => void;
  onEditStudent: (student: ManagementStudent) => void;
  onCreateSchedule: (student: ManagementStudent) => void;
  onEditSchedule: (student: ManagementStudent, schedule: ManagementStudentSchedule) => void;
}) {
  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return students
      .filter((student) => {
        if (statusFilter !== "all" && student.status !== statusFilter) {
          return false;
        }

        if (classFilter !== "all" && student.classId !== classFilter) {
          return false;
        }

        if (scheduleFilter === "has_schedule" && activeScheduleCount(student) === 0) {
          return false;
        }

        if (scheduleFilter === "missing_schedule" && activeScheduleCount(student) > 0) {
          return false;
        }

        if (
          scheduleFilter === "external" &&
          !student.schedules.some(
            (schedule) => schedule.isActive && schedule.scheduleType === "external",
          )
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          student.name,
          student.className,
          student.schoolName,
          student.gradeLabel,
          student.parentName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearch);
      })
      .sort((a, b) => compareStudents(a, b, sortMode));
  }, [classFilter, scheduleFilter, searchQuery, sortMode, statusFilter, students]);
  const selectedStudent =
    filteredStudents.find((student) => student.id === selectedStudentId) ??
    filteredStudents[0] ??
    null;

  return (
    <div className="space-y-3">
      <StudentDirectoryToolbar
        students={students}
        classes={classes}
        visibleCount={filteredStudents.length}
        searchQuery={searchQuery}
        classFilter={classFilter}
        statusFilter={statusFilter}
        scheduleFilter={scheduleFilter}
        sortMode={sortMode}
        onSearchChange={onSearchChange}
        onClassFilterChange={onClassFilterChange}
        onStatusFilterChange={onStatusFilterChange}
        onScheduleFilterChange={onScheduleFilterChange}
        onSortModeChange={onSortModeChange}
      />

      {students.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
          <p className="text-sm font-semibold text-stone-900">아직 등록된 학생이 없습니다.</p>
          <p className="mt-1 text-sm text-stone-500">학생을 먼저 등록하면 운영 보드에 표시됩니다.</p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_390px]">
          <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="grid grid-cols-[104px_minmax(0,1fr)_86px] gap-3 border-b border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold text-stone-500 sm:grid-cols-[132px_minmax(0,1fr)_128px]">
              <span>시간</span>
              <span>학생</span>
              <span className="text-right">상태</span>
            </div>
            <div className="max-h-[680px] overflow-y-auto">
              {filteredStudents.map((student) => (
                <StudentListRow
                  key={student.id}
                  student={student}
                  isSelected={student.id === selectedStudent?.id}
                  onSelect={() => onSelectStudent(student.id)}
                />
              ))}
              {filteredStudents.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold text-stone-900">조건에 맞는 학생이 없습니다.</p>
                  <p className="mt-1 text-sm text-stone-500">검색어와 필터를 조정해 주세요.</p>
                </div>
              ) : null}
            </div>
          </div>

          <StudentDetailPanel
            student={selectedStudent}
            onEditStudent={onEditStudent}
            onCreateSchedule={onCreateSchedule}
            onEditSchedule={onEditSchedule}
          />
        </div>
      )}
    </div>
  );
}

function StudentDirectoryToolbar({
  students,
  classes,
  visibleCount,
  searchQuery,
  classFilter,
  statusFilter,
  scheduleFilter,
  sortMode,
  onSearchChange,
  onClassFilterChange,
  onStatusFilterChange,
  onScheduleFilterChange,
  onSortModeChange,
}: {
  students: ManagementStudent[];
  classes: ManagementClass[];
  visibleCount: number;
  searchQuery: string;
  classFilter: string;
  statusFilter: string;
  scheduleFilter: StudentScheduleFilter;
  sortMode: StudentSortMode;
  onSearchChange: (value: string) => void;
  onClassFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onScheduleFilterChange: (value: StudentScheduleFilter) => void;
  onSortModeChange: (value: StudentSortMode) => void;
}) {
  const missingScheduleCount = students.filter((student) => activeScheduleCount(student) === 0).length;

  return (
    <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div className="grid gap-2 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
        <label className="relative block">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="학생명, 반, 학교, 학부모 검색"
            className="min-h-11 w-full rounded-md border border-stone-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-stone-600">
          <ListFilter size={14} />
          {visibleCount}명 표시 · 스케줄 미등록 {missingScheduleCount}명
        </div>
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={classFilter}
          onChange={(event) => onClassFilterChange(event.target.value)}
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          <option value="all">전체 반</option>
          {classes.map((classItem) => (
            <option key={classItem.id} value={classItem.id}>
              {classItem.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          <option value="all">전체 상태</option>
          <option value="active">재원</option>
          <option value="paused">휴원</option>
          <option value="left">퇴원</option>
        </select>

        <select
          value={scheduleFilter}
          onChange={(event) => onScheduleFilterChange(event.target.value as StudentScheduleFilter)}
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          <option value="all">전체 스케줄</option>
          <option value="has_schedule">스케줄 있음</option>
          <option value="missing_schedule">스케줄 미등록</option>
          <option value="external">외부 일정 있음</option>
        </select>

        <select
          value={sortMode}
          onChange={(event) => onSortModeChange(event.target.value as StudentSortMode)}
          className="min-h-10 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600"
        >
          <option value="time">요일·시간순</option>
          <option value="name">이름순</option>
          <option value="class">반순</option>
        </select>
      </div>
    </div>
  );
}

function StudentListRow({
  student,
  isSelected,
  onSelect,
}: {
  student: ManagementStudent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const primarySchedule = getPrimarySchedule(student);
  const activeSchedules = getActiveSchedules(student);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "grid w-full grid-cols-[104px_minmax(0,1fr)_86px] gap-3 border-b border-stone-100 px-3 py-3 text-left transition last:border-b-0 sm:grid-cols-[132px_minmax(0,1fr)_128px]",
        isSelected ? "bg-emerald-50" : "bg-white hover:bg-stone-50",
      ].join(" ")}
    >
      <div
        className={[
          "rounded-md border px-2.5 py-2",
          primarySchedule
            ? "border-stone-300 bg-stone-950 text-white"
            : "border-dashed border-stone-300 bg-stone-50 text-stone-500",
        ].join(" ")}
      >
        <p className="text-[11px] font-semibold leading-none">
          {primarySchedule ? weekDayShortLabel(primarySchedule.dayOfWeek) : "미등록"}
        </p>
        <p className="mt-1 text-base font-semibold leading-none">
          {primarySchedule ? primarySchedule.startTime : "--:--"}
        </p>
        <p className="mt-1 text-[11px] leading-none opacity-75">
          {primarySchedule ? `~ ${primarySchedule.endTime}` : "스케줄 없음"}
        </p>
      </div>

      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold text-stone-950">{student.name}</p>
          <span className="hidden shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600 sm:inline">
            {student.gradeLabel ?? "학년 미지정"}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-stone-500">
          {student.className ?? "미배정"} · {student.schoolName ?? "학교 미지정"}
        </p>
        <div className="mt-2 flex gap-1 overflow-hidden">
          {activeSchedules.slice(0, 3).map((schedule) => (
            <span
              key={schedule.id}
              className={[
                "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold",
                scheduleTypeChipClass(schedule.scheduleType),
              ].join(" ")}
            >
              {weekDayShortLabel(schedule.dayOfWeek)} {schedule.startTime}
            </span>
          ))}
          {activeSchedules.length === 0 ? (
            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">
              스케줄 미등록
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
        <StatusBadge status={student.status} />
        <span className="text-right text-xs font-medium text-stone-500">
          {activeSchedules.length}개 일정
        </span>
      </div>
    </button>
  );
}

function StudentDetailPanel({
  student,
  onEditStudent,
  onCreateSchedule,
  onEditSchedule,
}: {
  student: ManagementStudent | null;
  onEditStudent: (student: ManagementStudent) => void;
  onCreateSchedule: (student: ManagementStudent) => void;
  onEditSchedule: (student: ManagementStudent, schedule: ManagementStudentSchedule) => void;
}) {
  if (!student) {
    return (
      <aside className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-5 text-center">
        <p className="text-sm font-semibold text-stone-900">선택된 학생이 없습니다.</p>
        <p className="mt-1 text-sm text-stone-500">왼쪽 리스트에서 학생을 선택해 주세요.</p>
      </aside>
    );
  }

  const groupedSchedules = groupSchedulesByDay(student.schedules);

  return (
    <aside className="rounded-lg border border-stone-200 bg-white p-4 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold text-stone-950">{student.name}</p>
          <p className="mt-1 truncate text-sm text-stone-500">
            {student.className ?? "미배정"} · {student.gradeLabel ?? "학년 미지정"}
          </p>
          <p className="mt-1 truncate text-xs text-stone-500">
            {student.parentName ?? "학부모"} · {student.maskedParentPhone}
          </p>
        </div>
        <StatusBadge status={student.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onEditStudent(student)}
          className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-stone-200 bg-white px-3 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
        >
          <Pencil size={13} />
          학생 수정
        </button>
        <button
          type="button"
          onClick={() => onCreateSchedule(student)}
          className="flex min-h-10 items-center justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100"
        >
          <CalendarDays size={13} />
          스케줄 추가
        </button>
      </div>

      <div className="mt-4 border-t border-stone-200 pt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-stone-950">주간 스케줄</p>
          <p className="text-xs font-medium text-stone-500">
            활성 {activeScheduleCount(student)}개
          </p>
        </div>

        {groupedSchedules.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
            등록된 스케줄이 없습니다. 정규 수업이나 외부 일정을 추가해 주세요.
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {groupedSchedules.map(({ dayOfWeek, schedules }) => (
              <div key={dayOfWeek}>
                <p className="mb-1.5 text-xs font-semibold text-stone-500">
                  {weekDayLabel(dayOfWeek)}
                </p>
                <div className="space-y-2">
                  {schedules.map((schedule) => (
                    <button
                      key={schedule.id}
                      type="button"
                      onClick={() => onEditSchedule(student, schedule)}
                      className={[
                        "grid w-full grid-cols-[94px_minmax(0,1fr)] gap-3 rounded-md border px-3 py-2 text-left transition hover:border-stone-300 hover:bg-stone-50",
                        schedule.isActive ? "border-stone-200 bg-white" : "border-stone-200 bg-stone-50 opacity-60",
                      ].join(" ")}
                    >
                      <span className="rounded-md bg-stone-950 px-2 py-1.5 text-center text-white">
                        <span className="block text-sm font-semibold leading-none">
                          {schedule.startTime}
                        </span>
                        <span className="mt-1 block text-[11px] leading-none text-white/70">
                          {schedule.endTime}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1">
                          <span
                            className={[
                              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
                              scheduleTypeChipClass(schedule.scheduleType),
                            ].join(" ")}
                          >
                            {scheduleTypeLabel(schedule.scheduleType)}
                          </span>
                          {!schedule.isActive ? (
                            <span className="rounded bg-stone-200 px-1.5 py-0.5 text-[11px] font-semibold text-stone-600">
                              비활성
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-stone-950">
                          {schedule.title}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-stone-500">
                          {[schedule.subject, schedule.memo].filter(Boolean).join(" · ") ||
                            "메모 없음"}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-stone-950">{value}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-stone-500">{detail}</p>
    </article>
  );
}

function ManagementPanel({
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  children,
}: {
  title: string;
  description: string;
  actionLabel: string;
  actionIcon?: ReactNode;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3">
        <div>
          <h3 className="text-base font-semibold text-stone-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <button
          type="button"
          disabled={!onAction}
          onClick={onAction}
          className={[
            "flex min-h-10 shrink-0 items-center gap-1 rounded-md border px-3 text-xs font-semibold",
            onAction
              ? "border-stone-300 bg-white text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
              : "cursor-not-allowed border-stone-200 bg-stone-50 text-stone-500",
          ].join(" ")}
        >
          {actionIcon}
          {actionLabel}
          <ChevronRight size={14} />
        </button>
      </div>
      <div className="pt-3">{children}</div>
    </section>
  );
}

function ClassForm({
  form,
  status,
  teacherOptions,
  onChange,
  onCancel,
  onSave,
}: {
  form: ClassFormState;
  status: FormStatus;
  teacherOptions: ManagementMember[];
  onChange: (form: ClassFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave = form.name.trim().length > 0 && status.status !== "saving";

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "새 반 등록" : "반 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            반 이름은 필수이고, 과목·학년·담당자는 나중에 바꿀 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="반 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          반 이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 중2 수학 A반"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          담당 선생님
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="">담당자 미지정</option>
            {teacherOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} · {roleLabel(member.role)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          학년
          <input
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            placeholder="예: 중2"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold",
            canSave ? "bg-stone-950 text-white" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

function StudentForm({
  form,
  status,
  classes,
  onChange,
  onCancel,
  onSave,
}: {
  form: StudentFormState;
  status: FormStatus;
  classes: ManagementClass[];
  onChange: (form: StudentFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave =
    form.name.trim().length > 0 &&
    form.parentPhone.trim().length > 0 &&
    status.status !== "saving";

  return (
    <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50/80 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "새 학생 등록" : "학생 정보 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            학생명과 학부모 연락처는 필수입니다. 저장 후 주간 스케줄을 이어서 입력합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="학생 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          학생 이름
          <input
            value={form.name}
            onChange={(event) => onChange({ ...form, name: event.target.value })}
            placeholder="예: 김민준"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          소속 반
          <select
            value={form.classId}
            onChange={(event) => onChange({ ...form, classId: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">미배정</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          상태
          <select
            value={form.status}
            onChange={(event) => onChange({ ...form, status: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          >
            <option value="active">재원</option>
            <option value="paused">휴원</option>
            <option value="left">퇴원</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          학교
          <input
            value={form.schoolName}
            onChange={(event) => onChange({ ...form, schoolName: event.target.value })}
            placeholder="예: 한들중"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          학년
          <input
            value={form.gradeLabel}
            onChange={(event) => onChange({ ...form, gradeLabel: event.target.value })}
            placeholder="예: 중2"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          학부모명
          <input
            value={form.parentName}
            onChange={(event) => onChange({ ...form, parentName: event.target.value })}
            placeholder="예: 김민준 어머니"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2 lg:col-span-1">
          학부모 연락처
          <input
            value={form.parentPhone}
            onChange={(event) => onChange({ ...form, parentPhone: event.target.value })}
            inputMode="tel"
            placeholder="예: 010-1234-5678"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold",
            canSave ? "bg-stone-950 text-white" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

function ScheduleForm({
  form,
  status,
  classes,
  members,
  onChange,
  onCancel,
  onSave,
}: {
  form: ScheduleFormState;
  status: FormStatus;
  classes: ManagementClass[];
  members: ManagementMember[];
  onChange: (form: ScheduleFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const canSave =
    form.title.trim().length > 0 &&
    form.startTime.trim().length > 0 &&
    form.endTime.trim().length > 0 &&
    status.status !== "saving";

  function changeClass(classId: string) {
    const classItem = classes.find((item) => item.id === classId);

    onChange({
      ...form,
      classId,
      teacherId: classItem?.teacherId ?? form.teacherId,
      subject: classItem?.subject ?? form.subject,
      title: classItem?.name ?? form.title,
    });
  }

  return (
    <div className="mb-4 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-950">
            {form.mode === "create" ? "주간 스케줄 등록" : "주간 스케줄 수정"}
          </p>
          <p className="mt-1 text-xs leading-5 text-stone-600">
            {form.studentName} 학생의 반복 수업, 외부 일정, 보강 가능 시간을 관리합니다.
          </p>
        </div>
        <button
          type="button"
          aria-label="스케줄 입력 닫기"
          onClick={onCancel}
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-200 bg-white text-stone-600"
        >
          <X size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          유형
          <select
            value={form.scheduleType}
            onChange={(event) => onChange({ ...form, scheduleType: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="regular_class">정규 수업</option>
            <option value="makeup">보강</option>
            <option value="external">외부 일정</option>
            <option value="consultation">상담</option>
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          요일
          <select
            value={form.dayOfWeek}
            onChange={(event) => onChange({ ...form, dayOfWeek: Number(event.target.value) })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            {weekDayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          시작
          <input
            type="time"
            value={form.startTime}
            onChange={(event) => onChange({ ...form, startTime: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          종료
          <input
            type="time"
            value={form.endTime}
            onChange={(event) => onChange({ ...form, endTime: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2">
          제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder="예: 월수금 수학 정규 수업"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          연결 반
          <select
            value={form.classId}
            onChange={(event) => changeClass(event.target.value)}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">반 연결 없음</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          담당
          <select
            value={form.teacherId}
            onChange={(event) => onChange({ ...form, teacherId: event.target.value })}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            <option value="">담당자 미지정</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          과목
          <input
            value={form.subject}
            onChange={(event) => onChange({ ...form, subject: event.target.value })}
            placeholder="예: 수학"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800 sm:col-span-2 lg:col-span-3">
          메모
          <input
            value={form.memo}
            onChange={(event) => onChange({ ...form, memo: event.target.value })}
            placeholder="예: 보강 후보에서 제외할 외부 일정"
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          />
        </label>

        <label className="flex min-h-11 items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) => onChange({ ...form, isActive: event.target.checked })}
            className="size-4"
          />
          활성 일정
        </label>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-700"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className={[
            "flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold",
            canSave ? "bg-stone-950 text-white" : "bg-stone-300 text-stone-600",
          ].join(" ")}
        >
          <Save size={16} />
          {status.status === "saving" ? "저장 중" : "저장"}
        </button>
      </div>
    </div>
  );
}

const weekDayOptions = [
  { value: 1, label: "월요일" },
  { value: 2, label: "화요일" },
  { value: 3, label: "수요일" },
  { value: 4, label: "목요일" },
  { value: 5, label: "금요일" },
  { value: 6, label: "토요일" },
  { value: 0, label: "일요일" },
];

function compareStudents(
  first: ManagementStudent,
  second: ManagementStudent,
  sortMode: StudentSortMode,
) {
  if (sortMode === "name") {
    return first.name.localeCompare(second.name, "ko");
  }

  if (sortMode === "class") {
    return (
      (first.className ?? "zz").localeCompare(second.className ?? "zz", "ko") ||
      first.name.localeCompare(second.name, "ko")
    );
  }

  const firstSchedule = getPrimarySchedule(first);
  const secondSchedule = getPrimarySchedule(second);

  if (!firstSchedule && !secondSchedule) {
    return first.name.localeCompare(second.name, "ko");
  }

  if (!firstSchedule) {
    return 1;
  }

  if (!secondSchedule) {
    return -1;
  }

  return (
    daySortValue(firstSchedule.dayOfWeek) - daySortValue(secondSchedule.dayOfWeek) ||
    firstSchedule.startTime.localeCompare(secondSchedule.startTime) ||
    first.name.localeCompare(second.name, "ko")
  );
}

function getActiveSchedules(student: ManagementStudent) {
  return student.schedules
    .filter((schedule) => schedule.isActive)
    .sort(
      (first, second) =>
        daySortValue(first.dayOfWeek) - daySortValue(second.dayOfWeek) ||
        first.startTime.localeCompare(second.startTime),
    );
}

function getPrimarySchedule(student: ManagementStudent) {
  return getActiveSchedules(student)[0] ?? null;
}

function activeScheduleCount(student: ManagementStudent) {
  return student.schedules.filter((schedule) => schedule.isActive).length;
}

function groupSchedulesByDay(schedules: ManagementStudentSchedule[]) {
  const sortedSchedules = schedules
    .slice()
    .sort(
      (first, second) =>
        daySortValue(first.dayOfWeek) - daySortValue(second.dayOfWeek) ||
        first.startTime.localeCompare(second.startTime),
    );
  const grouped = new Map<number, ManagementStudentSchedule[]>();

  sortedSchedules.forEach((schedule) => {
    const daySchedules = grouped.get(schedule.dayOfWeek) ?? [];
    daySchedules.push(schedule);
    grouped.set(schedule.dayOfWeek, daySchedules);
  });

  return Array.from(grouped.entries()).map(([dayOfWeek, daySchedules]) => ({
    dayOfWeek,
    schedules: daySchedules,
  }));
}

function weekDayLabel(dayOfWeek: number) {
  return weekDayOptions.find((day) => day.value === dayOfWeek)?.label ?? `${dayOfWeek}`;
}

function weekDayShortLabel(dayOfWeek: number) {
  const labels: Record<number, string> = {
    0: "일",
    1: "월",
    2: "화",
    3: "수",
    4: "목",
    5: "금",
    6: "토",
  };

  return labels[dayOfWeek] ?? `${dayOfWeek}`;
}

function daySortValue(dayOfWeek: number) {
  return dayOfWeek === 0 ? 7 : dayOfWeek;
}

function scheduleTypeLabel(scheduleType: string) {
  const labels: Record<string, string> = {
    regular_class: "정규",
    makeup: "보강",
    external: "외부",
    consultation: "상담",
  };

  return labels[scheduleType] ?? scheduleType;
}

function scheduleTypeChipClass(scheduleType: string) {
  const styles: Record<string, string> = {
    regular_class: "bg-blue-50 text-blue-800",
    makeup: "bg-emerald-50 text-emerald-800",
    external: "bg-amber-50 text-amber-800",
    consultation: "bg-violet-50 text-violet-800",
  };

  return styles[scheduleType] ?? "bg-stone-100 text-stone-700";
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    active: "재원",
    paused: "휴원",
    left: "퇴원",
  };
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800",
    paused: "bg-amber-50 text-amber-800",
    left: "bg-stone-200 text-stone-700",
  };

  return (
    <span
      className={[
        "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
        styles[status] ?? "bg-stone-200 text-stone-700",
      ].join(" ")}
    >
      {labels[status] ?? status}
    </span>
  );
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    owner: "원장",
    manager: "관리자",
    teacher: "선생님",
    assistant: "보조",
  };

  return labels[role] ?? role;
}
