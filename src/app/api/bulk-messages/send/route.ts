import { NextResponse } from "next/server";
import {
  isMessageRecipientType,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import {
  getMessageLengthError,
  normalizeMessageForSending,
} from "@/lib/message-length";
import { canManageAcademy } from "@/lib/permissions";
import { getRouteWorkspace } from "@/lib/server/route-workspace";
import { sendSms } from "@/lib/sms/solapi";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type BulkMessageRequest = {
  targetType?: unknown;
  classId?: unknown;
  gradeLabel?: unknown;
  recipientType?: unknown;
  messageBody?: unknown;
  excludeDuplicateRecipients?: unknown;
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

type AcademySettingsRecord = {
  sms_dry_run: boolean;
};

type BulkRecipient = {
  studentId: string;
  classId: string | null;
  recipientType: MessageRecipientType;
  phone: string;
};

type CreatedFollowupRecord = {
  id: string;
  student_id: string;
};

export async function POST(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const { admin, profile, userId } = workspaceResult.workspace;

  if (!canManageAcademy(profile.role)) {
    return NextResponse.json(
      { error: "전체문자는 원장 또는 관리자만 보낼 수 있습니다." },
      { status: 403 },
    );
  }

  const parsedRequest = await parseBulkMessageRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const [classesResult, studentsResult, settingsResult] = await Promise.all([
    admin
      .from("classes")
      .select("id, name, grade_label")
      .eq("academy_id", profile.academy_id)
      .returns<ClassRecord[]>(),
    admin
      .from("students")
      .select("id, class_id, name, grade_label, parent_phone, student_phone, status")
      .eq("academy_id", profile.academy_id)
      .eq("status", "active")
      .returns<StudentRecord[]>(),
    admin
      .from("academy_settings")
      .select("sms_dry_run")
      .eq("academy_id", profile.academy_id)
      .maybeSingle<AcademySettingsRecord>(),
  ]);

  if (classesResult.error) {
    return NextResponse.json({ error: classesResult.error.message }, { status: 500 });
  }

  if (studentsResult.error) {
    return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
  }

  if (settingsResult.error) {
    return NextResponse.json({ error: settingsResult.error.message }, { status: 500 });
  }

  const classes = classesResult.data ?? [];
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));
  const targetStudents = filterTargetStudents({
    students: studentsResult.data ?? [],
    classMap,
    targetType: parsedRequest.targetType,
    classId: parsedRequest.classId,
    gradeLabel: parsedRequest.gradeLabel,
  });

  if (targetStudents.length === 0) {
    return NextResponse.json(
      { error: "전체문자 대상 학생이 없습니다." },
      { status: 400 },
    );
  }

  const candidateRecipients = targetStudents.flatMap((student) =>
    getMessageRecipients({
      studentId: student.id,
      classId: student.class_id,
      recipientType: parsedRequest.recipientType,
      parentPhone: student.parent_phone,
      studentPhone: student.student_phone,
    }),
  );
  const recipients = parsedRequest.excludeDuplicateRecipients
    ? dedupeRecipientsByPhone(candidateRecipients)
    : candidateRecipients;

  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "발송 가능한 수신자 연락처가 없습니다." },
      { status: 400 },
    );
  }

  const dryRun = settingsResult.data?.sms_dry_run ?? process.env.SMS_DRY_RUN !== "false";
  const followups = await createBulkFollowups({
    admin,
    academyId: profile.academy_id,
    teacherId: userId,
    messageBody: parsedRequest.messageBody,
    recipients,
  });

  if (!followups.ok) {
    return NextResponse.json({ error: followups.error }, { status: 500 });
  }

  if (dryRun) {
    await saveBulkMessageLogs({
      admin,
      academyId: profile.academy_id,
      followups: followups.records,
      recipients,
      status: "dry_run",
    });

    return NextResponse.json({
      dryRun: true,
      message: "SMS_DRY_RUN이 활성화되어 실제 문자를 발송하지 않았습니다.",
      targetStudentCount: targetStudents.length,
      candidateRecipientCount: candidateRecipients.length,
      recipientCount: recipients.length,
      duplicateExcludedCount: candidateRecipients.length - recipients.length,
    });
  }

  const sentResults = [];

  for (const recipient of recipients) {
    const result = await sendSms({
      to: recipient.phone,
      text: parsedRequest.messageBody,
    });
    sentResults.push({ ...recipient, providerMessageId: getProviderMessageId(result) });
  }

  await saveBulkMessageLogs({
    admin,
    academyId: profile.academy_id,
    followups: followups.records,
    recipients: sentResults,
    status: "sent",
  });

  return NextResponse.json({
    dryRun: false,
    message: "전체문자를 발송했습니다.",
    targetStudentCount: targetStudents.length,
    candidateRecipientCount: candidateRecipients.length,
    recipientCount: recipients.length,
    duplicateExcludedCount: candidateRecipients.length - recipients.length,
  });
}

