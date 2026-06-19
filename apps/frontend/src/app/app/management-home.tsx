"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  CircleDashed,
  Download,
  FileSpreadsheet,
  FileText,
  MessageSquareText,
  Pencil,
  Plus,
  UserPlus,
} from "lucide-react";
import type {
  BulkScheduleFormState,
  ClassFormState,
  FormStatus,
  ManagementAuditLog,
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
import {
  fetchReportSummary,
  type ReportRange,
  type ReportSummary,
} from "@/lib/client/report-summary";
import {
  downloadReportExport,
  type ReportExportType,
} from "@/lib/client/report-export";
import { fetchAuditLogsFromBackend } from "@/lib/client/audit-logs";
import { saveAcademySettings } from "@/lib/client/management-settings";
import {
  saveClass,
  saveBulkStudents,
  saveBulkStudentSchedules,
  saveStudent,
  saveStudentSchedule,
} from "@/lib/client/management-api";
import { saveMessageTemplate } from "@/lib/client/message-template-save";
import { saveMember } from "@/lib/client/members";
import type { StudentImportValidatedRow } from "@/lib/student-import";

type ManagementSection =
  | "setup"
  | "students"
  | "classes"
  | "members"
  | "templates"
  | "settings"
  | "reports"
  | "history";

type ManagementNavigateView =
  | "home"
  | "operations"
  | "attendance"
  | "students"
  | "reports"
  | "management";

export function ManagementHome({
  academyName,
  classes,
  members,
  students,
  settings,
  templates,
  auditLogs,
  attendanceSessionCount,
  initialSection = "setup",
  onNavigate,
}: {
  academyName: string;
  classes: ManagementClass[];
  members: ManagementMember[];
  students: ManagementStudent[];
  settings: ManagementSettings;
  templates: ManagementMessageTemplate[];
  auditLogs: ManagementAuditLog[];
  attendanceSessionCount: number;
  initialSection?: ManagementSection;
  onNavigate: (view: ManagementNavigateView) => void;
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
  const [backendAuditLogs, setBackendAuditLogs] = useState<ManagementAuditLog[] | null>(
    null,
  );
  const [settingsForm, setSettingsForm] = useState<SettingsFormState>(settings);
  const [settingsFormStatus, setSettingsFormStatus] = useState<FormStatus>({
    status: "idle",
    message: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadAuditLogs() {
      const backendLogs = await fetchAuditLogsFromBackend(controller.signal);

      if (backendLogs) {
        setBackendAuditLogs(backendLogs);
      }
    }

    void loadAuditLogs();

    return () => {
      controller.abort();
    };
  }, []);
  const auditLogItems = backendAuditLogs ?? auditLogs;
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
  const [activeSection, setActiveSection] =
    useState<ManagementSection>(initialSection);

  const activeStudents = useMemo(
    () => students.filter((student) => student.status === "active"),
    [students],
  );
  const missingScheduleCount = activeStudents.filter(
    (student) => student.schedules.filter((schedule) => schedule.isActive).length === 0,
  ).length;
  const unassignedStudentCount = activeStudents.filter((student) => !student.classId).length;
  const teacherOptions = members.filter((member) =>
    member.status === "active" &&
    ["owner", "manager", "teacher", "assistant"].includes(member.role),
  );

  function closeManagementWorkflows() {
    setClassForm(null);
    setClassFormStatus({ status: "idle", message: "" });
    setStudentForm(null);
    setStudentFormStatus({ status: "idle", message: "" });
    setIsBulkStudentImportOpen(false);
    setBulkStudentImportStatus({ status: "idle", message: "" });
    setMemberForm(null);
    setMemberFormStatus({ status: "idle", message: "" });
    setScheduleForm(null);
    setScheduleFormStatus({ status: "idle", message: "" });
    setBulkScheduleForm(null);
    setBulkScheduleFormStatus({ status: "idle", message: "" });
    setTemplateForm(null);
    setTemplateFormStatus({ status: "idle", message: "" });
  }

  function returnToManagementSetup() {
    closeManagementWorkflows();
    setActiveSection("setup");
  }

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
      await saveClass({
        classId: classForm.classId,
        name: classForm.name,
        subject: classForm.subject,
        gradeLabel: classForm.gradeLabel,
        teacherId: classForm.teacherId,
      }, classForm.mode);
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
      const payload = await saveBulkStudentSchedules({
        classId: bulkScheduleForm.classId,
        teacherId: bulkScheduleForm.teacherId,
        scheduleType: bulkScheduleForm.scheduleType,
        dayOfWeeks: bulkScheduleForm.dayOfWeeks,
        startTime: bulkScheduleForm.startTime,
        endTime: bulkScheduleForm.endTime,
        subject: bulkScheduleForm.subject,
        title: bulkScheduleForm.title,
        memo: bulkScheduleForm.memo,
      });

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
      scheduleShareConsentConfirmed: false,
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
      scheduleShareConsentConfirmed: student.scheduleShareConsentConfirmed,
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
      await saveStudent({
        studentId: studentForm.studentId,
        classId: studentForm.classId,
        name: studentForm.name,
        schoolName: studentForm.schoolName,
        gradeLabel: studentForm.gradeLabel,
        parentName: studentForm.parentName,
        parentPhone: studentForm.parentPhone,
        studentPhone: studentForm.studentPhone,
        scheduleShareConsentConfirmed: studentForm.scheduleShareConsentConfirmed,
        status: studentForm.status,
      }, studentForm.mode);
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
      const payload = await saveBulkStudents({
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
      });

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
      await saveStudentSchedule({
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
      }, scheduleForm.mode);
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

    const confirmed = window.confirm(
      "이 학생 스케줄을 삭제하시겠습니까?\n삭제하면 해당 일정은 출석부와 보강 후보에서 제외됩니다.",
    );

    if (!confirmed) {
      return;
    }

    setScheduleFormStatus({ status: "saving", message: "" });

    try {
      await saveStudentSchedule({
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
      }, "edit");
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
      await saveMember({
        memberId: memberForm.memberId,
        name: memberForm.name,
        email: memberForm.email,
        phone: memberForm.phone,
        role: memberForm.role,
        status: memberForm.status,
        password: memberForm.password,
      }, memberForm.mode);
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
      await saveAcademySettings(settingsForm);
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
      await saveMessageTemplate({
        reason: templateForm.reason,
        title: templateForm.title,
        body: templateForm.body,
        isActive: templateForm.isActive,
      });
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
    group: string;
    detail: string;
    count: string;
    status: string;
  }> = [
    {
      id: "setup",
      label: "시작",
      group: "운영 세팅",
      detail: "선생님 등록부터 출석 확인까지 초기 순서",
      count: "순서",
      status: attendanceSessionCount > 0 ? "출석 준비됨" : "출석 확인 필요",
    },
    {
      id: "students",
      label: "명단",
      group: "명단/배정",
      detail: "학생, CSV, 스케줄, 공유 동의",
      count: `${activeStudents.length}명`,
      status:
        missingScheduleCount > 0
          ? `스케줄 미등록 ${missingScheduleCount}명`
          : unassignedStudentCount > 0
            ? `미배정 ${unassignedStudentCount}명`
            : "학생 세팅 완료",
    },
    {
      id: "classes",
      label: "수업",
      group: "반/시간표",
      detail: "반, 담당 선생님, 반 공통 수업 시간",
      count: `${classes.length}개`,
      status: classes.length > 0 ? "반 관리 가능" : "반 생성 필요",
    },
    {
      id: "members",
      label: "직원",
      group: "구성원",
      detail: "직위, 권한, 담당 반",
      count: `${members.length}명`,
      status: members.length > 0 ? "계정 관리 가능" : "직원 등록 필요",
    },
    {
      id: "templates",
      label: "문자",
      group: "커뮤니케이션",
      detail: "결석, 지각, 보강 안내 템플릿",
      count: `${templates.length}개`,
      status: "템플릿 관리",
    },
    {
      id: "settings",
      label: "정책",
      group: "운영 정책",
      detail: "발신 정보, 테스트 모드, 보조 선생님 발송 권한",
      count: settings.smsDryRun ? "테스트 모드" : "실발송",
      status: settings.allowAssistantSend ? "보조 발송 허용" : "보조 발송 제한",
    },
    {
      id: "reports",
      label: "리포트",
      group: "운영 증거",
      detail: "출석, 문자, 명단, 이력 CSV 보관",
      count: "CSV",
      status: "운영 기록 확인",
    },
    {
      id: "history",
      label: "이력",
      group: "운영 로그",
      detail: "학생, 반, 스케줄, 설정 최근 변경",
      count: `${auditLogItems.length}건`,
      status: auditLogItems.length > 0 ? "최근 변경 확인" : "기록 대기",
    },
  ];
  const isStudentLedgerMode = activeSection === "students";
  const activeManagementSection =
    managementSections.find((section) => section.id === activeSection) ?? managementSections[0];

  return (
    <div className="text-[var(--clinic-text)]">
      <div
        className={[
          "grid gap-4 xl:items-start",
          isStudentLedgerMode
            ? "xl:grid-cols-[minmax(0,1fr)]"
            : "xl:grid-cols-[17rem_minmax(0,1fr)] 2xl:grid-cols-[18rem_minmax(0,1fr)_20rem]",
        ].join(" ")}
      >
      {!isStudentLedgerMode ? (
        <ManagementCommandCenter
          academyName={academyName}
          activeStudents={activeStudents.length}
          missingScheduleCount={missingScheduleCount}
          classCount={classes.length}
          memberCount={members.length}
          activeSection={activeSection}
          sections={managementSections}
          onSelectSection={setActiveSection}
        />
      ) : null}

      <main className={["min-w-0 space-y-4 sm:space-y-5", isStudentLedgerMode ? "max-w-none" : ""].join(" ")}>
      {activeSection !== "setup" ? (
        <ManagementSectionReturnBar
          sectionLabel={activeManagementSection.label}
          sectionGroup={activeManagementSection.group}
          sectionStatus={activeManagementSection.status}
          onBack={returnToManagementSetup}
        />
      ) : null}

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
            unassignedStudentCount={unassignedStudentCount}
            attendanceSessionCount={attendanceSessionCount}
            missingScheduleCount={missingScheduleCount}
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
                "mb-3 rounded-sm border px-3 py-2 text-sm",
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
          <label className="grid gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
            학원명
            <input
              value={settingsForm.academyName}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, academyName: event.target.value })
              }
              className="min-h-11 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
            발신명
            <input
              value={settingsForm.senderName}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, senderName: event.target.value })
              }
              placeholder="문자에 표시할 학원명"
              className="min-h-11 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
            발신번호
            <input
              value={settingsForm.senderPhone}
              onChange={(event) =>
                setSettingsForm({ ...settingsForm, senderPhone: event.target.value })
              }
              placeholder="0410000000"
              className="min-h-11 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
          </label>

          <label className="grid gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
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
              className="min-h-11 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
            />
          </label>

          <label className="flex min-h-11 items-center gap-3 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm font-medium text-[var(--clinic-text)]">
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

          <label className="flex min-h-11 items-center gap-3 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm font-medium text-[var(--clinic-text)]">
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
              "mt-3 rounded-sm border px-3 py-2 text-sm",
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

      {activeSection === "reports" ? (
        <ManagementPanel
          title="운영 리포트"
          description="출석, 문자, 학생 명단, 최근 변경 이력을 요약하고 CSV로 내려받습니다."
        >
          <OperationalReportPanel auditLogs={auditLogItems} />
        </ManagementPanel>
      ) : null}

      {activeSection === "history" ? (
        <ManagementPanel
          title="최근 변경 이력"
          description="학생, 반, 스케줄, 문자 템플릿, 학원 설정처럼 운영 데이터가 바뀐 기록을 확인합니다."
        >
          <AuditLogList auditLogs={auditLogItems} />
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
                "mb-3 rounded-sm border px-3 py-2 text-sm",
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
                "mb-3 rounded-sm border px-3 py-2 text-sm",
                bulkScheduleFormStatus.status === "saved"
                  ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {bulkScheduleFormStatus.message}
            </p>
          ) : null}

          <div className="mb-3 rounded-sm border border-[#C9D6E2] bg-[#F8FBFD] px-3 py-3 text-sm text-[#244B67]">
            반을 만든 뒤 <span className="font-semibold">수업 시간 등록</span>을 누르면
            그 반의 재원 학생 전체에게 같은 주간 스케줄이 추가됩니다.
          </div>

          <div className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
            <div className="hidden grid-cols-[minmax(140px,1fr)_72px_64px_minmax(96px,0.8fr)_220px] border-b border-[#B8C9D0] bg-[#E7EEF1] px-3 py-2.5 text-xs font-semibold text-[var(--clinic-muted)] md:grid">
              <span>반</span>
              <span>과목</span>
              <span>학년</span>
              <span>담당</span>
              <span className="text-right">작업</span>
            </div>
            {classes.map((classItem) => (
              <div
                key={classItem.id}
                className="grid min-w-0 gap-3 border-b border-[#D6E0E5] px-3 py-3.5 last:border-b-0 md:grid-cols-[minmax(140px,1fr)_72px_64px_minmax(96px,0.8fr)_220px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--clinic-text)]">{classItem.name}</p>
                  <p className="mt-1 text-xs text-[var(--clinic-muted)] md:hidden">
                    {[classItem.subject, displayGradeLabel(classItem.gradeLabel), classItem.teacherName ?? "담당 미지정"].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <p className="hidden text-sm text-[#405763] md:block">{classItem.subject ?? "-"}</p>
                <p className="hidden text-sm text-[#405763] md:block">{displayGradeLabel(classItem.gradeLabel) ?? "-"}</p>
                <p className="hidden truncate text-sm text-[#405763] md:block">{classItem.teacherName ?? "미지정"}</p>
                <div className="flex min-w-0 flex-wrap items-center gap-2 md:justify-end">
                  <span className="w-fit shrink-0 rounded-md bg-[#EDF3F5] px-2.5 py-1 text-xs font-semibold text-[#405763]">
                    학생 {classItem.studentCount}명
                  </span>
                  <button
                    type="button"
                    onClick={() => openBulkScheduleForm(classItem)}
                    className="flex min-h-8 shrink-0 items-center gap-1 rounded-sm bg-[var(--clinic-primary)] px-2.5 text-xs font-semibold text-white transition hover:bg-[var(--clinic-primary-dark)]"
                  >
                    <ClipboardList size={13} />
                    수업 시간 등록
                  </button>
                  <button
                    type="button"
                    onClick={() => openEditClassForm(classItem)}
                    className="flex min-h-8 min-w-[58px] shrink-0 items-center justify-center gap-1 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-2.5 text-xs font-semibold text-[#405763] transition hover:bg-[#EDF3F5]"
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
                "mb-3 rounded-sm border px-3 py-2 text-sm",
                memberFormStatus.status === "saved"
                  ? "border-[#C9D6E2] bg-[#EAF1F8] text-[#244B67]"
                  : "border-red-200 bg-red-50 text-red-900",
              ].join(" ")}
            >
              {memberFormStatus.message}
            </p>
          ) : null}

          <div className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
            <div className="hidden grid-cols-[minmax(120px,1fr)_minmax(160px,1.05fr)_72px_96px_68px_76px] border-b border-[#B8C9D0] bg-[#E7EEF1] px-3 py-2.5 text-xs font-semibold text-[var(--clinic-muted)] md:grid">
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
                className="grid min-w-0 gap-2 border-b border-[#D6E0E5] px-3 py-3.5 last:border-b-0 md:grid-cols-[minmax(120px,1fr)_minmax(160px,1.05fr)_72px_96px_68px_76px] md:items-center"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--clinic-text)]">{member.name}</p>
                  <p className="mt-1 truncate text-xs text-[var(--clinic-muted)] md:hidden">{member.email}</p>
                </div>
                <p className="hidden truncate text-sm text-[#405763] md:block">{member.email}</p>
                <p className="text-sm text-[#405763]">{roleLabel(member.role)}</p>
                <p className="text-sm text-[#405763]">{member.maskedPhone ?? "미등록"}</p>
                <p className="text-sm text-[#405763]">담당 {member.classCount}개</p>
                <button
                  type="button"
                  onClick={() => openEditMemberForm(member)}
                  className="flex min-h-8 min-w-[64px] shrink-0 items-center justify-center gap-1 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-2.5 text-xs font-semibold text-[#405763] transition hover:bg-[#EDF3F5] md:ml-auto"
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
        <div className="mb-3 grid gap-2 border border-[#B8C9D0] border-l-4 border-l-[var(--clinic-primary)] bg-[#E7EEF1] p-2.5 sm:mb-4 sm:p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={returnToManagementSetup}
                className="inline-flex min-h-8 shrink-0 items-center gap-1 border border-[#8FA6B0] bg-[#F7FAFA] px-2.5 text-xs font-bold text-[#315C7C] transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
              >
                <ArrowLeft size={13} aria-hidden="true" />
                관리 메인
              </button>
              <p className="text-sm font-semibold text-[var(--clinic-text)]">학생 등록 후 반 배정과 스케줄까지 확인합니다.</p>
            </div>
            <p className="mt-1 hidden text-xs leading-5 text-[var(--clinic-muted)] sm:block">
              반이 없는 학생은 권한과 출석 흐름이 애매해지고, 스케줄이 없는 학생은 출석부에 나타나지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={openMissingScheduleStudents}
              className="flex min-h-9 w-auto shrink-0 items-center justify-center gap-2 rounded-sm border border-[#8FA6B0] bg-[#F7FAFA] px-3 text-xs font-bold text-[#315C7C] transition hover:bg-[#EDF3F5] sm:min-h-10"
            >
              <CalendarDays size={14} />
              스케줄 미등록 보기
            </button>
            <button
              type="button"
              onClick={openBulkStudentImport}
              className="flex min-h-9 w-auto shrink-0 items-center justify-center gap-2 rounded-sm border border-[var(--clinic-primary)] bg-[var(--clinic-primary)] px-3 text-xs font-bold text-white transition hover:bg-[var(--clinic-primary-dark)] sm:min-h-10"
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
              "mb-3 rounded-sm border px-3 py-2 text-sm",
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
              "mb-3 rounded-sm border px-3 py-2 text-sm",
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
              "mb-3 rounded-sm border px-3 py-2 text-sm",
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

      </main>

      {!isStudentLedgerMode ? (
        <ManagementStatusSidebar
          activeStudents={activeStudents.length}
          missingScheduleCount={missingScheduleCount}
          unassignedStudentCount={unassignedStudentCount}
          classCount={classes.length}
          memberCount={members.length}
          templateCount={templates.length}
          smsDryRun={settings.smsDryRun}
          allowAssistantSend={settings.allowAssistantSend}
          auditLogs={auditLogItems}
          activeSection={activeSection}
          onSelectSection={setActiveSection}
        />
      ) : null}
      </div>
    </div>
  );
}

