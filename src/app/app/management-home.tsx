"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CircleDashed,
  FileSpreadsheet,
  MessageSquareText,
  Pencil,
  Plus,
  UserPlus,
} from "lucide-react";
import type {
  BulkScheduleFormState,
  ClassFormState,
  FormStatus,
  ManagementClass,
  ManagementMessageTemplate,
  ManagementMember,
  ManagementSettings,
  ManagementStudent,
  ManagementStudentSchedule,
  MessageTemplateFormState,
  MemberFormState,
  ScheduleFormState,
  StudentFormState,
  SettingsFormState,
  StudentScheduleFilter,
  StudentSortMode,
} from "@/app/app/management-types";
import { ManagementPanel } from "@/app/app/management-common";
import {
  BulkScheduleForm,
  ClassForm,
  MemberForm,
  ScheduleForm,
  StudentForm,
} from "@/app/app/management-forms";
import { roleLabel } from "@/app/app/management-utils";
import { StudentBulkImportForm } from "@/app/app/student-bulk-import";
import { StudentDirectory } from "@/app/app/student-directory";
import { getMessageLengthMetrics } from "@/lib/message-length";
import type { StudentImportValidatedRow } from "@/lib/student-import";

type ManagementSection =
  | "setup"
  | "students"
  | "classes"
  | "members"
  | "templates"
  | "settings";