async function parseBulkMessageRequest(request: Request): Promise<
  | {
      ok: true;
      targetType: "all" | "class" | "grade";
      classId: string | null;
      gradeLabel: string | null;
      recipientType: MessageRecipientType;
      messageBody: string;
      excludeDuplicateRecipients: boolean;
    }
  | { ok: false; error: string }
> {
  let body: BulkMessageRequest;

  try {
    body = (await request.json()) as BulkMessageRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  const targetType = body.targetType;

  if (targetType !== "all" && targetType !== "class" && targetType !== "grade") {
    return { ok: false, error: "전체문자 대상 범위를 확인해 주세요." };
  }

  const classId = typeof body.classId === "string" ? body.classId.trim() : "";
  const gradeLabel = typeof body.gradeLabel === "string" ? body.gradeLabel.trim() : "";

  if (targetType === "class" && !classId) {
    return { ok: false, error: "반을 선택해 주세요." };
  }

  if (targetType === "grade" && !gradeLabel) {
    return { ok: false, error: "학년을 선택해 주세요." };
  }

  if (!isMessageRecipientType(body.recipientType)) {
    return { ok: false, error: "지원하지 않는 문자 수신자입니다." };
  }

  if (typeof body.messageBody !== "string" || body.messageBody.trim().length === 0) {
    return { ok: false, error: "전체문자 본문을 입력해 주세요." };
  }

  const messageBody = normalizeMessageForSending(body.messageBody);
  const messageLengthError = getMessageLengthError(messageBody);

  if (messageLengthError) {
    return { ok: false, error: messageLengthError };
  }

  return {
    ok: true,
    targetType,
    classId: targetType === "class" ? classId : null,
    gradeLabel: targetType === "grade" ? gradeLabel : null,
    recipientType: body.recipientType,
    messageBody,
    excludeDuplicateRecipients: body.excludeDuplicateRecipients !== false,
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
  targetType: "all" | "class" | "grade";
  classId: string | null;
  gradeLabel: string | null;
}) {
  if (targetType === "class") {
    return students.filter((student) => student.class_id === classId);
  }

  if (targetType === "grade") {
    return students.filter((student) => {
      const classGrade = student.class_id
        ? classMap.get(student.class_id)?.grade_label
        : null;

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

async function createBulkFollowups({
  admin,
  academyId,
  teacherId,
  messageBody,
  recipients,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  teacherId: string;
  messageBody: string;
  recipients: BulkRecipient[];
}): Promise<{ ok: true; records: CreatedFollowupRecord[] } | { ok: false; error: string }> {
  const { data, error } = await admin
    .from("followups")
    .insert(
      recipients.map((recipient) => ({
        academy_id: academyId,
        student_id: recipient.studentId,
        class_id: recipient.classId,
        teacher_id: teacherId,
        reason: "consultation",
        message_body: messageBody,
        recipient_type: recipient.recipientType,
        status: "draft",
      })),
    )
    .select("id, student_id")
    .returns<CreatedFollowupRecord[]>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, records: data ?? [] };
}

async function saveBulkMessageLogs({
  admin,
  academyId,
  followups,
  recipients,
  status,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  followups: CreatedFollowupRecord[];
  recipients: Array<BulkRecipient & { providerMessageId?: string }>;
  status: "dry_run" | "sent";
}) {
  const now = new Date().toISOString();

  const [logResult, followupResult] = await Promise.all([
    admin.from("message_logs").insert(
      recipients.map((recipient, index) => ({
        academy_id: academyId,
        followup_id: followups[index]?.id ?? null,
        provider: "solapi",
        provider_message_id: recipient.providerMessageId ?? null,
        recipient_phone: recipient.phone,
        recipient_type: recipient.recipientType,
        status,
        error_message: null,
      })),
    ),
    admin
      .from("followups")
      .update({ status: "sent", sent_at: now })
      .in(
        "id",
        followups.map((followup) => followup.id),
      )
      .eq("academy_id", academyId),
  ]);

  if (logResult.error) {
    throw new Error(logResult.error.message);
  }

  if (followupResult.error) {
    throw new Error(followupResult.error.message);
  }
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    return "";
  }

  return digits;
}

function getProviderMessageId(result: unknown) {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const record = result as Record<string, unknown>;
  const candidate =
    record.messageId ??
    record.message_id ??
    record.groupId ??
    record.group_id ??
    record.requestId;

  return typeof candidate === "string" ? candidate : undefined;
}
