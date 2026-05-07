export const attendanceStatuses = [
  "pending",
  "present",
  "late",
  "absent",
  "makeup",
  "excused",
  "needs_check",
] as const;

export type AttendanceStatus = (typeof attendanceStatuses)[number];

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  pending: "미체크",
  present: "출석",
  late: "지각",
  absent: "결석",
  makeup: "보강",
  excused: "사유 결석",
  needs_check: "확인 필요",
};

export function isAttendanceStatus(value: unknown): value is AttendanceStatus {
  return (
    typeof value === "string" &&
    attendanceStatuses.includes(value as AttendanceStatus)
  );
}
