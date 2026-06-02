import type { MessageRecipientType } from "@/lib/message-recipients";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BulkMessageTargetType = "all" | "class" | "grade";

export type BulkRecipient = {
  studentId: string;
  classId: string | null;
  recipientType: MessageRecipientType;
  phone: string;
};

export type BulkRecipientPreview = {
  targetStudentCount: number;
  candidateRecipientCount: number;
  recipientCount: number;
  duplicateExcludedCount: number;
};

type ClassRecord = {
  id: string;
  name: string;
  grade_label: string | null;
};

type StudentRecord = {
  id: string;
  class_id: string | null;
  name: string;
  grade_label: string | null;
  parent_phone: string;
  student_phone: string | null;
  status: string;
};

type ResolveBulkRecipientsParams = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  targetType: BulkMessageTargetType;
  classId: string | null;
  gradeLabel: string | null;
  recipientType: MessageRecipientType;
  excludeDuplicateRecipients: boolean;
};

export async function resolveBulkMessageRecipients({
  admin,
  academyId,
  targetType,
  classId,
  gradeLabel,
  recipientType,
  excludeDuplicateRecipients,
}: ResolveBulkRecipientsParams): Promise<
  | {
      ok: true;
      targetStudents: StudentRecord[];
      candidateRecipients: BulkRecipient[];
      recipients: BulkRecipient[];
      preview: BulkRecipientPreview;
    }
  | { ok: false; status: number; error: string }
> {
  const [classesResult, studentsResult] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, grade_label")
      .eq("academy_id", academyId)
      .returns<ClassRecord[]>(),
    admin
      .from("students")
      .select("id, class_id, name, grade_label, parent_phone, student_phone, status")
      .eq("academy_id", academyId)
      .eq("status", "active")
      .returns<StudentRecord[]>(),
  ]);

  if (classesResult.error) {
    return { ok: false, status: 500, error: classesResult.error.message };
  }

  if (studentsResult.error) {
    return { ok: false, status: 500, error: studentsResult.error.message };
  }

  const classMap = new Map((classesResult.data ?? []).map((classItem) => [classItem.id, classItem]));
  const targetStudents = filterTargetStudents({
    students: studentsResult.data ?? [],
    classMap,
    targetType,
    classId,
    gradeLabel,
  });

  if (targetStudents.length === 0) {
    return { ok: false, status: 400, error: "전체문자 대상 학생이 없습니다." };
  }

  const candidateRecipients = targetStudents.flatMap((student) =>
    getMessageRecipients({
      studentId: student.id,
      classId: student.class_id,
      recipientType,
      parentPhone: student.parent_phone,
      studentPhone: student.student_phone,
    }),
  );
  const recipients = excludeDuplicateRecipients
    ? dedupeRecipientsByPhone(candidateRecipients)
    : candidateRecipients;

  if (recipients.length === 0) {
    return { ok: false, status: 400, error: "발송 가능한 수신자 연락처가 없습니다." };
  }

  return {
    ok: true,
    targetStudents,
    candidateRecipients,
    recipients,
    preview: {
      targetStudentCount: targetStudents.length,
      candidateRecipientCount: candidateRecipients.length,
      recipientCount: recipients.length,
      duplicateExcludedCount: candidateRecipients.length - recipients.length,
    },
  };
}

function filterTargetStudents({
  students,
  classMap,
  targetType,
  classId,
  gradeLabel,
}: {
  students: StudentRecord[];
  classMap: Map<string, ClassRecord>;
  targetType: BulkMessageTargetType;
  classId: string | null;
  gradeLabel: string | null;
}) {
  if (targetType === "class") {
    return students.filter((student) => student.class_id === classId);
  }

  if (targetType === "grade") {
    return students.filter((student) => {
      const classGrade = student.class_id ? classMap.get(student.class_id)?.grade_label : null;
      return student.grade_label === gradeLabel || classGrade === gradeLabel;
    });
  }

  return students;
}

function getMessageRecipients({
  studentId,
  classId,
  recipientType,
  parentPhone,
  studentPhone,
}: {
  studentId: string;
  classId: string | null;
  recipientType: MessageRecipientType;
  parentPhone: string;
  studentPhone: string | null;
}) {
  const recipients: BulkRecipient[] = [];
  const normalizedParentPhone = normalizePhone(parentPhone);
  const normalizedStudentPhone = normalizePhone(studentPhone ?? "");

  if ((recipientType === "parent" || recipientType === "both") && normalizedParentPhone) {
    recipients.push({ studentId, classId, recipientType: "parent", phone: normalizedParentPhone });
  }

  if ((recipientType === "student" || recipientType === "both") && normalizedStudentPhone) {
    recipients.push({ studentId, classId, recipientType: "student", phone: normalizedStudentPhone });
  }

  return recipients;
}

function dedupeRecipientsByPhone(recipients: BulkRecipient[]) {
  const seen = new Set<string>();

  return recipients.filter((recipient) => {
    if (seen.has(recipient.phone)) {
      return false;
    }

    seen.add(recipient.phone);
    return true;
  });
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    return "";
  }

  return digits;
}
