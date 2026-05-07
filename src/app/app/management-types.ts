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

export type FormStatus = {
  status: "idle" | "saving" | "saved" | "error";
  message: string;
};

export type ClassFormMode = "create" | "edit";

export type ClassFormState = {
  mode: ClassFormMode;
  classId: string;
  name: string;
  subject: string;
  gradeLabel: string;
  teacherId: string;
};

export type StudentFormMode = "create" | "edit";

export type StudentFormState = {
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

export type ScheduleFormMode = "create" | "edit";

export type ScheduleFormState = {
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

export type StudentSortMode = "time" | "name" | "class";

export type StudentScheduleFilter =
  | "all"
  | "has_schedule"
  | "missing_schedule"
  | "external";
