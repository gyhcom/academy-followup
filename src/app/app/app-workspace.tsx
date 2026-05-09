"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ClipboardCheck, LayoutDashboard, Settings } from "lucide-react";
import {
  AttendanceBoard,
  type AttendanceRecordItem,
} from "@/app/app/attendance-board";
import { ManagementHome } from "@/app/app/management-home";
import type {
  ManagementClass,
  ManagementMember,
  ManagementStudent,
  ManagementStudentSchedule,
} from "@/app/app/management-types";
import {
  OperationsBoard,
  type OperationsClass,
} from "@/app/app/operations-board";
import { canManageAcademy } from "@/lib/permissions";

export type {
  ManagementClass,
  ManagementMember,
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
};

type WorkspaceView = "operations" | "attendance" | "management";

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
}: AppWorkspaceProps) {
  const canManage = canManageAcademy(role);
  const [activeView, setActiveView] = useState<WorkspaceView>("operations");
  const visibleView = !canManage && activeView === "management" ? "operations" : activeView;

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
      ) : visibleView === "attendance" ? (
        <AttendanceBoard
          academyName={academyName}
          teacherName={teacherName}
          classes={classes}
          initialDate={attendanceDate}
          initialRecords={attendanceRecords}
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
      <div className={["grid gap-2", canManage ? "grid-cols-3" : "grid-cols-2"].join(" ")}>
        <WorkspaceNavButton
          icon={<LayoutDashboard size={17} />}
          label="운영 보드"
          shortLabel="운영"
          description="수업 후 팔로업"
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
        "flex min-h-14 items-center gap-2 rounded-lg border px-2 text-left transition sm:min-h-16 sm:gap-3 sm:px-3",
        isActive
          ? "border-stone-950 bg-stone-950 text-white"
          : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-white",
        disabled ? "cursor-not-allowed opacity-55 hover:border-stone-200 hover:bg-stone-50" : "",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-8 shrink-0 items-center justify-center rounded-md sm:size-9",
          isActive ? "bg-white/14 text-white" : "bg-white text-emerald-700",
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
