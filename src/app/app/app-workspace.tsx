"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ClipboardCheck, Home, MessageSquareText, Settings } from "lucide-react";
import {
  AttendanceBoard,
  type AttendanceRecordItem,
} from "@/app/app/attendance-board";
import { ManagementHome } from "@/app/app/management-home";
import { WorkspaceHome } from "@/app/app/workspace-home";
import type {
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
import type { FollowupReason } from "@/lib/followup-templates";
import { canManageAcademy } from "@/lib/permissions";

export type {
  ManagementClass,
  ManagementMessageTemplate,
  ManagementMember,
  ManagementSettings,
  ManagementStudent,
  ManagementStudentSchedule,
};

type AppWorkspaceProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  classes: OperationsClass[];
  attendanceDate: string;
  attendanceRecords: AttendanceRecordItem[];
  managementClasses: ManagementClass[];
  managementStudents: ManagementStudent[];
  managementMembers: ManagementMember[];
  managementSettings: ManagementSettings;
  managementTemplates: ManagementMessageTemplate[];
};

type WorkspaceView = "home" | "operations" | "attendance" | "management";

type OperationsSelection = {
  classId: string;
  studentId: string;
  reason: FollowupReason;
};

type AttendanceApiResponse = {
  records?: AttendanceRecordItem[];
  error?: string;
};

export function AppWorkspace({
  academyName,
  teacherName,
  role,
  roleLabel,
  classes,
  attendanceDate,
  attendanceRecords,
  managementClasses,
  managementStudents,
  managementMembers,
  managementSettings,
  managementTemplates,
}: AppWorkspaceProps) {
  const canManage = canManageAcademy(role);
  const [activeView, setActiveView] = useState<WorkspaceView>("home");
  const [selectedDate, setSelectedDate] = useState(attendanceDate);
  const [workspaceAttendanceRecords, setWorkspaceAttendanceRecords] =
    useState(attendanceRecords);
  const [attendanceLoadState, setAttendanceLoadState] = useState<{
    status: "idle" | "loading" | "error";
    error: string;
  }>({ status: "idle", error: "" });
  const [operationsSelection, setOperationsSelection] =
    useState<OperationsSelection | null>(null);
  const visibleView = !canManage && activeView === "management" ? "home" : activeView;

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
        const response = await fetch(`/api/attendance?date=${selectedDate}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as AttendanceApiResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "출석 기록을 불러오지 못했습니다.");
        }

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

  function handleHomeStudentSelect(selection: OperationsSelection) {
    setOperationsSelection(selection);
    setActiveView("operations");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-20 sm:space-y-5 sm:pb-0">
      <WorkspaceNavigation
        activeView={visibleView}
        canManage={canManage}
        onChange={setActiveView}
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
          selectedDate={selectedDate}
          records={workspaceAttendanceRecords}
          loadState={attendanceLoadState}
          onDateChange={setSelectedDate}
          onNavigate={setActiveView}
          onStudentSelect={handleHomeStudentSelect}
        />
      ) : visibleView === "operations" ? (
        <OperationsBoard
          academyName={academyName}
          teacherName={teacherName}
          roleLabel={roleLabel}
          classes={classes}
          initialSelection={operationsSelection}
        />
      ) : visibleView === "attendance" ? (
        <AttendanceBoard
          academyName={academyName}
          teacherName={teacherName}
          classes={classes}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          initialRecords={workspaceAttendanceRecords}
          onRecordsChange={setWorkspaceAttendanceRecords}
        />
      ) : (
        <ManagementHome
          academyName={academyName}
          classes={managementClasses}
          members={managementMembers}
          students={managementStudents}
          settings={managementSettings}
          templates={managementTemplates}
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
    <section className="fixed left-0 top-[calc(var(--app-vvh,100vh)-3.5rem-env(safe-area-inset-bottom))] z-40 w-[100dvw] max-w-[100dvw] overflow-hidden border-t border-[#DED8CE] bg-white/95 px-3 pb-[env(safe-area-inset-bottom)] pt-2 shadow-[0_-12px_30px_rgba(33,32,30,0.10)] backdrop-blur sm:static sm:w-auto sm:max-w-none sm:rounded-lg sm:border sm:bg-white sm:p-2 sm:shadow-sm">
      <div className={["grid gap-1.5", canManage ? "grid-cols-4" : "grid-cols-3"].join(" ")}>
        <WorkspaceNavButton
          icon={<Home size={17} />}
          label="홈"
          shortLabel="홈"
          description="오늘 요약"
          isActive={activeView === "home"}
          onClick={() => onChange("home")}
        />
        <WorkspaceNavButton
          icon={<MessageSquareText size={17} />}
          label="문자 보내기"
          shortLabel="문자"
          description="수업 후 연락"
          isActive={activeView === "operations"}
          onClick={() => onChange("operations")}
        />
        <WorkspaceNavButton
          icon={<ClipboardCheck size={17} />}
          label="출석부"
          shortLabel="출석"
          description="도착·지각 체크"
          isActive={activeView === "attendance"}
          onClick={() => onChange("attendance")}
        />
        {canManage ? (
          <WorkspaceNavButton
            icon={<Settings size={17} />}
            label="관리"
            shortLabel="관리"
            description="학생·반·구성원"
            isActive={activeView === "management"}
            onClick={() => onChange("management")}
          />
        ) : null}
      </div>
    </section>
  );
}

function WorkspaceNavButton({
  icon,
  label,
  shortLabel,
  description,
  isActive,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
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
        "flex min-h-12 flex-col items-center justify-center gap-1 rounded-md border px-2 text-center transition sm:min-h-12 sm:flex-row sm:justify-start sm:text-left sm:px-3",
        isActive
          ? "border-[#315C7C] bg-[#EAF1F8] text-[#244B67] sm:bg-[#315C7C] sm:text-white"
          : "border-transparent bg-transparent text-stone-700 hover:bg-[#F2F5F8] sm:bg-white",
        disabled ? "cursor-not-allowed opacity-55 hover:border-[#E6E0D5] hover:bg-[#F7F5F0]" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-6 shrink-0 items-center justify-center rounded-md sm:size-8",
          isActive ? "text-[#244B67] sm:bg-white/15 sm:text-white" : "text-stone-500 sm:bg-[#F2F5F8] sm:text-[#315C7C]",
        ].join(" ")}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold sm:text-sm">
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        <span
          className={[
            "mt-0.5 hidden truncate text-xs sm:block",
            isActive ? "text-white/70" : "text-stone-500",
          ].join(" ")}
        >
          {description}
        </span>
      </span>
    </button>
  );
}
