"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, ClipboardList, GraduationCap, Pencil, Plus, UserPlus, UsersRound } from "lucide-react";
import type {
  BulkScheduleFormState,
  ClassFormState,
  FormStatus,
  ManagementClass,
  ManagementMember,
  ManagementSettings,
  ManagementStudent,
  ManagementStudentSchedule,
  MemberFormState,
  ScheduleFormState,
  StudentFormState,
  SettingsFormState,
  StudentScheduleFilter,
  StudentSortMode,
} from "@/app/app/management-types";
import { ManagementPanel, SummaryCard } from "@/app/app/management-common";
import {
  BulkScheduleForm,
  ClassForm,
  MemberForm,
  ScheduleForm,
  StudentForm,
} from "@/app/app/management-forms";
import { roleLabel } from "@/app/app/management-utils";
import { StudentDirectory } from "@/app/app/student-directory";

export function ManagementHome({
  academyName,
  classes,
  members,
  students,
  settings,
}: {
  academyName: string;
  classes: ManagementClass[];
  members: ManagementMember[];
  students: ManagementStudent[];
  settings: ManagementSettings;
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
  const [memberForm, setMemberForm] = useState<MemberFormState | null>(null);
  const [memberFormStatus, setMemberFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState | null>(null);
  const [scheduleFormStatus, setScheduleFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });
  const [bulkScheduleForm, setBulkScheduleForm] = useState<BulkScheduleFormState | null>(
    null,
  );
  const [bulkScheduleFormStatus, setBulkScheduleFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(settings);
  const [settingsFormStatus, setSettingsFormStatus] = useState<FormStatus>({
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
    member.status === "active" &&
    ["owner", "manager", "teacher", "assistant"].includes(member.role),
  );

  function openCreateClassForm() {
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
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
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
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

  function openBulkScheduleForm(classItem: ManagementClass) {
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm({
      classId: classItem.id,
      className: classItem.name,
      teacherId: classItem.teacherId ?? "",
      scheduleType: "regular_class",
      dayOfWeek: 1,
      startTime: "16:30",
      endTime: "18:00",
      subject: classItem.subject ?? "",
      title: classItem.name,
      memo: "",
    });
    setBulkScheduleFormStatus({ status: "idle", message: "" });
  }

  async function saveBulkScheduleForm() {
    if (!bulkScheduleForm) {
      return;
    }

    setBulkScheduleFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/student-schedules/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          classId: bulkScheduleForm.classId,
          teacherId: bulkScheduleForm.teacherId,
          scheduleType: bulkScheduleForm.scheduleType,
          dayOfWeek: bulkScheduleForm.dayOfWeek,
          startTime: bulkScheduleForm.startTime,
          endTime: bulkScheduleForm.endTime,
          subject: bulkScheduleForm.subject,
          title: bulkScheduleForm.title,
          memo: bulkScheduleForm.memo,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        insertedCount?: number;
        skippedCount?: number;
        totalStudents?: number;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "반 스케줄을 일괄 등록하지 못했습니다.");
      }

      setBulkScheduleFormStatus({
        status: "saved",
        message:
          payload.message ??
          `등록 ${payload.insertedCount ?? 0}명 · 건너뜀 ${payload.skippedCount ?? 0}명`,
      });
      setBulkScheduleForm(null);
      router.refresh();
    } catch (error) {
      setBulkScheduleFormStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "반 스케줄을 일괄 등록하지 못했습니다.",
      });
    }
  }

  function openCreateStudentForm() {
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setStudentForm({
      mode: "create",
      studentId: "",
      classId: "",
      name: "",
      schoolName: "",
      gradeLabel: "",
      parentName: "",
      parentPhone: "",
      studentPhone: "",
      status: "active",
    });
    setStudentFormStatus({ status: "idle", message: "" });
  }

  function openEditStudentForm(student: ManagementStudent) {
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setStudentForm({
      mode: "edit",
      studentId: student.id,
      classId: student.classId ?? "",
      name: student.name,
      schoolName: student.schoolName ?? "",
      gradeLabel: student.gradeLabel ?? "",
      parentName: student.parentName ?? "",
      parentPhone: student.parentPhone,
      studentPhone: student.studentPhone ?? "",
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
          studentPhone: studentForm.studentPhone,
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

    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setScheduleForm({
      mode: "create",
      scheduleId: "",
      studentId: student.id,
      studentName: student.name,
      classId: student.classId ?? "",
      teacherId: classItem?.teacherId ?? "",
      scheduleType: "regular_class",
      scheduleDate: "",
      dayOfWeek: 1,
      startTime: "16:30",
      endTime: "18:00",
      subject: classItem?.subject ?? "",
      title: defaultTitle,
      memo: "",
      isActive: true,
      sourceFollowupId: "",
    });
    setScheduleFormStatus({ status: "idle", message: "" });
  }

  function openEditScheduleForm(student: ManagementStudent, schedule: ManagementStudentSchedule) {
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setScheduleForm({
      mode: "edit",
      scheduleId: schedule.id,
      studentId: student.id,
      studentName: student.name,
      classId: schedule.classId ?? "",
      teacherId: schedule.teacherId ?? "",
      scheduleType: schedule.scheduleType,
      scheduleDate: schedule.scheduleDate ?? "",
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subject: schedule.subject ?? "",
      title: schedule.title,
      memo: schedule.memo ?? "",
      isActive: schedule.isActive,
      sourceFollowupId: schedule.sourceFollowupId ?? "",
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
          scheduleDate: scheduleForm.scheduleDate,
          dayOfWeek: scheduleForm.dayOfWeek,
          startTime: scheduleForm.startTime,
          endTime: scheduleForm.endTime,
          subject: scheduleForm.subject,
          title: scheduleForm.title,
          memo: scheduleForm.memo,
          isActive: scheduleForm.isActive,
          sourceFollowupId: scheduleForm.sourceFollowupId,
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

  function openCreateMemberForm() {
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setMemberForm({
      mode: "create",
      memberId: "",
      name: "",
      email: "",
      phone: "",
      role: "teacher",
      status: "active",
      password: "",
    });
    setMemberFormStatus({ status: "idle", message: "" });
  }

  function openEditMemberForm(member: ManagementMember) {
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setMemberForm({
      mode: "edit",
      memberId: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone ?? "",
      role: member.role,
      status: member.status,
      password: "",
    });
    setMemberFormStatus({ status: "idle", message: "" });
  }

  async function saveMemberForm() {
    if (!memberForm) {
      return;
    }

    setMemberFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/members", {
        method: memberForm.mode === "create" ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          memberId: memberForm.memberId,
          name: memberForm.name,
          email: memberForm.email,
          phone: memberForm.phone,
          role: memberForm.role,
          status: memberForm.status,
          password: memberForm.password,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "구성원 정보를 저장하지 못했습니다.");
      }

      setMemberFormStatus({
        status: "saved",
        message:
          memberForm.mode === "create"
            ? "구성원 계정을 생성했습니다. 이메일과 임시 비밀번호로 로그인할 수 있습니다."
            : "구성원 정보를 수정했습니다.",
      });
      setMemberForm(null);
      router.refresh();
    } catch (error) {
      setMemberFormStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : "구성원 정보를 저장하지 못했습니다.",
      });
    }
  }

  async function saveSettingsForm() {
    setSettingsFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/academy-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsForm),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "학원 설정을 저장하지 못했습니다.");
      }

      setSettingsFormStatus({ status: "saved", message: "학원 설정을 저장했습니다." });
      router.refresh();
    } catch (error) {
      setSettingsFormStatus({
        status: "error",
        message: error instanceof Error ? error.message : "학원 설정을 저장하지 못했습니다.",
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

      <section className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
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

      <ManagementPanel
        title="학원 운영 설정"
        description="서비스에 표시되는 학원명과 문자 발송 정책을 관리합니다."
        actionLabel={
          settingsFormStatus.status === "saving" ? "저장 중" : "설정 저장"
        }
        onAction={saveSettingsForm}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-medium text-stone-800">
            학원명
            <input
              value={settingsForm.academyName}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, academyName: event.target.value })
              }
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-stone-800">
            발신명
            <input
              value={settingsForm.senderName}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, senderName: event.target.value })
              }
              placeholder="문자에 표시할 학원명"
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-stone-800">
            발신번호
            <input
              value={settingsForm.senderPhone}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, senderPhone: event.target.value })
              }
              placeholder="0410000000"
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-stone-800">
            중복 발송 방지 시간
            <input
              type="number"
              min={0}
              value={settingsForm.duplicateGuardMinutes}
              onChange={(event) =>
                setSettingsForm({
                  ...settingsForm,
                  duplicateGuardMinutes: Number(event.target.value),
                })
              }
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800">
            <input
              type="checkbox"
              checked={settingsForm.smsDryRun}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, smsDryRun: event.target.checked })
              }
              className="size-4 accent-emerald-700"
            />
            실제 문자 발송 막기
          </label>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800">
            <input
              type="checkbox"
              checked={settingsForm.allowAssistantSend}
              onChange={(event) =>
                setSettingsForm({
                  ...settingsForm,
                  allowAssistantSend: event.target.checked,
                })
              }
              className="size-4 accent-emerald-700"
            />
            보조 선생님 발송 허용
          </label>
        </div>

        {settingsFormStatus.status === "saved" || settingsFormStatus.status === "error" ? (
          <p
            className={[
              "mt-3 rounded-md border px-3 py-2 text-sm",
              settingsFormStatus.status === "saved"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            {settingsFormStatus.message}
          </p>
        ) : null}
      </ManagementPanel>

      <section className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
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

          {bulkScheduleForm ? (
            <BulkScheduleForm
              form={bulkScheduleForm}
              status={bulkScheduleFormStatus}
              teacherOptions={teacherOptions}
              onChange={setBulkScheduleForm}
              onCancel={() => {
                setBulkScheduleForm(null);
                setBulkScheduleFormStatus({ status: "idle", message: "" });
              }}
              onSave={saveBulkScheduleForm}
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

          {bulkScheduleFormStatus.status === "saved" ||
          bulkScheduleFormStatus.status === "error" ? (
            <p
              className={[
                "mb-3 rounded-md border px-3 py-2 text-sm",
                bulkScheduleFormStatus.status === "saved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {bulkScheduleFormStatus.message}
            </p>
          ) : null}

          <div className="divide-y divide-stone-100">
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="grid min-w-0 gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{classItem.name}</p>
                  <p className="mt-1 break-words text-xs text-stone-500">
                    {[classItem.subject, classItem.gradeLabel].filter(Boolean).join(" · ") ||
                      "과목/학년 미지정"}
                  </p>
                  <p className="mt-1 break-words text-xs text-stone-500">
                    담당: {classItem.teacherName ?? "미지정"}
                  </p>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">
                  <span className="w-fit shrink-0 rounded-md bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700">
                    학생 {classItem.studentCount}명
                  </span>
                  <button
                    type="button"
                    onClick={() => openBulkScheduleForm(classItem)}
                    className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-2.5 text-xs font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100"
                  >
                    <ClipboardList size={13} />
                    스케줄
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditClassForm(classItem)}
                    className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
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
          description="원장, 관리자, 선생님 계정을 생성하고 권한과 활성 상태를 관리합니다."
          actionLabel="구성원 등록"
          actionIcon={<UserPlus size={14} />}
          onAction={openCreateMemberForm}
        >
          {memberForm ? (
            <MemberForm
              form={memberForm}
              status={memberFormStatus}
              onChange={setMemberForm}
              onCancel={() => {
                setMemberForm(null);
                setMemberFormStatus({ status: "idle", message: "" });
              }}
              onSave={saveMemberForm}
            />
          ) : null}

          {memberFormStatus.status === "saved" || memberFormStatus.status === "error" ? (
            <p
              className={[
                "mb-3 rounded-md border px-3 py-2 text-sm",
                memberFormStatus.status === "saved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {memberFormStatus.message}
            </p>
          ) : null}

          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="rounded-lg border border-stone-200 bg-stone-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-stone-950">{member.name}</p>
                    <p className="mt-1 truncate text-xs text-stone-500">{member.email}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      {member.maskedPhone ?? "전화번호 미등록"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-700">
                      {roleLabel(member.role)}
                    </span>
                    <span
                      className={[
                        "rounded-md px-2 py-1 text-xs font-semibold",
                        member.status === "active"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-stone-200 text-stone-700",
                      ].join(" ")}
                    >
                      {member.status === "active" ? "활성" : "비활성"}
                    </span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 text-xs text-stone-500">담당 반 {member.classCount}개</p>
                  <button
                    type="button"
                    onClick={() => openEditMemberForm(member)}
                    className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:border-stone-300 hover:bg-stone-50"
                  >
                    <Pencil size={13} />
                    수정
                  </button>
                </div>
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
