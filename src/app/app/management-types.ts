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
  scheduleShareConsentConfirmed: boolean;
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

export type ManagementSettings = {
  academyName: string;
  senderName: string;
  senderPhone: string;
  smsDryRun: boolean;
  duplicateGuardMinutes: number;
  allowAssistantSend: boolean;
};

export type ManagementMessageTemplate = {
  id: string | null;
  reason: string;
  reasonLabel: string;
  title: string;
  body: string;
  isActive: boolean;
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
  scheduleShareConsentConfirmed: boolean;
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

export type SettingsFormState = ManagementSettings;

export type MessageTemplateFormState = {
  templateId: string | null;
  reason: string;
  reasonLabel: string;
  title: string;
  body: string;
  isActive: boolean;
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
  dayOfWeeks: number[];
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
