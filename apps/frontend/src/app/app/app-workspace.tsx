"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  ClipboardCheck,
  Home,
  MessageSquareText,
  Settings,
  UsersRound,
} from "lucide-react";
import {
  AttendanceBoard,
  type AttendanceRecordItem,
} from "@/app/app/attendance-board";
import { ManagementHome } from "@/app/app/management-home";
import { WorkspaceHome } from "@/app/app/workspace-home";
import type {
  ManagementAuditLog,
  ManagementClass,
  ManagementMessageTemplate,
  ManagementMember,
  ManagementSettings,
  ManagementStudent,
  ManagementStudentSchedule,
} from "@/app/app/management-types";
import {
  OperationsBoard,
  type OperationsClass,
} from "@/app/app/operations-board";
import { fetchAttendanceRecords } from "@/lib/client/attendance";
import type { FollowupReason } from "@/lib/followup-templates";
import { canManageAcademy } from "@/lib/permissions";

export type {
  ManagementAuditLog,
  ManagementClass,
  ManagementMessageTemplate,
  ManagementMember,
  ManagementSettings,
  ManagementStudent,
  ManagementStudentSchedule,
};

export type HomeScheduleKind =
  | "class_session"
  | "student_schedule"
  | "manual_external_class"
  | "shared_schedule";

export type HomeScheduleItem = {
  id: string;
  kind: HomeScheduleKind;
  scheduleType: string;
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  title: string;
  subtitle: string;
  studentName: string | null;
  className: string | null;
  classId: string | null;
  studentId: string | null;
  studentCount: number | null;
  isShared: boolean;
  canOpenAttendance: boolean;
};

type AppWorkspaceProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  classes: OperationsClass[];
  homeScheduleItems: HomeScheduleItem[];
  homeScheduleSummaryItems: HomeScheduleItem[];
  attendanceDate: string;
  attendanceRecords: AttendanceRecordItem[];
  managementClasses: ManagementClass[];
  managementStudents: ManagementStudent[];
  managementMembers: ManagementMember[];
  managementSettings: ManagementSettings;
  managementTemplates: ManagementMessageTemplate[];
  managementAuditLogs: ManagementAuditLog[];
};

type WorkspaceView =
  | "home"
  | "operations"
  | "attendance"
  | "students"
  | "reports"
  | "management";

type OperationsSelection = {
  classId: string;
  studentId: string;
  reason: FollowupReason;
};

