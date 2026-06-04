import type { AttendanceStatus } from "@/lib/attendance";
import type { AttendanceRecordItem } from "@/app/app/attendance-board";
import type { OperationsClass, OperationsStudent } from "@/app/app/operations-board";
import type { FollowupReason } from "@/lib/followup-templates";

export type WorkspaceView = "home" | "operations" | "attendance" | "management";

export type FollowupFilter = "all" | "unsent" | "sent";

export type BlockedScheduleFilter = "all" | "shared" | "manual" | "personal";

export type HomeFollowupItem = {
  key: string;
  classId: string;
  className: string;
  student: OperationsStudent;
  status: AttendanceStatus;
  startTime: string;
  endTime: string;
  followupStatus: string | null;
  followupSentAt: string | null;
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

export type HomeScheduleSummary = {
  academyScheduleCount: number;
  classSessionCount: number;
  manualExternalCount: number;
  sharedCount: number;
  blockedScheduleCount: number;
  totalCount: number;
};

export type HomeCopy = {
  title: string;
  description: string;
};

export type WorkspaceHomeProps = {
  academyName: string;
  teacherName: string;
  role: string;
  roleLabel: string;
  canManage: boolean;
  classes: OperationsClass[];
  scheduleItems: HomeScheduleItem[];
  scheduleSummaryItems: HomeScheduleItem[];
  selectedDate: string;
  records: AttendanceRecordItem[];
  loadState: {
    status: "idle" | "loading" | "error";
    error: string;
  };
  onDateChange: (date: string) => void;
  onNavigate: (view: WorkspaceView) => void;
  onStudentSelect: (selection: {
    classId: string;
    studentId: string;
    reason: FollowupReason;
  }) => void;
};
