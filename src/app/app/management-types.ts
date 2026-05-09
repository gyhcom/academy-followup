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
  scheduleDate: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string | null;
  title: string;
  memo: string | null;
  isActive: boolean;
  sourceFollowupId: string | null;
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
  studentPhone: string | null;
  maskedStudentPhone: string | null;
  status: string;
  schedules: ManagementStudentSchedule[];
};

export type ManagementMember = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  maskedPhone: string | null;
  role: string;
  status: string;
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
  studentPhone: string;
  status: string;
};

export type MemberFormMode = "create" | "edit";

export type MemberFormState = {
  mode: MemberFormMode;
  memberId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  password: string;
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
  scheduleDate: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  title: string;
  memo: string;
  isActive: boolean;
  sourceFollowupId: string;
};

export type BulkScheduleFormState = {
  classId: string;
  className: string;
  teacherId: string;
  scheduleType: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: string;
  title: string;
  memo: string;
};

export type StudentSortMode = "time" | "name" | "class";

export type StudentScheduleFilter =
  | "all"
  | "has_schedule"
  | "missing_schedule"
  | "external";