export function AppWorkspace({
  academyName,
  teacherName,
  role,
  roleLabel,
  classes,
  homeScheduleItems,
  homeScheduleSummaryItems,
  attendanceDate,
  attendanceRecords,
  managementClasses,
  managementStudents,
  managementMembers,
  managementSettings,
  managementTemplates,
  managementAuditLogs,
}: AppWorkspaceProps) {
  const canManage = canManageAcademy(role);
  const [activeView, setActiveView] = useState<WorkspaceView>("home");
  const [selectedDate, setSelectedDate] = useState(attendanceDate);
  const [workspaceAttendanceRecords, setWorkspaceAttendanceRecords] =
    useState(attendanceRecords);
  const attendanceSessionCount = useMemo(() => {
    const selectedDayOfWeek = getDayOfWeek(selectedDate);
    const sessionKeys = new Set<string>();

    classes.forEach((classItem) => {
      classItem.students.forEach((student) => {
        student.schedules
          .filter((schedule) => schedule.isActive)
          .filter(
            (schedule) =>
              schedule.classId === classItem.id &&
              schedule.dayOfWeek === selectedDayOfWeek &&
              (schedule.scheduleType === "regular_class" ||
                schedule.scheduleType === "makeup"),
          )
          .forEach((schedule) => {
            sessionKeys.add(`${classItem.id}:${schedule.startTime}:${schedule.endTime}`);
          });
      });
    });

    return sessionKeys.size;
  }, [classes, selectedDate]);
  const [attendanceLoadState, setAttendanceLoadState] = useState<{
    status: "idle" | "loading" | "error";
    error: string;
  }>({ status: "idle", error: "" });
  const [operationsSelection, setOperationsSelection] =
    useState<OperationsSelection | null>(null);
  const visibleView = normalizeWorkspaceView(activeView, canManage);

  useEffect(() => {
    function syncVisualViewportHeight() {
      const height = window.visualViewport?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vvh", `${height}px`);
    }

    syncVisualViewportHeight();
    window.visualViewport?.addEventListener("resize", syncVisualViewportHeight);
    window.addEventListener("resize", syncVisualViewportHeight);

    return () => {
      window.visualViewport?.removeEventListener("resize", syncVisualViewportHeight);
      window.removeEventListener("resize", syncVisualViewportHeight);
      document.documentElement.style.removeProperty("--app-vvh");
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttendanceRecords() {
      setAttendanceLoadState({ status: "loading", error: "" });

      try {
        const payload = await fetchAttendanceRecords(selectedDate, controller.signal);
        setWorkspaceAttendanceRecords(payload.records ?? []);
        setAttendanceLoadState({ status: "idle", error: "" });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setWorkspaceAttendanceRecords([]);
        setAttendanceLoadState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "출석 기록을 불러오지 못했습니다.",
        });
      }
    }

    void loadAttendanceRecords();

    return () => {
      controller.abort();
    };
  }, [selectedDate]);

  function scrollToTop() {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }

  function handleViewChange(view: WorkspaceView) {
    const nextView = normalizeWorkspaceView(view, canManage);
    const currentView = normalizeWorkspaceView(activeView, canManage);

    if (nextView === currentView) {
      return;
    }

    setActiveView(nextView);
    scrollToTop();
  }

  function handleHomeStudentSelect(selection: OperationsSelection) {
    setOperationsSelection(selection);
    handleViewChange("operations");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-20 sm:space-y-5 sm:pb-0 xl:max-w-[82rem] 2xl:max-w-[88rem]">
      <WorkspaceNavigation
        activeView={visibleView}
        canManage={canManage}
        onChange={handleViewChange}
      />

      {visibleView === "home" ? (
        <WorkspaceHome
          key={selectedDate}
          academyName={academyName}
          teacherName={teacherName}
          role={role}
          roleLabel={roleLabel}
          canManage={canManage}
          classes={classes}
          scheduleItems={homeScheduleItems}
          scheduleSummaryItems={homeScheduleSummaryItems}
          selectedDate={selectedDate}
          records={workspaceAttendanceRecords}
          loadState={attendanceLoadState}
          onDateChange={setSelectedDate}
          onNavigate={handleViewChange}
          onStudentSelect={handleHomeStudentSelect}
        />
      ) : visibleView === "operations" ? (
        <OperationsBoard
          academyName={academyName}
          teacherName={teacherName}
          role={role}
          roleLabel={roleLabel}
          allowAssistantSend={managementSettings.allowAssistantSend}
          canManage={canManage}
          classes={classes}
          initialSelection={operationsSelection}
        />
      ) : visibleView === "attendance" ? (
        <AttendanceBoard
          academyName={academyName}
          teacherName={teacherName}
          role={role}
          allowAssistantSend={managementSettings.allowAssistantSend}
          classes={classes}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          initialRecords={workspaceAttendanceRecords}
          onRecordsChange={setWorkspaceAttendanceRecords}
        />
      ) : (
        <ManagementHome
          key={visibleView}
          academyName={academyName}
          classes={managementClasses}
          members={managementMembers}
          students={managementStudents}
          settings={managementSettings}
          templates={managementTemplates}
          auditLogs={managementAuditLogs}
          attendanceSessionCount={attendanceSessionCount}
          initialSection={getManagementInitialSection(visibleView)}
          onNavigate={handleViewChange}
        />
      )}
    </div>
  );
}

function normalizeWorkspaceView(view: WorkspaceView, canManage: boolean): WorkspaceView {
  if (!canManage && ["students", "reports", "management"].includes(view)) {
    return "home";
  }

  return view;
}

function getManagementInitialSection(view: WorkspaceView) {
  if (view === "students") {
    return "students";
  }

  if (view === "reports") {
    return "reports";
  }

  return "setup";
}

function getDayOfWeek(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return 1;
  }

  return date.getDay();
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
  const navItems = getWorkspaceNavItems(canManage);
  const mobileItems = navItems.filter((item) => item.showOnMobile);
  const shellLabel = canManage ? "학원 운영 콘솔" : "수업 처리 도구";
  const shellDescription = canManage
    ? "PC에서는 학생 명단과 리포트까지 바로 접근합니다."
    : "담당 수업 출석과 연락 처리만 빠르게 사용합니다.";

  return (
    <>
      <section className="hidden overflow-hidden rounded-xl border border-[#DED8CE] bg-white shadow-sm sm:block">
        <div className="flex flex-col gap-2 px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#315C7C]">{shellLabel}</p>
            <p className="mt-0.5 hidden text-xs text-stone-500 lg:block">
              {shellDescription}
            </p>
          </div>

          <nav
            aria-label={shellLabel}
            className="grid gap-1.5 md:grid-cols-3 lg:flex lg:items-center"
          >
            {navItems.map((item) => (
              <WorkspaceNavButton
                key={item.view}
                icon={item.icon}
                label={item.label}
                shortLabel={item.shortLabel}
                description={item.description}
                isActive={activeView === item.view}
                variant="desktop"
                onClick={() => onChange(item.view)}
              />
            ))}
          </nav>
        </div>
      </section>

      <section className="fixed left-0 top-[calc(var(--app-vvh,100vh)-3.5rem-env(safe-area-inset-bottom))] z-40 w-[100dvw] max-w-[100dvw] overflow-hidden border-t border-[#DED8CE] bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(33,32,30,0.10)] backdrop-blur sm:hidden">
        <nav
          aria-label={shellLabel}
          className={["grid gap-1.5", getMobileGridClass(mobileItems.length)].join(" ")}
        >
          {mobileItems.map((item) => (
            <WorkspaceNavButton
              key={item.view}
              icon={item.icon}
              label={item.label}
              shortLabel={item.shortLabel}
              description={item.description}
              isActive={activeView === item.view}
              variant="mobile"
              onClick={() => onChange(item.view)}
            />
          ))}
        </nav>
      </section>
    </>
  );
}