export function ManagementHome({
  academyName,
  classes,
  members,
  students,
  settings,
  templates,
  attendanceSessionCount,
  onNavigate,
}: {
  academyName: string;
  classes: ManagementClass[];
  members: ManagementMember[];
  students: ManagementStudent[];
  settings: ManagementSettings;
  templates: ManagementMessageTemplate[];
  attendanceSessionCount: number;
  onNavigate: (view: "home" | "operations" | "attendance" | "management") => void;
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
  const [isBulkStudentImportOpen, setIsBulkStudentImportOpen] = useState(false);
  const [bulkStudentImportStatus, setBulkStudentImportStatus] = useState<FormStatus>({
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
  const [templateForm, setTemplateForm] = useState<MessageTemplateFormState | null>(
    null,
  );
  const [templateFormStatus, setTemplateFormStatus] = useState<FormStatus>({
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
  const [activeSection, setActiveSection] = useState<ManagementSection>("setup");
  const activeStudents = useMemo(
    () => students.filter((student) => student.status === "active"),
    [students],
  );
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
    setIsBulkStudentImportOpen(false);
    setBulkStudentImportStatus({ status: "idle", message: "" });
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
    setIsBulkStudentImportOpen(false);
    setBulkStudentImportStatus({ status: "idle", message: "" });
    setClassForm({
      mode: "edit",
      classId: classItem.id,
      name: classItem.name,
      subject: classItem.subject ?? "",
      gradeLabel: normalizeGradeLabel(classItem.gradeLabel),
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
      dayOfWeeks: [1, 3],
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
          dayOfWeeks: bulkScheduleForm.dayOfWeeks,
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
    setIsBulkStudentImportOpen(false);
    setBulkStudentImportStatus({ status: "idle", message: "" });
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
    setIsBulkStudentImportOpen(false);
    setBulkStudentImportStatus({ status: "idle", message: "" });
    setStudentForm({
      mode: "edit",
      studentId: student.id,
      classId: student.classId ?? "",
      name: student.name,
      schoolName: student.schoolName ?? "",
      gradeLabel: normalizeGradeLabel(student.gradeLabel),
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

  function openBulkStudentImport() {
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setIsBulkStudentImportOpen(true);
    setBulkStudentImportStatus({ status: "idle", message: "" });
  }

  async function saveBulkStudentImport(rows: StudentImportValidatedRow[]) {
    setBulkStudentImportStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/students/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rows: rows.map((row) => ({
            rowNumber: row.rowNumber,
            name: row.name,
            className: row.className,
            schoolName: row.schoolName,
            gradeLabel: row.gradeLabel,
            parentName: row.parentName,
            parentPhone: row.normalizedParentPhone,
            studentPhone: row.normalizedStudentPhone ?? "",
            status: row.status,
          })),
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
        insertedCount?: number;
        duplicateCount?: number;
        invalidCount?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "학생 일괄 등록에 실패했습니다.");
      }

      setBulkStudentImportStatus({
        status: "saved",
        message:
          payload.message ??
          `등록 ${payload.insertedCount ?? 0}명 · 중복 ${payload.duplicateCount ?? 0}명 · 오류 ${payload.invalidCount ?? 0}명`,
      });
      setIsBulkStudentImportOpen(false);
      router.refresh();
    } catch (error) {
      setBulkStudentImportStatus({
        status: "error",
        message:
          error instanceof Error ? error.message : "학생 일괄 등록에 실패했습니다.",
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

  async function deleteScheduleForm() {
    if (!scheduleForm || scheduleForm.mode !== "edit") {
      return;
    }

    setScheduleFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/student-schedules", {
        method: "PATCH",
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
          isActive: false,
          sourceFollowupId: scheduleForm.sourceFollowupId,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "스케줄을 삭제하지 못했습니다.");
      }

      setScheduleFormStatus({
        status: "saved",
        message: "학생 스케줄을 삭제했습니다.",
      });
      setScheduleForm(null);
      router.refresh();
    } catch (error) {
      setScheduleFormStatus({
        status: "error",
        message: error instanceof Error ? error.message : "스케줄을 삭제하지 못했습니다.",
      });
    }
  }

  function openSetupMemberForm() {
    setActiveSection("members");
    openCreateMemberForm();
  }

  function openSetupClassForm() {
    setActiveSection("classes");
    openCreateClassForm();
  }

  function openSetupStudentForm() {
    setActiveSection("students");
    openCreateStudentForm();
  }

  function openMissingScheduleStudents() {
    setActiveSection("students");
    setStudentStatusFilter("active");
    setStudentScheduleFilter("missing_schedule");
    setStudentSortMode("class");
  }

  function openSetupClassScheduleForm() {
    setActiveSection("classes");

    if (classes[0]) {
      openBulkScheduleForm(classes[0]);
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
            ? "구성원 계정을 생성했습니다. 자동 생성된 로그인 ID와 임시 비밀번호로 로그인할 수 있습니다."
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

  function openEditTemplateForm(template: ManagementMessageTemplate) {
    setTemplateForm({
      templateId: template.id,
      reason: template.reason,
      reasonLabel: template.reasonLabel,
      title: template.title,
      body: template.body,
      isActive: template.isActive,
    });
    setTemplateFormStatus({ status: "idle", message: "" });
  }

  async function saveTemplateForm() {
    if (!templateForm) {
      return;
    }

    setTemplateFormStatus({ status: "saving", message: "" });

    try {
      const response = await fetch("/api/message-templates", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: templateForm.reason,
          title: templateForm.title,
          body: templateForm.body,
          isActive: templateForm.isActive,
        }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "문자 템플릿을 저장하지 못했습니다.");
      }

      setTemplateFormStatus({
        status: "saved",
        message: `${templateForm.reasonLabel} 템플릿을 저장했습니다.`,
      });
      setTemplateForm(null);
      router.refresh();
    } catch (error) {
      setTemplateFormStatus({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "문자 템플릿을 저장하지 못했습니다.",
      });
    }
  }

  const managementSections: Array<{
    id: ManagementSection;
    label: string;
    detail: string;
    count: string;
  }> = [
    { id: "setup", label: "원장 시작", detail: "선생님·반·학생·수업·출석", count: "순서" },
    { id: "students", label: "학생", detail: "명단·스케줄·연락처", count: `${activeStudents.length}` },
    { id: "classes", label: "반", detail: "반·담당·일괄 스케줄", count: `${classes.length}` },
    { id: "members", label: "구성원", detail: "권한·계정·담당 반", count: `${members.length}` },
    { id: "templates", label: "문자", detail: "사유별 템플릿", count: `${templates.length}` },
    { id: "settings", label: "설정", detail: "발신·정책·권한", count: "정책" },
  ];

  return (
    <div className="space-y-4 text-[#1C1917] sm:space-y-5">
      <MobileAdminInbox
        activeStudents={activeStudents.length}
        missingSchedules={students.filter((student) => student.schedules.filter((schedule) => schedule.isActive).length === 0).length}
        classCount={classes.length}
        memberCount={members.length}
        onShowStudents={() => setActiveSection("students")}
        onShowClasses={() => setActiveSection("classes")}
      />

      <section className="overflow-hidden border-b border-[#DED8CE] bg-transparent sm:rounded-lg sm:border sm:border-[#E2DED6] sm:bg-white sm:shadow-sm">
        <div className="hidden px-4 py-4 sm:block sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#315C7C]">
            Academy Admin
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold leading-tight text-stone-950 sm:text-2xl">
                {academyName}
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
                학생, 반, 구성원, 발송 정책을 한 곳에서 관리합니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4 rounded-md border border-[#E2DED6] bg-[#F7F5F0] px-4 py-2.5 text-sm sm:gap-6">
              <Metric label="재원" value={`${activeStudents.length}명`} />
              <Metric label="스케줄 미등록" value={`${students.filter((student) => student.schedules.filter((schedule) => schedule.isActive).length === 0).length}명`} />
              <Metric label="반" value={`${classes.length}개`} />
            </div>
          </div>
        </div>

        <div className="px-0 py-2 sm:border-t sm:border-[#E2DED6] sm:px-5">
          <div className="grid max-w-full grid-cols-3 gap-1.5 sm:flex sm:overflow-x-auto">
          {managementSections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={[
                "min-w-0 rounded-md border px-2 py-2 text-left transition sm:shrink-0 sm:px-3",
                activeSection === section.id
                  ? "border-[#315C7C] bg-[#EAF1F8] text-[#244B67]"
                  : "border-transparent bg-white text-stone-700 hover:bg-[#F2F5F8]",
              ].join(" ")}
            >
              <span className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <span className="truncate text-sm font-semibold">{section.label}</span>
                <span
                  className={[
                    "shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold sm:px-2",
                    activeSection === section.id
                      ? "bg-white text-[#244B67]"
                      : "bg-[#F7F5F0] text-stone-600",
                  ].join(" ")}
                >
                  {section.count}
                </span>
              </span>
              <span className="sr-only">{section.detail}</span>
            </button>
          ))}
          </div>
        </div>
      </section>

      {activeSection === "setup" ? (
        <ManagementPanel
          title="원장 시작 순서"
          description="처음 운영을 시작할 때 필요한 선생님, 반, 학생, 수업 시간, 출석 확인을 순서대로 점검합니다."
          actionLabel="출석 확인"
          actionIcon={<ClipboardList size={14} />}
          onAction={() => onNavigate("attendance")}
        >
          <SetupWorkflow
            memberCount={members.length}
            classCount={classes.length}
            activeStudentCount={activeStudents.length}
            unassignedStudentCount={activeStudents.filter((student) => !student.classId).length}
            attendanceSessionCount={attendanceSessionCount}
            missingScheduleCount={
              activeStudents.filter(
                (student) => student.schedules.filter((schedule) => schedule.isActive).length === 0,
              ).length
            }
            onCreateMember={openSetupMemberForm}
            onCreateClass={openSetupClassForm}
            onCreateStudent={openSetupStudentForm}
            onOpenClassSchedules={openSetupClassScheduleForm}
            onOpenAttendance={() => onNavigate("attendance")}
          />
        </ManagementPanel>
      ) : null}

      {activeSection === "templates" ? (
        <ManagementPanel
          title="문자 템플릿"
          description="결석, 지각, 보강 같은 사유별 기본 문구를 학원 말투에 맞게 관리합니다."
          actionLabel="첫 템플릿 수정"
          actionIcon={<MessageSquareText size={14} />}
          onAction={templates[0] ? () => openEditTemplateForm(templates[0]) : undefined}
        >
          {templateForm ? (
            <MessageTemplateForm
              form={templateForm}
              status={templateFormStatus}
              onChange={setTemplateForm}
              onCancel={() => {
                setTemplateForm(null);
                setTemplateFormStatus({ status: "idle", message: "" });
              }}
              onSave={saveTemplateForm}
            />
          ) : null}

          {!templateForm &&
          (templateFormStatus.status === "saved" ||
            templateFormStatus.status === "error") ? (
            <p
              className={[
                "mb-3 rounded-md border px-3 py-2 text-sm",
                templateFormStatus.status === "saved"
                  ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {templateFormStatus.message}
            </p>
          ) : null}

          <MessageTemplateList
            templates={templates}
            activeReason={templateForm?.reason ?? null}
            onEditTemplate={openEditTemplateForm}
          />
        </ManagementPanel>
      ) : null}

      {activeSection === "settings" ? (
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
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
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
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
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
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
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
              className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
          </label>

          <label className="flex min-h-11 items-center gap-3 rounded-md border border-stone-300 bg-white px-3 text-sm font-medium text-stone-800">
            <input
              type="checkbox"
              checked={settingsForm.smsDryRun}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, smsDryRun: event.target.checked })
              }
              className="size-4 accent-[#315C7C]"
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
              className="size-4 accent-[#315C7C]"
            />
            보조 선생님 발송 허용
          </label>
        </div>

        {settingsFormStatus.status === "saved" || settingsFormStatus.status === "error" ? (
          <p
            className={[
              "mt-3 rounded-md border px-3 py-2 text-sm",
              settingsFormStatus.status === "saved"
                ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            {settingsFormStatus.message}
          </p>
        ) : null}
      </ManagementPanel>
      ) : null}

      {activeSection === "classes" ? (
        <ManagementPanel
          title="반 관리"
          description="반을 만들고 주 담당 선생님과 반 공통 수업 시간을 연결합니다."
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
                  ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
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
                  ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {bulkScheduleFormStatus.message}
            </p>
          ) : null}

          <div className="mb-3 rounded-lg border border-[#C9D6E2] bg-[#F8FBFD] px-3 py-3 text-sm text-[#244B67]">
            반을 만든 뒤 <span className="font-semibold">수업 시간 등록</span>을 누르면
            그 반의 재원 학생 전체에게 같은 주간 스케줄이 추가됩니다.
          </div>

          <div className="overflow-hidden rounded-lg border border-[#E6E0D5] bg-white">
            <div className="hidden grid-cols-[minmax(180px,1.2fr)_120px_120px_minmax(140px,1fr)_220px] border-b border-[#E6E0D5] bg-[#FBFAF7] px-3 py-2.5 text-xs font-semibold text-stone-500 md:grid">
              <span>반</span>
              <span>과목</span>
              <span>학년</span>
              <span>담당</span>
              <span className="text-right">작업</span>
            </div>
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="grid min-w-0 gap-3 border-b border-[#EFE9DE] px-3 py-3.5 last:border-b-0 md:grid-cols-[minmax(180px,1.2fr)_120px_120px_minmax(140px,1fr)_220px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{classItem.name}</p>
                  <p className="mt-1 text-xs text-stone-500 md:hidden">
                    {[classItem.subject, displayGradeLabel(classItem.gradeLabel), classItem.teacherName ?? "담당 미지정"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="hidden text-sm text-stone-700 md:block">{classItem.subject ?? "-"}</p>
                <p className="hidden text-sm text-stone-700 md:block">{displayGradeLabel(classItem.gradeLabel) ?? "-"}</p>
                <p className="hidden truncate text-sm text-stone-700 md:block">{classItem.teacherName ?? "미지정"}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                  <span className="w-fit shrink-0 rounded-md bg-[#F7F5F0] px-2.5 py-1 text-xs font-semibold text-stone-700">
                    학생 {classItem.studentCount}명
                  </span>
                  <button
                    type="button"
                    onClick={() => openBulkScheduleForm(classItem)}
                    className="flex min-h-8 shrink-0 items-center gap-1 rounded-md bg-[#315C7C] px-2.5 text-xs font-semibold text-white transition hover:bg-[#244B67]"
                  >
                    <ClipboardList size={13} />
                    수업 시간 등록
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditClassForm(classItem)}
                    className="flex min-h-8 shrink-0 items-center gap-1 rounded-md border border-[#E6E0D5] bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:bg-[#F7F5F0]"
                  >
                    <Pencil size={13} />
                    수정
                  </button>
                </div>
              </div>
            ))}
          </div>
        </ManagementPanel>
      ) : null}

      {activeSection === "members" ? (
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
                  ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {memberFormStatus.message}
            </p>
          ) : null}

          <div className="overflow-hidden rounded-lg border border-[#E6E0D5] bg-white">
            <div className="hidden grid-cols-[minmax(160px,1fr)_minmax(180px,1.1fr)_100px_110px_90px_80px] border-b border-[#E6E0D5] bg-[#FBFAF7] px-3 py-2.5 text-xs font-semibold text-stone-500 md:grid">
              <span>이름</span>
              <span>이메일</span>
              <span>직위</span>
              <span>전화번호</span>
              <span>담당 반</span>
              <span className="text-right">작업</span>
            </div>
            {members.map((member) => (
              <div
                key={member.id}
                className="grid min-w-0 gap-2 border-b border-[#EFE9DE] px-3 py-3.5 last:border-b-0 md:grid-cols-[minmax(160px,1fr)_minmax(180px,1.1fr)_100px_110px_90px_80px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-stone-950">{member.name}</p>
                  <p className="mt-1 truncate text-xs text-stone-500 md:hidden">{member.email}</p>
                </div>
                <p className="hidden truncate text-sm text-stone-700 md:block">{member.email}</p>
                <p className="text-sm text-stone-700">{roleLabel(member.role)}</p>
                <p className="text-sm text-stone-700">{member.maskedPhone ?? "미등록"}</p>
                <p className="text-sm text-stone-700">담당 {member.classCount}개</p>
                <button
                  type="button"
                  onClick={() => openEditMemberForm(member)}
                  className="flex min-h-8 w-fit shrink-0 items-center gap-1 rounded-md border border-[#E6E0D5] bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:bg-[#F7F5F0] md:ml-auto"
                >
                  <Pencil size={13} />
                  수정
                </button>
              </div>
            ))}
          </div>
        </ManagementPanel>
      ) : null}

      {activeSection === "students" ? (
      <ManagementPanel
        title="학생 관리"
        description="학생을 반에 배정하고, 출석과 보강 기준이 되는 수업 스케줄을 관리합니다."
        actionLabel="학생 등록"
        actionIcon={<Plus size={14} />}
        onAction={openCreateStudentForm}
      >
        <div className="mb-3 grid gap-2 rounded-md border border-[#E6E0D5] bg-white p-2.5 sm:mb-4 sm:bg-[#F7F5F0] sm:p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-stone-950">학생 등록 후 반 배정과 스케줄까지 확인합니다.</p>
            <p className="mt-1 hidden text-xs leading-5 text-stone-500 sm:block">
              반이 없는 학생은 권한과 출석 흐름이 애매해지고, 스케줄이 없는 학생은 출석부에 나타나지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openMissingScheduleStudents}
              className="flex min-h-9 w-auto shrink-0 items-center justify-center gap-2 rounded-md border border-[#C9D6E2] bg-white px-3 text-xs font-semibold text-[#315C7C] transition hover:bg-[#EAF1F8] sm:min-h-10"
            >
              <CalendarDays size={14} />
              스케줄 미등록 보기
            </button>
            <button
              type="button"
              onClick={openBulkStudentImport}
              className="flex min-h-9 w-auto shrink-0 items-center justify-center gap-2 rounded-md bg-[#315C7C] px-3 text-xs font-semibold text-white transition hover:bg-[#244B67] sm:min-h-10"
            >
              <FileSpreadsheet size={14} />
              CSV 일괄 등록
            </button>
          </div>
        </div>

        {isBulkStudentImportOpen ? (
          <StudentBulkImportForm
            classes={classes}
            existingStudents={students}
            status={bulkStudentImportStatus}
            onCancel={() => {
              setIsBulkStudentImportOpen(false);
              setBulkStudentImportStatus({ status: "idle", message: "" });
            }}
            onSubmit={saveBulkStudentImport}
          />
        ) : null}

        {!isBulkStudentImportOpen &&
        (bulkStudentImportStatus.status === "saved" ||
          bulkStudentImportStatus.status === "error") ? (
          <p
            className={[
              "mb-3 rounded-md border px-3 py-2 text-sm",
              bulkStudentImportStatus.status === "saved"
                ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                : "border-red-200 bg-red-50 text-red-900",
            ].join(" ")}
          >
            {bulkStudentImportStatus.message}
          </p>
        ) : null}

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
                ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
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
            onDelete={deleteScheduleForm}
          />
        ) : null}

        {scheduleFormStatus.status === "saved" || scheduleFormStatus.status === "error" ? (
          <p
            className={[
              "mb-3 rounded-md border px-3 py-2 text-sm",
              scheduleFormStatus.status === "saved"
                ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
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
      ) : null}
    </div>
  );
}

function MessageTemplateForm({
  form,
  status,
  onChange,
  onCancel,
  onSave,
}: {
  form: MessageTemplateFormState;
  status: FormStatus;
  onChange: (form: MessageTemplateFormState) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const isSaving = status.status === "saving";
  const bodyMetrics = getMessageLengthMetrics(form.body);

  return (
    <div className="mb-4 rounded-lg border border-[#C9D6E2] bg-[#F8FBFD] p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#315C7C]">
            {form.reasonLabel}
          </p>
          <h4 className="mt-1 text-base font-semibold text-stone-950">
            문자 템플릿 수정
          </h4>
        </div>
        <label className="flex w-fit items-center gap-2 rounded-md border border-[#D8D0C4] bg-white px-3 py-2 text-xs font-semibold text-stone-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(event) =>
              onChange({ ...form, isActive: event.target.checked })
            }
            className="size-4 accent-[#315C7C]"
          />
          미리보기 사용
        </label>
      </div>

      <div className="mt-4 grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          템플릿 제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder={`${form.reasonLabel} 안내`}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-stone-800">
          문자 본문
          <textarea
            value={form.body}
            onChange={(event) => onChange({ ...form, body: event.target.value })}
            rows={7}
            className="min-h-40 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
          />
          <span
            className={[
              "text-xs font-medium",
              bodyMetrics.isOverLimit
                ? "text-red-700"
                : bodyMetrics.transportType === "lms"
                  ? "text-amber-700"
                  : "text-stone-500",
            ].join(" ")}
          >
            {bodyMetrics.charCount}자 · {bodyMetrics.byteCount}byte ·{" "}
            {bodyMetrics.isOverLimit
              ? "2000byte 초과"
              : bodyMetrics.transportType === "lms"
                ? "LMS 예상"
                : "SMS 예상"}
            {bodyMetrics.hasEmoji ? " · 이모지/특수문자 확인 필요" : ""}
          </span>
        </label>
      </div>

      <div className="mt-3 rounded-md border border-[#E6E0D5] bg-white px-3 py-2 text-xs leading-5 text-stone-600">
        사용할 수 있는 변수:
        <span className="ml-1 font-semibold text-stone-800">
          {"{{academyName}}"}, {"{{studentName}}"}, {"{{teacherName}}"},{" "}
          {"{{className}}"}, {"{{makeupCandidateTime}}"}
        </span>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-md border border-[#D8D0C4] bg-white px-4 text-sm font-semibold text-stone-700 transition hover:bg-[#F7F5F0]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={isSaving || bodyMetrics.isOverLimit}
          onClick={onSave}
          className="min-h-10 rounded-md bg-[#315C7C] px-4 text-sm font-semibold text-white transition hover:bg-[#244B67] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "저장 중" : "템플릿 저장"}
        </button>
      </div>
    </div>
  );
}

function MessageTemplateList({
  templates,
  activeReason,
  onEditTemplate,
}: {
  templates: ManagementMessageTemplate[];
  activeReason: string | null;
  onEditTemplate: (template: ManagementMessageTemplate) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-[#E6E0D5] bg-white">
      <div className="hidden grid-cols-[140px_minmax(160px,0.7fr)_minmax(280px,1.5fr)_90px] border-b border-[#E6E0D5] bg-[#FBFAF7] px-3 py-2.5 text-xs font-semibold text-stone-500 md:grid">
        <span>사유</span>
        <span>제목</span>
        <span>본문 미리보기</span>
        <span className="text-right">작업</span>
      </div>
      {templates.map((template) => {
        const isActive = activeReason === template.reason;

        return (
          <div
            key={template.reason}
            className={[
              "grid min-w-0 gap-2 border-b border-[#EFE9DE] px-3 py-3.5 last:border-b-0 md:grid-cols-[140px_minmax(160px,0.7fr)_minmax(280px,1.5fr)_90px] md:items-center",
              isActive ? "bg-[#F8FBFD]" : "",
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-950">
                {template.reasonLabel}
              </p>
              <p className="mt-1 text-xs text-stone-500 md:hidden">
                {template.title}
              </p>
            </div>
            <p className="hidden truncate text-sm font-medium text-stone-800 md:block">
              {template.title}
            </p>
            <p className="line-clamp-2 min-w-0 text-sm leading-6 text-stone-600">
              {template.body}
            </p>
            <div className="flex items-center justify-between gap-2 md:justify-end">
              {!template.isActive ? (
                <span className="rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                  비활성
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => onEditTemplate(template)}
                className="flex min-h-8 w-fit shrink-0 items-center gap-1 rounded-md border border-[#E6E0D5] bg-white px-2.5 text-xs font-semibold text-stone-700 transition hover:bg-[#F7F5F0] md:ml-auto"
              >
                <Pencil size={13} />
                수정
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function normalizeGradeLabel(gradeLabel: string | null) {
  if (!gradeLabel) {
    return "";
  }

  return gradeLabel === "무학년" ? "무학년제" : gradeLabel;
}

function displayGradeLabel(gradeLabel: string | null) {
  const normalized = normalizeGradeLabel(gradeLabel);

  return normalized || null;
}

function SetupWorkflow({
  memberCount,
  classCount,
  activeStudentCount,
  unassignedStudentCount,
  missingScheduleCount,
  attendanceSessionCount,
  onCreateMember,
  onCreateClass,
  onCreateStudent,
  onOpenClassSchedules,
  onOpenAttendance,
}: {
  memberCount: number;
  classCount: number;
  activeStudentCount: number;
  unassignedStudentCount: number;
  missingScheduleCount: number;
  attendanceSessionCount: number;
  onCreateMember: () => void;
  onCreateClass: () => void;
  onCreateStudent: () => void;
  onOpenClassSchedules: () => void;
  onOpenAttendance: () => void;
}) {
  const setupSteps = [
    {
      step: "1",
      title: "선생님 등록",
      description: "정규 선생님과 보조 선생님을 먼저 등록하고 직위를 정합니다.",
      metric: `${memberCount}명`,
      isDone: memberCount > 0,
      actionLabel: "선생님 등록",
      onAction: onCreateMember,
    },
    {
      step: "2",
      title: "반 만들기",
      description: "반 이름, 과목, 학년, 주 담당 선생님을 연결합니다.",
      metric: `${classCount}개`,
      isDone: classCount > 0,
      actionLabel: "반 만들기",
      onAction: onCreateClass,
    },
    {
      step: "3",
      title: "학생 등록",
      description: "학생과 학부모 연락처를 입력하고 소속 반을 지정합니다.",
      metric: unassignedStudentCount > 0 ? `${unassignedStudentCount}명 미배정` : `${activeStudentCount}명`,
      isDone: activeStudentCount > 0 && unassignedStudentCount === 0,
      actionLabel: "학생 등록",
      onAction: onCreateStudent,
    },
    {
      step: "4",
      title: "수업 시간 등록",
      description: "월수금, 화목 같은 요일 묶음으로 반 전체 수업 시간을 등록합니다.",
      metric: missingScheduleCount > 0 ? "필요" : "완료",
      isDone: activeStudentCount > 0 && missingScheduleCount === 0,
      actionLabel: "수업 시간 등록",
      onAction: onOpenClassSchedules,
    },
    {
      step: "5",
      title: "출석 확인",
      description: "오늘 수업별 출석부에서 도착, 지각, 결석을 확인합니다.",
      metric: attendanceSessionCount > 0 ? `${attendanceSessionCount}개 수업` : "수업 확인",
      isDone: attendanceSessionCount > 0,
      actionLabel: "출석 확인",
      onAction: onOpenAttendance,
    },
  ];
  const completedCount = setupSteps.filter((step) => step.isDone).length;
  const nextStep = setupSteps.find((step) => !step.isDone) ?? setupSteps[setupSteps.length - 1];

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
      <div className="rounded-lg border border-[#C9D6E2] bg-[#F8FBFD] p-4 lg:col-span-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#315C7C]">
              Director Setup
            </p>
            <h3 className="mt-1 text-lg font-semibold text-stone-950">
              {completedCount} / {setupSteps.length} 단계 완료
            </h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              원장님이 처음 운영을 시작할 때는 <span className="font-semibold text-stone-900">선생님 등록 → 반 만들기 → 학생 등록 → 수업 시간 등록 → 출석 확인</span>{" "}
              순서로 진행하면 됩니다. 다음 작업은 <span className="font-semibold text-stone-900">{nextStep.title}</span>입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={nextStep.onAction}
            className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md bg-[#315C7C] px-4 text-sm font-semibold text-white transition hover:bg-[#244B67]"
          >
            {nextStep.actionLabel}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#E6E0D5] bg-white">
        {setupSteps.map((step) => (
          <div
            key={step.step}
            className="grid gap-3 border-b border-[#EFE9DE] px-4 py-4 last:border-b-0 sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"
          >
            <div
              className={[
                "flex size-9 items-center justify-center rounded-md text-sm font-semibold",
                step.isDone ? "bg-[#EAF1F8] text-[#244B67]" : "bg-[#111827] text-white",
              ].join(" ")}
            >
              {step.isDone ? <CheckCircle2 size={17} /> : step.step}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-stone-950">{step.title}</p>
                <span
                  className={[
                    "rounded px-2 py-0.5 text-xs font-semibold",
                    step.isDone
                      ? "bg-[#EAF1F8] text-[#244B67]"
                      : "bg-amber-50 text-amber-800",
                  ].join(" ")}
                >
                  {step.metric}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-stone-500">
                  {step.isDone ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
                  {step.isDone ? "완료" : "확인 필요"}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-stone-600">{step.description}</p>
            </div>
            <button
              type="button"
              onClick={step.onAction}
              className={[
                "min-h-10 rounded-md px-3 text-sm font-semibold transition",
                step.isDone
                  ? "border border-[#D8D0C4] bg-white text-stone-800 hover:bg-[#F7F5F0]"
                  : "border border-[#D8D0C4] bg-white text-stone-800 hover:bg-[#F7F5F0]",
              ].join(" ")}
            >
              {step.actionLabel}
            </button>
          </div>
        ))}
      </div>

      <aside className="rounded-lg border border-[#C9D6E2] bg-[#EAF1F8] p-4">
        <p className="text-sm font-semibold text-[#244B67]">현재 배정 모델</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-stone-950">반 담당</dt>
            <dd className="mt-1 leading-6 text-stone-600">
              한 반은 우선 한 명의 주 담당 선생님을 가집니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-950">학생 소속</dt>
            <dd className="mt-1 leading-6 text-stone-600">
              학생은 하나의 소속 반을 기준으로 문자, 출석, 스케줄 권한이 정해집니다.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-950">보조 선생님</dt>
            <dd className="mt-1 leading-6 text-stone-600">
              파일럿에서는 주 담당 방식으로 검증하고, 다중 배정은 별도 모델로 확장합니다.
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function MobileAdminInbox({
  activeStudents,
  missingSchedules,
  classCount,
  memberCount,
  onShowStudents,
  onShowClasses,
}: {
  activeStudents: number;
  missingSchedules: number;
  classCount: number;
  memberCount: number;
  onShowStudents: () => void;
  onShowClasses: () => void;
}) {
  return (
    <section className="space-y-3 sm:hidden">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#315C7C]">
          오늘 관리 큐
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-stone-950">처리할 항목</h2>
      </div>

      <div className="overflow-hidden rounded-lg border border-[#DED8CE] bg-white">
        <button
          type="button"
          onClick={onShowStudents}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEE7DC] px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-950">
              스케줄 미등록 학생
            </span>
            <span className="mt-0.5 block text-xs text-stone-500">
              학생 상세에서 수업 스케줄을 바로 추가합니다.
            </span>
          </span>
          <span className="text-lg font-semibold tabular-nums text-[#315C7C]">
            {missingSchedules}명
          </span>
        </button>

        <button
          type="button"
          onClick={onShowStudents}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[#EEE7DC] px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-950">
              재원 학생 명단
            </span>
            <span className="mt-0.5 block text-xs text-stone-500">
              검색과 필터로 학생, 학부모, 반 정보를 확인합니다.
            </span>
          </span>
          <span className="text-lg font-semibold tabular-nums text-stone-900">
            {activeStudents}명
          </span>
        </button>

        <button
          type="button"
          onClick={onShowClasses}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-stone-950">
              반 / 구성원 세팅
            </span>
            <span className="mt-0.5 block text-xs text-stone-500">
              반 {classCount}개 · 구성원 {memberCount}명
            </span>
          </span>
          <span className="rounded-full bg-[#F3EFE7] px-2.5 py-1 text-xs font-semibold text-stone-700">
            관리
          </span>
        </button>
      </div>
    </section>
  );
}
