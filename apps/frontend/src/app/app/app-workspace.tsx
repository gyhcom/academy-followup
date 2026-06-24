"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Home,
  MessageCircle,
  Settings,
  User,
} from "lucide-react";
import {
  AttendanceBoard,
  type AttendanceRecordItem,
} from "@/app/app/attendance-board";
import { LogoutButton } from "@/app/app/logout-button";
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
  | "classes"
  | "fees"
  | "reports"
  | "management";

type OperationsSelection = {
  classId: string;
  studentId: string;
  reason: FollowupReason;
};

type WorkspaceNavItem = {
  view: WorkspaceView;
  icon: ReactNode;
  label: string;
  shortLabel: string;
  description: string;
  showOnMobile: boolean;
  showOnDesktop?: boolean;
  disabled?: boolean;
  statusLabel?: string;
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
  const [managementResetKey, setManagementResetKey] = useState(0);
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
      if (nextView === "management") {
        setManagementResetKey((value) => value + 1);
        scrollToTop();
      }

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
    <div className="academy-console min-h-screen w-full bg-[var(--clinic-page)] pb-20 sm:pb-0">
      <div
        className={[
          "sm:grid sm:min-h-[calc(100vh-4.5rem)]",
          visibleView === "attendance"
            ? "sm:grid-cols-[13.5rem_minmax(0,1fr)] lg:grid-cols-[13.75rem_minmax(0,1fr)]"
            : "sm:grid-cols-[14.75rem_minmax(0,1fr)] lg:grid-cols-[15.25rem_minmax(0,1fr)]",
        ].join(" ")}
      >
        <WorkspaceNavigation
          activeView={visibleView}
          academyName={academyName}
          roleLabel={roleLabel}
          canManage={canManage}
          onChange={handleViewChange}
        />

        <div
          className={[
            "min-w-0 space-y-3 px-3 py-3 sm:space-y-3 sm:px-3 sm:py-3",
            visibleView === "attendance" ? "xl:px-3 2xl:px-4" : "xl:px-6",
          ].join(" ")}
        >
          <WorkspaceContextHeader
            academyName={academyName}
            teacherName={teacherName}
            roleLabel={roleLabel}
            selectedDate={selectedDate}
            activeView={visibleView}
            canManage={canManage}
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
              onNavigate={handleViewChange}
            />
          ) : visibleView === "fees" ? (
            <FeesPlaceholder
              onOpenStudents={() => handleViewChange("students")}
              onOpenReports={() => handleViewChange("reports")}
            />
          ) : (
            <ManagementHome
              key={`${visibleView}:${managementResetKey}`}
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
      </div>
    </div>
  );
}

function normalizeWorkspaceView(view: WorkspaceView, canManage: boolean): WorkspaceView {
  if (!canManage && ["students", "classes", "fees", "reports", "management"].includes(view)) {
    return "home";
  }

  return view;
}

function getManagementInitialSection(view: WorkspaceView) {
  if (view === "students") {
    return "students";
  }

  if (view === "classes") {
    return "classes";
  }

  if (view === "reports") {
    return "reports";
  }

  return "setup";
}

function getWorkspaceViewLabel(view: WorkspaceView, canManage: boolean) {
  if (!canManage) {
    if (view === "attendance") return "출석부";
    if (view === "operations") return "문자";
    return "오늘";
  }

  if (view === "attendance") return "출석부";
  if (view === "students") return "학생";
  if (view === "classes") return "클래스";
  if (view === "operations") return "문자";
  if (view === "fees") return "교재/비용";
  if (view === "reports") return "리포트";
  if (view === "management") return "관리";
  return "오늘";
}

function getContextViewTitle(view: WorkspaceView, canManage: boolean) {
  if (view === "attendance") return "출석부";
  if (view === "operations") return "문자";
  if (view === "students") return "학생";
  if (view === "classes") return "클래스 관리";
  if (view === "fees") return "교재/비용";
  if (view === "reports") return "리포트";
  if (view === "management") return "관리";
  return canManage ? "오늘 운영" : "오늘 수업";
}