function OperationalReportPanel({ auditLogs }: { auditLogs: ManagementAuditLog[] }) {
  const [range, setRange] = useState<ReportRange>("today");
  const [includePrivate, setIncludePrivate] = useState(false);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [status, setStatus] = useState<FormStatus>({ status: "idle", message: "" });
  const [downloadType, setDownloadType] = useState<ReportExportType | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSummary() {
      setStatus({ status: "saving", message: "" });

      try {
        setSummary(await fetchReportSummary(range, controller.signal));
        setStatus({ status: "idle", message: "" });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setSummary(null);
        setStatus({
          status: "error",
          message:
            error instanceof Error ? error.message : "운영 리포트를 불러오지 못했습니다.",
        });
      }
    }

    void loadSummary();

    return () => {
      controller.abort();
    };
  }, [range]);

  async function downloadReport(type: ReportExportType) {
    if (includePrivate) {
      const confirmed = window.confirm(
        "전화번호 원문이 포함된 CSV를 다운로드하시겠습니까?\n파일 보관과 전달 시 개인정보 관리에 주의해 주세요.",
      );

      if (!confirmed) {
        return;
      }
    }

    setDownloadType(type);
    setStatus({ status: "saving", message: "" });

    try {
      await downloadReportExport({
        type,
        range,
        includePrivate,
      });
      setStatus({ status: "saved", message: "CSV 다운로드를 시작했습니다." });
    } catch (error) {
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : "CSV를 내려받지 못했습니다.",
      });
    } finally {
      setDownloadType(null);
    }
  }

  const reportCards = summary
    ? [
        {
          title: "출석 처리",
          value: `${summary.attendance.total}건`,
          detail: `출석 ${summary.attendance.present} · 지각 ${summary.attendance.late} · 결석 ${summary.attendance.absent} · 체크 필요 ${summary.attendance.pending}`,
        },
        {
          title: "문자 기록",
          value: `${summary.messages.logs}건`,
          detail: `테스트 발송 ${summary.messages.dryRun} · 실발송 ${summary.messages.sent} · 실패 ${summary.messages.failed} · LMS ${summary.messages.lms}`,
        },
        {
          title: "학생 운영",
          value: `${summary.students.active}명`,
          detail: `반 ${summary.students.classes}개 · 스케줄 미등록 ${summary.students.missingSchedule}명`,
        },
        {
          title: "최근 변경",
          value: `${summary.audit.count}건`,
          detail: `최근 목록 ${auditLogs.length}건 표시 중`,
        },
      ]
    : [];

  return (
    <div className="border border-[#B8C9D0] bg-[#F4F8F9]">
      <div className="border-b border-[#B8C9D0] bg-[#E7EEF1] px-3 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black text-[var(--clinic-text)]">조회 기간</p>
            <p className="mt-1 text-xs leading-5 text-[var(--clinic-muted)]">
              파일럿 기간 동안 남은 출석, 문자, 변경 기록을 요약합니다.
            </p>
          </div>
          <div className="grid grid-cols-3 border border-[#B8C9D0] bg-[#F4F8F9]">
            {[
              ["today", "오늘"],
              ["7d", "7일"],
              ["month", "이번 달"],
            ].map(([rangeValue, label]) => (
              <button
                key={rangeValue}
                type="button"
                aria-pressed={range === rangeValue}
                onClick={() => setRange(rangeValue as ReportRange)}
                className={[
                  "min-h-9 border-r border-[#B8C9D0] px-3 text-xs font-black transition last:border-r-0",
                  range === rangeValue
                    ? "bg-[var(--clinic-primary)] text-white"
                    : "text-[var(--clinic-muted)] hover:bg-[#E1F0EF]",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {status.status === "error" ? (
        <p className="m-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      {summary ? (
        <div className="divide-y divide-[#C9D7DC] border-b border-[#B8C9D0]">
          {reportCards.map((card) => (
            <div
              key={card.title}
              className="grid grid-cols-[minmax(0,1fr)_120px] items-center gap-3 bg-[#F7FAFA] px-3 py-3"
            >
              <span className="min-w-0">
                <span className="block text-sm font-black text-[var(--clinic-text)]">
                  {card.title}
                </span>
                <span className="mt-1 block truncate text-xs font-medium text-[var(--clinic-muted)]">
                  {card.detail}
                </span>
              </span>
              <span className="text-right text-xl font-black tabular-nums text-[#0B4150]">
                {card.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-b border-[#B8C9D0] bg-[#F7FAFA] px-3 py-4 text-sm leading-6 text-[var(--clinic-muted)]">
          {status.status === "saving"
            ? "운영 리포트를 불러오는 중입니다."
            : "조회할 리포트가 없습니다. 출석 체크나 문자 기록이 쌓이면 이곳에 요약이 표시됩니다."}
        </div>
      )}

      <div className="bg-[#F4F8F9]">
        <div className="flex items-start justify-between gap-3 border-b border-[#B8C9D0] px-3 py-3">
          <div>
            <p className="text-sm font-black text-[var(--clinic-text)]">CSV 내보내기</p>
            <p className="mt-1 text-xs leading-5 text-[var(--clinic-muted)]">
              기본은 전화번호 마스킹입니다. 원장 보관용이 필요할 때만 원문 포함을 켭니다.
            </p>
          </div>
          <label
            className={`flex shrink-0 items-center gap-2 border px-2.5 py-2 text-xs font-bold ${
              includePrivate
                ? "border-amber-300 bg-amber-50 text-amber-800"
                : "border-[#B8C9D0] bg-[#F7FAFA] text-[var(--clinic-text)]"
            }`}
          >
            <input
              type="checkbox"
              checked={includePrivate}
              onChange={(event) => setIncludePrivate(event.target.checked)}
              className="size-4 accent-[#315C7C]"
            />
            원문 포함
          </label>
        </div>

        <div className="divide-y divide-[#C9D7DC]">
          {[
            ["students", "학생 목록", "반, 연락처, 공유 동의"],
            ["attendance", "출석 기록", "날짜, 수업, 상태"],
            ["messages", "문자 기록", "초안, 발송 로그, 본문"],
            ["audit", "변경 이력", "누가 무엇을 바꿨는지"],
          ].map(([type, title, detail]) => (
            <button
              key={type}
              type="button"
              disabled={downloadType === type}
              onClick={() => void downloadReport(type as ReportExportType)}
              className={`flex min-h-14 w-full items-center justify-between gap-3 px-3 text-left transition disabled:cursor-wait disabled:opacity-70 ${
                includePrivate
                  ? "bg-amber-50 hover:bg-amber-100/70"
                  : "bg-[#F7FAFA] hover:bg-[#E1F0EF]"
              }`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center border border-[#B8D7D8] bg-[#E1F0EF] text-[#007A7C]">
                  <FileText size={17} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--clinic-text)]">
                    {title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--clinic-muted)]">
                    {detail}
                  </span>
                </span>
              </span>
              <Download size={16} className="shrink-0 text-[var(--clinic-muted)]" />
            </button>
          ))}
        </div>

        {status.status === "saved" ? (
          <p className="m-3 border border-[#B8D7D8] bg-[#E1F0EF] px-3 py-2 text-sm text-[#244B67]">
            {status.message}
          </p>
        ) : null}
      </div>
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
    <div className="mb-4 rounded-sm border border-[#C9D6E2] bg-[#F8FBFD] p-3 sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#315C7C]">
            {form.reasonLabel}
          </p>
          <h4 className="mt-1 text-base font-semibold text-[var(--clinic-text)]">
            문자 템플릿 수정
          </h4>
        </div>
        <label className="flex w-fit items-center gap-2 rounded-sm border border-[#8FA6B0] bg-[#F7FAFA] px-3 py-2 text-xs font-semibold text-[#405763]">
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
        <label className="grid gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          템플릿 제목
          <input
            value={form.title}
            onChange={(event) => onChange({ ...form, title: event.target.value })}
            placeholder={`${form.reasonLabel} 안내`}
            className="min-h-11 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 text-sm outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
          />
        </label>

        <label className="grid gap-1.5 text-sm font-medium text-[var(--clinic-text)]">
          문자 본문
          <textarea
            value={form.body}
            onChange={(event) => onChange({ ...form, body: event.target.value })}
            rows={7}
            className="min-h-40 rounded-sm border border-stone-300 bg-[#F7FAFA] px-3 py-2 text-sm leading-6 outline-none focus:border-[#315C7C] focus:ring-2 focus:ring-[#EAF1F8]"
          />
          <span
            className={[
              "text-xs font-medium",
              bodyMetrics.isOverLimit
                ? "text-red-700"
                : bodyMetrics.transportType === "lms"
                  ? "text-amber-700"
                  : "text-[var(--clinic-muted)]",
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

      <div className="mt-3 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-3 py-2 text-xs leading-5 text-[var(--clinic-muted)]">
        사용할 수 있는 변수:
        <span className="ml-1 font-semibold text-[var(--clinic-text)]">
          {"{{academyName}}"}, {"{{studentName}}"}, {"{{teacherName}}"},{" "}
          {"{{className}}"}, {"{{makeupCandidateTime}}"}
        </span>
      </div>

      {status.status === "error" ? (
        <p className="mt-3 rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {status.message}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-10 rounded-sm border border-[#8FA6B0] bg-[#F7FAFA] px-4 text-sm font-semibold text-[#405763] transition hover:bg-[#EDF3F5]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={isSaving || bodyMetrics.isOverLimit}
          onClick={onSave}
          className="min-h-10 rounded-sm bg-[var(--clinic-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--clinic-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
      <div className="hidden grid-cols-[140px_minmax(160px,0.7fr)_minmax(280px,1.5fr)_90px] border-b border-[#B8C9D0] bg-[#E7EEF1] px-3 py-2.5 text-xs font-semibold text-[var(--clinic-muted)] md:grid">
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
              "grid min-w-0 gap-2 border-b border-[#D6E0E5] px-3 py-3.5 last:border-b-0 md:grid-cols-[140px_minmax(160px,0.7fr)_minmax(280px,1.5fr)_90px] md:items-center",
              isActive ? "bg-[#F8FBFD]" : "",
            ].join(" ")}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--clinic-text)]">
                {template.reasonLabel}
              </p>
              <p className="mt-1 text-xs text-[var(--clinic-muted)] md:hidden">
                {template.title}
              </p>
            </div>
            <p className="hidden truncate text-sm font-medium text-[var(--clinic-text)] md:block">
              {template.title}
            </p>
            <p className="line-clamp-2 min-w-0 text-sm leading-6 text-[var(--clinic-muted)]">
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
                className="flex min-h-8 w-fit shrink-0 items-center gap-1 rounded-sm border border-[#B8C9D0] bg-[#F7FAFA] px-2.5 text-xs font-semibold text-[#405763] transition hover:bg-[#EDF3F5] md:ml-auto"
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

function ManagementSectionReturnBar({
  sectionLabel,
  sectionGroup,
  sectionStatus,
  onBack,
}: {
  sectionLabel: string;
  sectionGroup: string;
  sectionStatus: string;
  onBack: () => void;
}) {
  return (
    <section className="flex flex-col gap-2 border border-[#B8C9D0] border-l-4 border-l-[var(--clinic-primary)] bg-[#F4F8F9] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#315C7C]">
          Management Work Area
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="text-base font-black text-[var(--clinic-text)]">
            {sectionLabel}
          </h2>
          <span className="border border-[#C9D7DC] bg-[#E7EEF1] px-2 py-0.5 text-[11px] font-bold text-[#405763]">
            {sectionGroup}
          </span>
          <span className="text-xs font-semibold text-[var(--clinic-muted)]">
            {sectionStatus}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-sm border border-[#8FA6B0] bg-[#F7FAFA] px-3 text-sm font-bold text-[#315C7C] transition hover:border-[var(--clinic-primary)] hover:bg-[#E1F0EF] focus:outline-none focus:ring-2 focus:ring-[#84C7CB] sm:w-auto"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        관리 메인으로
      </button>
    </section>
  );
}

function ManagementStatusSidebar({
  activeStudents,
  missingScheduleCount,
  unassignedStudentCount,
  classCount,
  memberCount,
  templateCount,
  smsDryRun,
  allowAssistantSend,
  auditLogs,
  activeSection,
  onSelectSection,
}: {
  activeStudents: number;
  missingScheduleCount: number;
  unassignedStudentCount: number;
  classCount: number;
  memberCount: number;
  templateCount: number;
  smsDryRun: boolean;
  allowAssistantSend: boolean;
  auditLogs: ManagementAuditLog[];
  activeSection: ManagementSection;
  onSelectSection: (section: ManagementSection) => void;
}) {
  const recentLogs = auditLogs.slice(0, 4);

  return (
    <aside className="xl:col-start-2 2xl:sticky 2xl:top-4 2xl:col-start-auto">
      <section className="overflow-hidden border border-[#B8C9D0] bg-[#F4F8F9]">
        <div className="border-b border-[#C9D7DC] bg-[#E7EEF1] px-4 py-3">
          <h3 className="text-sm font-bold text-[var(--clinic-text)]">운영 상태 패널</h3>
          <p className="mt-0.5 text-xs leading-5 text-[var(--clinic-muted)]">
            설정, 누락 항목, 변경 이력을 row 단위로 확인합니다.
          </p>
        </div>

        <div className="divide-y divide-[#C9D7DC]">
          <div className="bg-[#EDF3F5] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--clinic-muted)]">
            기준 데이터
          </div>
          <ManagementStatusRow
            label="재원 학생"
            value={`${activeStudents}명`}
            detail={unassignedStudentCount > 0 ? `미배정 ${unassignedStudentCount}명` : "반 배정 확인"}
            tone={unassignedStudentCount > 0 ? "warning" : "default"}
            isActive={activeSection === "students"}
            onClick={() => onSelectSection("students")}
          />
          <ManagementStatusRow
            label="스케줄 미등록"
            value={`${missingScheduleCount}명`}
            detail={missingScheduleCount > 0 ? "출석부 누락 가능" : "출석 준비 완료"}
            tone={missingScheduleCount > 0 ? "danger" : "success"}
            isActive={activeSection === "students"}
            onClick={() => onSelectSection("students")}
          />
          <ManagementStatusRow
            label="반 / 직원"
            value={`${classCount}개 · ${memberCount}명`}
            detail="수업과 권한 기준"
            isActive={activeSection === "classes" || activeSection === "members"}
            onClick={() => onSelectSection("classes")}
          />
          <ManagementStatusRow
            label="문자 템플릿"
            value={`${templateCount}개`}
            detail="결석·지각·보강 문구"
            isActive={activeSection === "templates"}
            onClick={() => onSelectSection("templates")}
          />
          <div className="bg-[#EDF3F5] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--clinic-muted)]">
            발송 정책
          </div>
          <PolicyPill
            label={smsDryRun ? "테스트 발송 모드" : "실제 발송 가능"}
            detail={smsDryRun ? "학부모에게 실제 문자가 나가지 않습니다." : "실제 발송 전 대상 확인이 필요합니다."}
            tone={smsDryRun ? "safe" : "warning"}
          />
          <PolicyPill
            label={allowAssistantSend ? "보조 선생님 발송 허용" : "보조 선생님 발송 제한"}
            detail={allowAssistantSend ? "보조 계정도 테스트 발송 가능" : "보조 계정은 기록 저장만 가능"}
            tone={allowAssistantSend ? "warning" : "safe"}
          />
          <div className="flex items-center justify-between gap-2 bg-[#EDF3F5] px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--clinic-muted)]">
              최근 변경
            </span>
            <button
              type="button"
              onClick={() => onSelectSection("history")}
              className="rounded-sm px-2 py-1 text-xs font-semibold text-[#315C7C] transition hover:bg-[#E1F0EF] focus:outline-none focus:ring-2 focus:ring-[#84C7CB]"
            >
              이력 보기
            </button>
          </div>
          {recentLogs.length > 0 ? (
            recentLogs.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => onSelectSection("history")}
                className="block w-full bg-[#F7FAFA] px-4 py-3 text-left transition hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]"
              >
                <p className="truncate text-xs font-semibold text-[var(--clinic-text)]">
                  {log.summary}
                </p>
                <p className="mt-1 text-[11px] text-[var(--clinic-muted)]">
                  {log.actorName} · {formatAuditDate(log.createdAt)}
                </p>
              </button>
            ))
          ) : (
            <p className="px-4 py-5 text-sm leading-6 text-[var(--clinic-muted)]">
              아직 기록된 변경 이력이 없습니다.
            </p>
          )}
        </div>
      </section>
    </aside>
  );
}

function ManagementStatusRow({
  label,
  value,
  detail,
  tone = "default",
  isActive,
  onClick,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning" | "danger";
  isActive: boolean;
  onClick: () => void;
}) {
  const toneClass = {
    default: "text-[#315C7C]",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
  }[tone];

  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#84C7CB]",
        isActive ? "bg-[#E1F0EF]" : "bg-[#F7FAFA] hover:bg-[#EDF3F5]",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block text-xs font-semibold text-[var(--clinic-muted)]">{label}</span>
        <span className="mt-1 block truncate text-xs text-[var(--clinic-muted)]">{detail}</span>
      </span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </button>
  );
}

function PolicyPill({
  label,
  detail,
  tone,
}: {
  label: string;
  detail: string;
  tone: "safe" | "warning";
}) {
  return (
    <div
      className={[
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-[#F7FAFA] px-4 py-3",
        tone === "safe"
          ? "text-emerald-900"
          : "text-amber-900",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{label}</span>
        <span className="mt-1 block truncate text-[11px] leading-4 opacity-80">{detail}</span>
      </span>
      <span
        className={[
          "h-2 w-2",
          tone === "safe" ? "bg-emerald-500" : "bg-amber-500",
        ].join(" ")}
        aria-hidden="true"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-cyan-50/62">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
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
    <div className="grid gap-3">
      <div className="border border-[#B8C9D0] border-l-4 border-l-[#315C7C] bg-[#F8FBFD] px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#315C7C]">
              Director Setup
            </p>
            <h3 className="mt-1 text-lg font-semibold text-[var(--clinic-text)]">
              {completedCount} / {setupSteps.length} 단계 완료
            </h3>
            <p className="mt-1 text-sm leading-6 text-[var(--clinic-muted)]">
              원장님이 처음 운영을 시작할 때는 <span className="font-semibold text-[var(--clinic-text)]">선생님 등록 → 반 만들기 → 학생 등록 → 수업 시간 등록 → 출석 확인</span>{" "}
              순서로 진행하면 됩니다. 다음 작업은 <span className="font-semibold text-[var(--clinic-text)]">{nextStep.title}</span>입니다.
            </p>
          </div>
          <button
            type="button"
            onClick={nextStep.onAction}
            className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-sm bg-[var(--clinic-primary)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--clinic-primary-dark)]"
          >
            {nextStep.actionLabel}
            <ArrowRight size={15} />
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
        {setupSteps.map((step) => (
          <button
            key={step.step}
            type="button"
            onClick={step.onAction}
            className="grid w-full gap-3 border-b border-[#D6E0E5] border-l-4 border-l-transparent px-4 py-3 text-left transition last:border-b-0 hover:border-l-[#C9D6E2] hover:bg-[#EDF3F5] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#C9D6E2] sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"
          >
            <div
              className={[
                "flex size-8 items-center justify-center border text-sm font-semibold",
                step.isDone
                  ? "border-[#B8D7D8] bg-[#E1F0EF] text-[#007A7C]"
                  : "border-[#0B3F46] bg-[#0B3F46] text-white",
              ].join(" ")}
            >
              {step.isDone ? <CheckCircle2 size={17} /> : step.step}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[var(--clinic-text)]">{step.title}</p>
                <span
                  className={[
                    "border px-2 py-0.5 text-xs font-semibold",
                    step.isDone
                      ? "border-[#B8D7D8] bg-[#E1F0EF] text-[#007A7C]"
                      : "border-amber-200 bg-amber-50 text-amber-800",
                  ].join(" ")}
                >
                  {step.metric}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-[var(--clinic-muted)]">
                  {step.isDone ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
                  {step.isDone ? "완료" : "확인 필요"}
                </span>
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--clinic-muted)]">{step.description}</p>
            </div>
            <span
              className={[
                "inline-flex min-h-10 items-center justify-center rounded-md px-3 text-sm font-semibold transition",
                step.isDone
                  ? "border border-[#8FA6B0] bg-[#F7FAFA] text-[var(--clinic-text)] hover:bg-[#EDF3F5]"
                  : "border border-[#8FA6B0] bg-[#F7FAFA] text-[var(--clinic-text)] hover:bg-[#EDF3F5]",
              ].join(" ")}
            >
              {step.actionLabel}
            </span>
          </button>
        ))}
      </div>

      <aside className="overflow-hidden rounded-sm border border-[#C9D6E2] bg-[#F7FAFA]">
        <div className="border-b border-[#C9D6E2] bg-[#F8FBFD] px-4 py-3">
          <p className="text-sm font-semibold text-[#244B67]">현재 배정 모델</p>
        </div>
        <dl className="divide-y divide-[#EAF1F8] text-sm">
          <div className="px-4 py-3">
            <dt className="font-semibold text-[var(--clinic-text)]">반 담당</dt>
            <dd className="mt-1 leading-6 text-[var(--clinic-muted)]">
              한 반은 우선 한 명의 주 담당 선생님을 가집니다.
            </dd>
          </div>
          <div className="px-4 py-3">
            <dt className="font-semibold text-[var(--clinic-text)]">학생 소속</dt>
            <dd className="mt-1 leading-6 text-[var(--clinic-muted)]">
              학생은 하나의 소속 반을 기준으로 문자, 출석, 스케줄 권한이 정해집니다.
            </dd>
          </div>
          <div className="px-4 py-3">
            <dt className="font-semibold text-[var(--clinic-text)]">보조 선생님</dt>
            <dd className="mt-1 leading-6 text-[var(--clinic-muted)]">
              파일럿에서는 주 담당 방식으로 검증하고, 다중 배정은 별도 모델로 확장합니다.
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}

function AuditLogList({ auditLogs }: { auditLogs: ManagementAuditLog[] }) {
  if (auditLogs.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-[#DED8CE] bg-[#F7FAFA] px-4 py-8 text-center">
        <p className="text-sm font-semibold text-[var(--clinic-text)]">
          아직 기록된 변경 이력이 없습니다.
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--clinic-muted)]">
          학생, 반, 스케줄, 템플릿, 설정을 수정하면 이곳에 최근 20건이 표시됩니다. 파일럿 중 변경 이력을 확인하는 기준으로 사용하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-[#B8C9D0] bg-[#F7FAFA]">
      {auditLogs.map((log) => (
        <div
          key={log.id}
          className="grid gap-2 border-b border-[#D6E0E5] px-3 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#F3EFE7] px-2 py-0.5 text-[11px] font-semibold text-[#405763]">
                {getAuditActionLabel(log.action)}
              </span>
              <span className="truncate text-sm font-semibold text-[var(--clinic-text)]">
                {log.summary}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-[var(--clinic-muted)]">
              {log.actorName} · {getAuditEntityLabel(log.entityType)}
            </p>
          </div>
          <time className="text-xs font-medium text-[var(--clinic-muted)]" dateTime={log.createdAt}>
            {formatAuditDate(log.createdAt)}
          </time>
        </div>
      ))}
    </div>
  );
}

function getAuditActionLabel(action: string) {
  if (action.startsWith("student.")) {
    return "학생";
  }

  if (action.startsWith("class.")) {
    return "반";
  }

  if (action.startsWith("schedule.")) {
    return "스케줄";
  }

  if (action.startsWith("external_class.")) {
    return "타 학원";
  }

  if (action.startsWith("message_template.")) {
    return "문자";
  }

  if (action.startsWith("academy_settings.")) {
    return "정책";
  }

  return "변경";
}

function getAuditEntityLabel(entityType: string) {
  const labels: Record<string, string> = {
    student: "학생 정보",
    class: "반 정보",
    student_schedule: "학생 스케줄",
    external_class: "타 학원 수업",
    message_template: "문자 템플릿",
    academy_settings: "학원 설정",
  };

  return labels[entityType] ?? "운영 데이터";
}

function formatAuditDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");

  return `${month}.${day} ${hour}:${minute}`;
}

function ManagementCommandCenter({
  academyName,
  activeStudents,
  missingScheduleCount,
  classCount,
  memberCount,
  activeSection,
  sections,
  onSelectSection,
}: {
  academyName: string;
  activeStudents: number;
  missingScheduleCount: number;
  classCount: number;
  memberCount: number;
  activeSection: ManagementSection;
  sections: Array<{
    id: ManagementSection;
    label: string;
    group: string;
    detail: string;
    count: string;
    status: string;
  }>;
  onSelectSection: (section: ManagementSection) => void;
}) {
  return (
    <section className="overflow-hidden border border-[#B8C9D0] bg-[#F4F8F9] xl:sticky xl:top-4">
      <div className="border-b border-[#0B3E49] bg-[var(--clinic-primary-dark)] px-3 py-3 text-white sm:px-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100/70">
          Academy Admin
        </p>
        <div className="mt-2 flex flex-col gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight text-white xl:text-lg">
              {academyName}
            </h2>
            <p className="mt-1 text-sm leading-6 text-cyan-50/72 xl:text-xs xl:leading-5">
              운영 세팅, 명단, 수업, 직원, 문자, 정책을 업무 단위로 관리합니다.
            </p>
          </div>
          <div className="grid grid-cols-4 border border-white/15 text-center text-[11px] xl:grid-cols-2">
            <Metric label="학생" value={`${activeStudents}명`} />
            <Metric label="미등록" value={`${missingScheduleCount}명`} />
            <Metric label="반" value={`${classCount}개`} />
            <Metric label="직원" value={`${memberCount}명`} />
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#C9D7DC]">
        {sections.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              type="button"
              aria-pressed={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelectSection(section.id)}
              className={[
                "group grid min-h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-l-[3px] px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--clinic-accent)]",
                isActive
                  ? "border-l-[var(--clinic-primary)] bg-[#E1F0EF] text-[var(--clinic-text)]"
                  : "border-l-transparent bg-[#F7FAFA] text-[var(--clinic-text)] hover:border-l-[#B8C9D0] hover:bg-[#EDF3F5]",
              ].join(" ")}
            >
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-bold">{section.label}</span>
                  <span
                    className={[
                      "shrink-0 border px-2 py-0.5 text-[11px] font-semibold",
                      isActive
                        ? "border-[var(--clinic-primary)] bg-[var(--clinic-primary)] text-white"
                        : "border-[#C9D7DC] bg-[#EDF3F5] text-[var(--clinic-muted)]",
                    ].join(" ")}
                  >
                    {section.count}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--clinic-muted)]">
                  {section.group} · {section.status}
                </span>
                <span className="sr-only">{section.detail}</span>
              </span>
              <span
                className={[
                  "flex size-7 items-center justify-center rounded transition",
                  isActive
                    ? "text-[var(--clinic-primary)]"
                    : "text-[#A9BCC4] group-hover:text-[var(--clinic-muted)]",
                ].join(" ")}
              >
                <ArrowRight size={16} />
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