function getWorkspaceNavItems(canManage: boolean) {
  const baseItems: Array<{
    view: WorkspaceView;
    icon: ReactNode;
    label: string;
    shortLabel: string;
    description: string;
    showOnMobile: boolean;
  }> = [
    {
      view: "home",
      icon: <Home size={17} />,
      label: canManage ? "운영 홈" : "홈",
      shortLabel: "홈",
      description: canManage ? "오늘 운영 현황" : "담당 수업 요약",
      showOnMobile: true,
    },
    {
      view: "attendance",
      icon: <ClipboardCheck size={17} />,
      label: "출석부",
      shortLabel: "출석",
      description: "도착·지각 체크",
      showOnMobile: true,
    },
  ];

  if (canManage) {
    return [
      ...baseItems,
      {
        view: "students" as const,
        icon: <UsersRound size={17} />,
        label: "학생 명단",
        shortLabel: "학생",
        description: "학생·반·스케줄",
        showOnMobile: true,
      },
      {
        view: "operations" as const,
        icon: <MessageSquareText size={17} />,
        label: "문자",
        shortLabel: "문자",
        description: "연락 기록·발송",
        showOnMobile: true,
      },
      {
        view: "reports" as const,
        icon: <BarChart3 size={17} />,
        label: "리포트",
        shortLabel: "리포트",
        description: "운영 기록·CSV",
        showOnMobile: false,
      },
      {
        view: "management" as const,
        icon: <Settings size={17} />,
        label: "관리",
        shortLabel: "관리",
        description: "직원·정책·설정",
        showOnMobile: true,
      },
    ];
  }

  return [
    ...baseItems,
    {
      view: "operations" as const,
      icon: <MessageSquareText size={17} />,
      label: "문자",
      shortLabel: "문자",
      description: "수업 후 연락",
      showOnMobile: true,
    },
  ];
}

function getMobileGridClass(itemCount: number) {
  if (itemCount >= 5) {
    return "grid-cols-5";
  }

  if (itemCount === 4) {
    return "grid-cols-4";
  }

  return "grid-cols-3";
}

function WorkspaceNavButton({
  icon,
  label,
  shortLabel,
  description,
  isActive,
  disabled = false,
  variant,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
  description: string;
  isActive: boolean;
  disabled?: boolean;
  variant: "desktop" | "mobile";
  onClick: () => void;
}) {
  if (variant === "desktop") {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-pressed={isActive}
        onClick={onClick}
        className={[
          "flex min-h-11 min-w-[8.25rem] items-center gap-2 rounded-lg border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
          isActive
            ? "border-[#315C7C] bg-[#315C7C] text-white shadow-sm"
            : "border-transparent bg-white text-stone-700 hover:border-[#D9E2EA] hover:bg-[#F8FBFD]",
          disabled ? "cursor-not-allowed opacity-55" : "",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "flex size-8 shrink-0 items-center justify-center rounded-md",
            isActive ? "bg-white/15 text-white" : "bg-[#F2F5F8] text-[#315C7C]",
          ].join(" ")}
        >
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{label}</span>
          <span
            className={[
              "mt-0.5 block truncate text-xs",
              isActive ? "text-white/75" : "text-stone-500",
            ].join(" ")}
          >
            {description}
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md border px-1.5 text-center transition focus:outline-none focus:ring-2 focus:ring-[#C9D6E2]",
        isActive
          ? "border-[#315C7C] bg-[#EAF1F8] text-[#244B67]"
          : "border-transparent bg-transparent text-stone-700 hover:bg-[#F2F5F8]",
        disabled ? "cursor-not-allowed opacity-55" : "",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "flex size-6 shrink-0 items-center justify-center rounded-md",
          isActive ? "text-[#244B67]" : "text-stone-500",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="block max-w-full truncate text-xs font-semibold">
        {shortLabel}
      </span>
    </button>
  );
}

/*
 * WorkspaceNavButton intentionally has separate desktop/mobile variants.
 * Owner PC navigation needs an operating-console command bar, while mobile
 * remains a compact five-item tab bar.
 */