function WorkspaceContextHeader({
  academyName,
  teacherName,
  roleLabel,
  selectedDate,
  activeView,
  canManage,
}: {
  academyName: string;
  teacherName: string;
  roleLabel: string;
  selectedDate: string;
  activeView: WorkspaceView;
  canManage: boolean;
}) {
  if (activeView === "attendance") {
    return (
      <section className="hidden min-h-12 border border-[var(--clinic-border)] bg-[#fffefa] px-4 py-2 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-sm font-semibold text-[var(--clinic-muted)]">운영 기준일</span>
          <span className="text-lg font-bold tabular-nums text-[var(--clinic-text)]">
            {formatContextDate(selectedDate)}
          </span>
          <CalendarDays size={18} className="shrink-0 text-[var(--clinic-primary)]" aria-hidden="true" />
        </div>

        <div className="flex shrink-0 items-center gap-4 text-sm text-[var(--clinic-muted)]">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center border border-[var(--clinic-border)] bg-[#f1f0ea] text-[var(--clinic-primary)]">
              <User size={17} aria-hidden="true" />
            </span>
            <span className="leading-tight">
              <span className="block font-bold text-[var(--clinic-text)]">{teacherName}</span>
              <span className="block text-xs font-semibold text-[var(--clinic-muted)]">{roleLabel}</span>
            </span>
          </div>
          <LogoutButton />
        </div>
      </section>
    );
  }

  return (
    <section className="hidden min-h-12 border border-[var(--clinic-border)] bg-[#fffefa] px-4 py-2 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-[var(--clinic-muted)]">
            {getWorkspaceViewLabel(activeView, canManage)}
          </p>
          <h2 className="mt-0.5 truncate text-base font-semibold text-[var(--clinic-text)]">
            {getContextViewTitle(activeView, canManage)} · {academyName}
          </h2>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-xs text-[var(--clinic-muted)]">
        <span className="border border-[var(--clinic-border)] bg-[#f6f5ef] px-3 py-1.5 font-semibold text-[var(--clinic-text)]">
          운영 기준 {formatContextDate(selectedDate)}
        </span>
        <span className="border border-[var(--clinic-border)] bg-[#fffefa] px-3 py-1.5">
          {teacherName} · {roleLabel}
        </span>
        <LogoutButton />
      </div>
    </section>
  );
}

function FeesPlaceholder({
  onOpenStudents,
  onOpenReports,
}: {
  onOpenStudents: () => void;
  onOpenReports: () => void;
}) {
  return (
    <section className="border border-[#D8D6DE] bg-[#FFFEFA] p-6">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold text-[#494d5a]">다음 단계 운영 영역</p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">교재/비용</h2>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          교재비와 수강료는 결제/수납 시스템으로 바로 확장하지 않고, 학생별 금액 기록과
          월말 안내 문자에 필요한 변수 관리부터 설계합니다.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onOpenStudents}
          className="min-h-12 border border-[#D8D6DE] bg-[#F4F4F1] px-4 text-left text-sm font-semibold text-[#2f3437] transition hover:bg-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#c9cdfa]"
        >
          학생별 기본 정보 확인
          <span className="mt-1 block text-xs font-normal text-stone-500">
            실제 비용 기능 전 학생 명단과 반 배정을 먼저 고정합니다.
          </span>
        </button>
        <button
          type="button"
          onClick={onOpenReports}
          className="min-h-12 border border-[#D8D6DE] bg-[#FFFEFA] px-4 text-left text-sm font-semibold text-stone-800 transition hover:bg-[#F7F7FA] focus:outline-none focus:ring-2 focus:ring-[#c9cdfa]"
        >
          운영 기록 리포트 확인
          <span className="mt-1 block text-xs font-normal text-stone-500">
            출석, 문자, 이력 CSV 보관 흐름은 기존 리포트에서 확인합니다.
          </span>
        </button>
      </div>
    </section>
  );
}

function formatContextDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).format(date);
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
  academyName,
  roleLabel,
  canManage,
  onChange,
}: {
  activeView: WorkspaceView;
  academyName: string;
  roleLabel: string;
  canManage: boolean;
  onChange: (view: WorkspaceView) => void;
}) {
  const navItems = getWorkspaceNavItems(canManage);
  const desktopItems = navItems.filter((item) => item.showOnDesktop !== false);
  const mobileItems = navItems.filter((item) => item.showOnMobile);
  const shellLabel = canManage ? "학원 운영 콘솔" : "수업 처리 도구";
  const isManagementGroupActive = canManage && isManagementGroupView(activeView);
  const [isManagementGroupManuallyOpen, setIsManagementGroupManuallyOpen] =
    useState(false);
  const isManagementGroupExpanded =
    canManage &&
    (activeView === "students" ||
      activeView === "classes" ||
      (activeView === "management" && isManagementGroupManuallyOpen));

  function handleDesktopNavClick(view: WorkspaceView) {
    if (view !== "management") {
      setIsManagementGroupManuallyOpen(false);
      onChange(view);
      return;
    }

    setIsManagementGroupManuallyOpen(
      isManagementGroupActive ? !isManagementGroupExpanded : true,
    );
    onChange("management");
  }

  return (
    <>
      <aside className="hidden sm:sticky sm:top-0 sm:block sm:h-screen sm:self-start">
        <section className="flex h-full flex-col overflow-hidden border-r border-[var(--clinic-border)] bg-[#fbfaf7] text-[var(--clinic-text)]">
          <div className="border-b border-[var(--console-line)] px-4 py-3">
            <div className="min-w-0">
              <p className="max-w-[11rem] truncate text-sm font-semibold leading-tight text-[var(--clinic-text)]">{academyName}</p>
              <p className="mt-1 text-[11px] font-medium text-[var(--clinic-muted)]">{shellLabel}</p>
            </div>
          </div>
          <nav
            aria-label={shellLabel}
            className="flex-1 space-y-0.5 p-2.5"
          >
            {desktopItems.map((item) => {
              const isManagementItem = item.view === "management";

              return (
                <div key={item.view}>
                  <WorkspaceNavButton
                    icon={item.icon}
                    label={item.label}
                    shortLabel={item.shortLabel}
                    description={item.description}
                    isActive={
                      isManagementItem
                        ? isManagementGroupView(activeView)
                        : activeView === item.view
                    }
                    expanded={
                      isManagementItem ? isManagementGroupExpanded : undefined
                    }
                    disabled={item.disabled}
                    statusLabel={item.statusLabel}
                    variant="desktop"
                    onClick={() => handleDesktopNavClick(item.view)}
                  />

                  {isManagementItem && isManagementGroupExpanded ? (
                    <div className="mt-1 rounded-md border border-[#e1dfd7] bg-[#f3f2ed] p-1">
                      <p className="px-2 pb-1 pt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#858895]">
                        관리 하위 메뉴
                      </p>
                      <div className="space-y-0.5">
                        <WorkspaceManagementSubButton
                          label="학생 관리"
                          description="명단·스케줄"
                          isActive={activeView === "students"}
                          onClick={() => onChange("students")}
                        />
                        <WorkspaceManagementSubButton
                          label="클래스 관리"
                          description="반·시간표"
                          isActive={activeView === "classes"}
                          onClick={() => onChange("classes")}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
          <div className="border-t border-[var(--console-line)] px-4 py-3">
            <p className="truncate text-xs font-medium text-[var(--clinic-muted)]">{roleLabel}</p>
          </div>
        </section>
      </aside>

      <section className="fixed left-0 top-[calc(var(--app-vvh,100vh)-3.5rem-env(safe-area-inset-bottom))] z-40 w-[100dvw] max-w-[100dvw] overflow-hidden border-t border-[var(--clinic-border)] bg-[#fbfaf7]/96 px-3 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur sm:hidden">
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
              disabled={item.disabled}
              statusLabel={item.statusLabel}
              variant="mobile"
              onClick={() => onChange(item.view)}
            />
          ))}
        </nav>
      </section>
    </>
  );
}

function getWorkspaceNavItems(canManage: boolean): WorkspaceNavItem[] {
  const baseItems: WorkspaceNavItem[] = [
    {
      view: "home",
      icon: <Home size={17} />,
      label: "오늘",
      shortLabel: "오늘",
      description: canManage ? "오늘 운영 현황" : "담당 수업 요약",
      showOnMobile: true,
    },
    {
      view: "attendance",
      icon: <CalendarDays size={18} />,
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
        icon: <User size={18} />,
        label: "학생",
        shortLabel: "학생",
        description: "학생·반·스케줄",
        showOnMobile: true,
        showOnDesktop: false,
      },
      {
        view: "operations" as const,
        icon: <MessageCircle size={18} />,
        label: "문자",
        shortLabel: "문자",
        description: "연락 기록·발송",
        showOnMobile: true,
      },
      {
        view: "reports" as const,
        icon: <BarChart3 size={18} />,
        label: "리포트",
        shortLabel: "리포트",
        description: "운영 기록·CSV",
        showOnMobile: false,
      },
      {
        view: "management" as const,
        icon: <Settings size={18} />,
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
      icon: <MessageCircle size={18} />,
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

function isManagementGroupView(view: WorkspaceView) {
  return view === "management" || view === "students" || view === "classes";
}

function WorkspaceManagementSubButton({
  label,
  description,
  isActive,
  onClick,
}: {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`${label} · ${description}`}
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "grid min-h-8 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-2 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9cdfa]",
        isActive
          ? "border border-[#d7dbe0] bg-[#f6f7f8] text-[var(--clinic-text)]"
          : "border border-transparent text-[var(--clinic-muted)] hover:bg-[#f8f9fa] hover:text-[var(--clinic-text)]",
      ].join(" ")}
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold">{label}</span>
        <span className="mt-0.5 block truncate text-[10px] font-medium text-[#858895]">
          {description}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={isActive ? "text-[#2f3437]" : "text-[#b6b3aa]"}
      >
        ›
      </span>
    </button>
  );
}

function WorkspaceNavButton({
  icon,
  label,
  shortLabel,
  description,
  isActive,
  expanded,
  disabled = false,
  statusLabel,
  variant,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
  description: string;
  isActive: boolean;
  expanded?: boolean;
  disabled?: boolean;
  statusLabel?: string;
  variant: "desktop" | "mobile";
  onClick: () => void;
}) {
  if (variant === "desktop") {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={`${label} · ${description}`}
        aria-pressed={isActive}
        aria-expanded={expanded}
        onClick={onClick}
        className={[
          "group relative grid min-h-9 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 px-2.5 py-1.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9cdfa]",
          isActive
            ? "bg-[#f1f2f2] text-[var(--clinic-text)]"
            : "text-[var(--clinic-muted)] hover:bg-[#f8f9fa] hover:text-[var(--clinic-text)]",
          disabled ? "cursor-not-allowed opacity-55" : "",
        ].join(" ")}
      >
        <span
          aria-hidden="true"
          className={[
            "flex size-7 shrink-0 items-center justify-center",
            isActive
              ? "text-[#2f3437]"
              : "text-[#858895] group-hover:text-[#2f3437]",
          ].join(" ")}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{label}</span>
        </span>
        <span
          aria-hidden="true"
          className={[
            "flex min-w-5 items-center justify-center text-[11px] font-medium",
            disabled
              ? "border border-[var(--clinic-border)] px-1.5 py-0.5 text-[10px] text-[var(--clinic-muted)]"
              : isActive
                ? "text-[#2f3437]"
                : "text-[#a3a5ad] group-hover:text-[#2f3437]",
          ].join(" ")}
        >
          {disabled ? (
            statusLabel ?? "준비"
          ) : expanded ? (
            <ChevronDown size={15} strokeWidth={1.8} />
          ) : (
            <ChevronRight size={15} strokeWidth={1.8} />
          )}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`${label} · ${description}`}
      aria-pressed={isActive}
      onClick={onClick}
      className={[
        "flex min-h-12 flex-col items-center justify-center gap-1 border px-1.5 text-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9cdfa]",
        isActive
          ? "border-[#d7dbe0] bg-[#f6f7f8] text-[#2f3437]"
          : "border-transparent bg-transparent text-stone-700 hover:bg-[#f8f9fa]",
        disabled ? "cursor-not-allowed opacity-55" : "",
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className={[
          "flex size-6 shrink-0 items-center justify-center",
          isActive ? "text-[#2f3437]" : "text-stone-500",
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
