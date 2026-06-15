import { NextResponse } from "next/server";
import { renderFollowupTemplate, type FollowupReason } from "@/lib/followup-templates";
import {
  getMessageLengthError,
  normalizeMessageForSending,
} from "@/lib/message-length";
import {
  isMessageRecipientType,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import { canAccessAssignedClass, canSendFollowupMessage } from "@/lib/permissions";
import { getRouteWorkspace } from "@/lib/server/route-workspace";
import { sendSms } from "@/lib/sms/solapi";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AttendanceBulkReason = Extract<FollowupReason, "late" | "absence">;

type BulkAttendanceRequest = {
  reason?: unknown;
  studentIds?: unknown;
  classId?: unknown;
  attendanceDate?: unknown;
  scheduledStartTime?: unknown;
  scheduledEndTime?: unknown;
  recipientType?: unknown;
  messageTemplate?: unknown;
  sendNow?: unknown;
};

type ClassRecord = {
  id: string;
  name: string;
  teacher_id: string | null;
};

type StudentRecord = {
  id: string;
  name: string;
  class_id: string | null;
  parent_phone: string;
  student_phone: string | null;
  status: string;
};

type AttendanceRecord = {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
};

type AcademySettingsRecord = {
  duplicate_guard_minutes: number | null;
  allow_assistant_send: boolean;
  sms_dry_run: boolean;
};

type ProfileRecord = {
  name: string;
};

type AcademyRecord = {
  name: string;
  sender_name: string | null;
};

type CreatedFollowupRecord = {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
};

type FailedStudent = {
  studentId: string;
  studentName?: string;
  reason: string;
};

type PreparedFollowup = {
  student: StudentRecord;
  attendanceRecord: AttendanceRecord;
  messageBody: string;
  recipients: Array<{ recipientType: MessageRecipientType; phone: string }>;
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
  const parsedRequest = await parseBulkAttendanceRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const { data: classRecord, error: classError } = await admin
    .from("classes")
    .select("id, name, teacher_id")
    .eq("id", parsedRequest.classId)
    .eq("academy_id", profile.academy_id)
    .maybeSingle<ClassRecord>();

  if (classError) {
    return NextResponse.json({ error: classError.message }, { status: 500 });
  }

  if (!classRecord) {
    return NextResponse.json({ error: "수업 반을 찾을 수 없습니다." }, { status: 404 });
  }

  if (
    !canAccessAssignedClass({
      role: profile.role,
      classTeacherId: classRecord.teacher_id,
      userId,
    })
  ) {
    return NextResponse.json(
      { error: "이 수업의 학생에게 연락 기록을 만들 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data: settings, error: settingsError } = await admin
    .from("academy_settings")
    .select("duplicate_guard_minutes, allow_assistant_send, sms_dry_run")
    .eq("academy_id", profile.academy_id)
    .maybeSingle<AcademySettingsRecord>();

  if (settingsError) {
    return NextResponse.json({ error: settingsError.message }, { status: 500 });
  }

  if (
    parsedRequest.sendNow &&
    !canSendFollowupMessage({
      role: profile.role,
      classTeacherId: classRecord.teacher_id,
      userId,
      allowAssistantSend: settings?.allow_assistant_send ?? false,
    })
  ) {
    return NextResponse.json(
      {
        error:
          profile.role === "assistant"
            ? "보조 선생님은 현재 테스트 발송 권한이 없습니다. 연락 기록 저장은 가능하며, 발송은 원장/관리자에게 요청하세요."
            : "이 연락 기록을 발송할 권한이 없습니다.",
      },
      { status: 403 },
    );
  }

  const [studentsResult, attendanceResult, profileResult, academyResult] =
    await Promise.all([
      admin
        .from("students")
        .select("id, name, class_id, parent_phone, student_phone, status")
        .eq("academy_id", profile.academy_id)
        .eq("class_id", parsedRequest.classId)
        .in("id", parsedRequest.studentIds)
        .returns<StudentRecord[]>(),
      admin
        .from("attendance_records")
        .select("id, student_id, class_id, status")
        .eq("academy_id", profile.academy_id)
        .eq("class_id", parsedRequest.classId)
        .eq("attendance_date", parsedRequest.attendanceDate)
        .eq("scheduled_start_time", parsedRequest.scheduledStartTime)
        .eq("scheduled_end_time", parsedRequest.scheduledEndTime)
        .in("student_id", parsedRequest.studentIds)
        .returns<AttendanceRecord[]>(),
      admin
        .from("profiles")
        .select("name")
        .eq("id", userId)
        .maybeSingle<ProfileRecord>(),
      admin
        .from("academies")
        .select("name, sender_name")
        .eq("id", profile.academy_id)
        .maybeSingle<AcademyRecord>(),
    ]);

  if (studentsResult.error) {
    return NextResponse.json({ error: studentsResult.error.message }, { status: 500 });
  }

  if (attendanceResult.error) {
    return NextResponse.json({ error: attendanceResult.error.message }, { status: 500 });
  }

  if (profileResult.error) {
    return NextResponse.json({ error: profileResult.error.message }, { status: 500 });
  }

  if (academyResult.error) {
    return NextResponse.json({ error: academyResult.error.message }, { status: 500 });
  }

  const students = studentsResult.data ?? [];
  const attendanceRecords = attendanceResult.data ?? [];
  const failedStudents = validateBulkTargets({
    requestedStudentIds: parsedRequest.studentIds,
    students,
    attendanceRecords,
    attendanceStatus: attendanceStatusForReason(parsedRequest.reason),
  });

  if (failedStudents.length > 0) {
    return NextResponse.json(
      {
        error: "일괄 문자 대상에 처리할 수 없는 학생이 있습니다.",
        failedStudents,
      },
      { status: 400 },
    );
  }

  const academyName = academyResult.data?.sender_name || academyResult.data?.name || "학원";
  const teacherName = profileResult.data?.name || "담당 선생님";
  const attendanceByStudentId = new Map(
    attendanceRecords.map((record) => [record.student_id, record]),
  );
  const prepared = students.map((student) =>
    prepareFollowup({
      student,
      attendanceRecord: attendanceByStudentId.get(student.id),
      className: classRecord.name,
      academyName,
      teacherName,
      messageTemplate: parsedRequest.messageTemplate,
      recipientType: parsedRequest.recipientType,
    }),
  );
  const prepareFailures = prepared.filter((item) => !item.ok);

  if (prepareFailures.length > 0) {
    return NextResponse.json(
      {
        error: "문자 본문 또는 수신자 정보를 확인해 주세요.",
        failedStudents: prepareFailures.map((item) => item.failedStudent),
      },
      { status: 400 },
    );
  }

  const preparedFollowups = prepared
    .filter((item): item is { ok: true; followup: PreparedFollowup } => item.ok)
    .map((item) => item.followup);

  if (parsedRequest.sendNow) {
    const duplicateCheck = await validateDuplicateSends({
      admin,
      academyId: profile.academy_id,
      preparedFollowups,
      reason: parsedRequest.reason,
      recipientType: parsedRequest.recipientType,
      duplicateGuardMinutes: settings?.duplicate_guard_minutes ?? 1440,
    });

    if (!duplicateCheck.ok) {
      return NextResponse.json({ error: duplicateCheck.error }, { status: 500 });
    }

    if (duplicateCheck.failedStudents.length > 0) {
      return NextResponse.json(
        {
          error: "최근 발송 기록이 있어 중복 발송을 차단했습니다.",
          duplicate: true,
          duplicateGuardMinutes: duplicateCheck.duplicateGuardMinutes,
          failedStudents: duplicateCheck.failedStudents,
        },
        { status: 409 },
      );
    }
  }

  const { data: createdFollowups, error: followupError } = await admin
    .from("followups")
    .insert(
      preparedFollowups.map((item) => ({
        academy_id: profile.academy_id,
        student_id: item.student.id,
        class_id: parsedRequest.classId,
        teacher_id: userId,
        reason: parsedRequest.reason,
        message_body: item.messageBody,
        recipient_type: parsedRequest.recipientType,
        status: "draft",
      })),
    )
    .select("id, student_id, status, created_at")
    .returns<CreatedFollowupRecord[]>();

  if (followupError) {
    return NextResponse.json({ error: followupError.message }, { status: 500 });
  }

  const followupByStudentId = new Map(
    (createdFollowups ?? []).map((followup) => [followup.student_id, followup]),
  );

  for (const item of preparedFollowups) {
    const followup = followupByStudentId.get(item.student.id);

    if (!followup) {
      continue;
    }

    const { error: attendanceUpdateError } = await admin
      .from("attendance_records")
      .update({
        followup_id: followup.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", item.attendanceRecord.id)
      .eq("academy_id", profile.academy_id);

    if (attendanceUpdateError) {
      return NextResponse.json({ error: attendanceUpdateError.message }, { status: 500 });
    }
  }

  const dryRun = settings?.sms_dry_run ?? process.env.SMS_DRY_RUN !== "false";
  const createdCount = createdFollowups?.length ?? 0;

  if (!parsedRequest.sendNow) {
    return NextResponse.json({
      targetStudentCount: students.length,
      savedFollowupCount: createdCount,
      messageLogCount: 0,
      dryRun,
      failedStudents: [],
    });
  }

  try {
    let messageLogCount = 0;

    if (dryRun) {
      for (const item of preparedFollowups) {
        const followup = followupByStudentId.get(item.student.id);

        if (!followup) {
          continue;
        }

        await saveMessageResult({
          admin,
          academyId: profile.academy_id,
          followupId: followup.id,
          recipients: item.recipients,
          status: "dry_run",
        });
        messageLogCount += item.recipients.length;
      }

      return NextResponse.json({
        targetStudentCount: students.length,
        savedFollowupCount: createdCount,
        messageLogCount,
        dryRun: true,
        failedStudents: [],
      });
    }

    for (const item of preparedFollowups) {
      const followup = followupByStudentId.get(item.student.id);

      if (!followup) {
        continue;
      }

      const sentRecipients = [];

      for (const recipient of item.recipients) {
        const result = await sendSms({ to: recipient.phone, text: item.messageBody });
        sentRecipients.push({
          ...recipient,
          providerMessageId: getProviderMessageId(result),
        });
      }

      await saveMessageResult({
        admin,
        academyId: profile.academy_id,
        followupId: followup.id,
        recipients: sentRecipients,
        status: "sent",
      });
      messageLogCount += sentRecipients.length;
    }

    return NextResponse.json({
      targetStudentCount: students.length,
      savedFollowupCount: createdCount,
      messageLogCount,
      dryRun: false,
      failedStudents: [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "일괄 문자 발송에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}

async function parseBulkAttendanceRequest(request: Request): Promise<
  | {
      ok: true;
      reason: AttendanceBulkReason;
      studentIds: string[];
      classId: string;
      attendanceDate: string;
      scheduledStartTime: string;
      scheduledEndTime: string;
      recipientType: MessageRecipientType;
      messageTemplate: string;
      sendNow: boolean;
    }
  | { ok: false; error: string }
> {
  let body: BulkAttendanceRequest;

  try {
    body = (await request.json()) as BulkAttendanceRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  if (body.reason !== "late" && body.reason !== "absence") {
    return { ok: false, error: "지각 또는 결석 문자만 일괄 처리할 수 있습니다." };
  }

  if (!Array.isArray(body.studentIds) || body.studentIds.length === 0) {
    return { ok: false, error: "선택한 학생이 없습니다." };
  }

  const studentIds = Array.from(
    new Set(
      body.studentIds.filter(
        (id): id is string => typeof id === "string" && id.length > 0,
      ),
    ),
  );

  if (studentIds.length === 0) {
    return { ok: false, error: "선택한 학생이 없습니다." };
  }

  if (studentIds.length > 50) {
    return { ok: false, error: "일괄 처리는 한 번에 50명까지 가능합니다." };
  }

  if (typeof body.classId !== "string" || body.classId.length === 0) {
    return { ok: false, error: "반 ID가 필요합니다." };
  }

  if (typeof body.attendanceDate !== "string" || body.attendanceDate.length === 0) {
    return { ok: false, error: "출석 날짜가 필요합니다." };
  }

  if (
    typeof body.scheduledStartTime !== "string" ||
    typeof body.scheduledEndTime !== "string" ||
    body.scheduledStartTime.length === 0 ||
    body.scheduledEndTime.length === 0
  ) {
    return { ok: false, error: "수업 시간이 필요합니다." };
  }

  const recipientType =
    body.recipientType === undefined ? "parent" : body.recipientType;

  if (!isMessageRecipientType(recipientType)) {
    return { ok: false, error: "지원하지 않는 문자 수신자입니다." };
  }

  if (typeof body.messageTemplate !== "string" || body.messageTemplate.trim().length === 0) {
    return { ok: false, error: "문자 본문이 필요합니다." };
  }

  return {
    ok: true,
    reason: body.reason,
    studentIds,
    classId: body.classId,
    attendanceDate: body.attendanceDate,
    scheduledStartTime: body.scheduledStartTime,
    scheduledEndTime: body.scheduledEndTime,
    recipientType,
    messageTemplate: body.messageTemplate,
    sendNow: body.sendNow === true,
  };
}

function validateBulkTargets({
  requestedStudentIds,
  students,
  attendanceRecords,
  attendanceStatus,
}: {
  requestedStudentIds: string[];
  students: StudentRecord[];
  attendanceRecords: AttendanceRecord[];
  attendanceStatus: "late" | "absent";
}) {
  const studentsById = new Map(students.map((student) => [student.id, student]));
  const attendanceByStudentId = new Map(
    attendanceRecords.map((record) => [record.student_id, record]),
  );
  const failedStudents: FailedStudent[] = [];

  requestedStudentIds.forEach((studentId) => {
    const student = studentsById.get(studentId);

    if (!student) {
      failedStudents.push({ studentId, reason: "학생을 찾을 수 없거나 권한이 없습니다." });
      return;
    }

    if (student.status !== "active") {
      failedStudents.push({
        studentId,
        studentName: student.name,
        reason: "비활성 학생은 일괄 문자 대상에 포함할 수 없습니다.",
      });
      return;
    }

    const attendanceRecord = attendanceByStudentId.get(studentId);

    if (!attendanceRecord || attendanceRecord.status !== attendanceStatus) {
      failedStudents.push({
        studentId,
        studentName: student.name,
        reason:
          attendanceStatus === "late"
            ? "지각으로 체크된 출석 기록이 없습니다."
            : "결석으로 체크된 출석 기록이 없습니다.",
      });
    }
  });

  return failedStudents;
}

function prepareFollowup({
  student,
  attendanceRecord,
  className,
  academyName,
  teacherName,
  messageTemplate,
  recipientType,
}: {
  student: StudentRecord;
  attendanceRecord: AttendanceRecord | undefined;
  className: string;
  academyName: string;
  teacherName: string;
  messageTemplate: string;
  recipientType: MessageRecipientType;
}): { ok: true; followup: PreparedFollowup } | { ok: false; failedStudent: FailedStudent } {
  if (!attendanceRecord) {
    return {
      ok: false,
      failedStudent: {
        studentId: student.id,
        studentName: student.name,
        reason: "연결할 출석 기록을 찾을 수 없습니다.",
      },
    };
  }

  const messageBody = normalizeMessageForSending(
    renderFollowupTemplate(messageTemplate, {
      academyName,
      studentName: student.name,
      teacherName,
      className,
    }),
  );
  const messageLengthError = getMessageLengthError(messageBody);

  if (messageLengthError) {
    return {
      ok: false,
      failedStudent: {
        studentId: student.id,
        studentName: student.name,
        reason: messageLengthError,
      },
    };
  }

  const recipients = getMessageRecipients({
    recipientType,
    parentPhone: student.parent_phone,
    studentPhone: student.student_phone,
  });

  if (recipients.length === 0) {
    return {
      ok: false,
      failedStudent: {
        studentId: student.id,
        studentName: student.name,
        reason: "발송 가능한 수신자 연락처가 없습니다.",
      },
    };
  }

  return {
    ok: true,
    followup: {
      student,
      attendanceRecord,
      messageBody,
      recipients,
    },
  };
}

async function validateDuplicateSends({
  admin,
  academyId,
  preparedFollowups,
  reason,
  recipientType,
  duplicateGuardMinutes,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  preparedFollowups: PreparedFollowup[];
  reason: AttendanceBulkReason;
  recipientType: MessageRecipientType;
  duplicateGuardMinutes: number;
}): Promise<
  | { ok: true; failedStudents: FailedStudent[]; duplicateGuardMinutes: number }
  | { ok: false; error: string }
> {
  const duplicateWindowStartedAt = getDuplicateWindowStartedAt(
    Math.max(0, duplicateGuardMinutes),
  );
  const failedStudents: FailedStudent[] = [];

  for (const item of preparedFollowups) {
    const { data, error } = await admin
      .from("followups")
      .select("id")
      .eq("academy_id", academyId)
      .eq("student_id", item.student.id)
      .eq("reason", reason)
      .eq("recipient_type", recipientType)
      .eq("status", "sent")
      .gte("sent_at", duplicateWindowStartedAt)
      .limit(1)
      .maybeSingle<{ id: string }>();

    if (error) {
      return { ok: false, error: error.message };
    }

    if (data) {
      failedStudents.push({
        studentId: item.student.id,
        studentName: item.student.name,
        reason: "최근 같은 사유와 수신자에게 발송한 기록이 있습니다.",
      });
    }
  }

  return {
    ok: true,
    failedStudents,
    duplicateGuardMinutes: Math.max(0, duplicateGuardMinutes),
  };
}

async function saveMessageResult({
  admin,
  academyId,
  followupId,
  recipients,
  status,
  errorMessage,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  followupId: string;
  recipients: Array<{
    recipientType: MessageRecipientType;
    phone: string;
    providerMessageId?: string;
  }>;
  status: "dry_run" | "sent" | "failed";
  errorMessage?: string;
}) {
  const followupStatus = status === "failed" ? "failed" : "sent";
  const sentAt = status === "failed" ? null : new Date().toISOString();

  const [logResult, followupResult] = await Promise.all([
    admin.from("message_logs").insert(
      recipients.map((recipient) => ({
        academy_id: academyId,
        followup_id: followupId,
        provider: "solapi",
        provider_message_id: recipient.providerMessageId ?? null,
        recipient_phone: recipient.phone,
        recipient_type: recipient.recipientType,
        status,
        error_message: errorMessage ?? null,
      })),
    ),
    admin
      .from("followups")
      .update({
        status: followupStatus,
        sent_at: sentAt,
      })
      .eq("id", followupId)
      .eq("academy_id", academyId),
  ]);

  if (logResult.error) {
    throw new Error(logResult.error.message);
  }

  if (followupResult.error) {
    throw new Error(followupResult.error.message);
  }
}

function getMessageRecipients({
  recipientType,
  parentPhone,
  studentPhone,
}: {
  recipientType: MessageRecipientType;
  parentPhone: string;
  studentPhone: string | null;
}) {
  const recipients: Array<{ recipientType: MessageRecipientType; phone: string }> = [];
  const normalizedParentPhone = normalizePhone(parentPhone);
  const normalizedStudentPhone = normalizePhone(studentPhone ?? "");

  if ((recipientType === "parent" || recipientType === "both") && normalizedParentPhone) {
    recipients.push({ recipientType: "parent", phone: normalizedParentPhone });
  }

  if ((recipientType === "student" || recipientType === "both") && normalizedStudentPhone) {
    recipients.push({ recipientType: "student", phone: normalizedStudentPhone });
  }

  return recipients;
}

function attendanceStatusForReason(reason: AttendanceBulkReason) {
  return reason === "late" ? "late" : "absent";
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 11) {
    return "";
  }

  return digits;
}

function getDuplicateWindowStartedAt(duplicateGuardMinutes: number) {
  const now = new Date();
  const guardWindowStart = new Date(now.getTime() - duplicateGuardMinutes * 60 * 1000);
  const todayStart = getKoreanDayStart(now);
  const earlierStart =
    todayStart.getTime() < guardWindowStart.getTime() ? todayStart : guardWindowStart;

  return earlierStart.toISOString();
}

function getKoreanDayStart(date: Date) {
  const koreanDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = koreanDateParts.find((part) => part.type === "year")?.value;
  const month = koreanDateParts.find((part) => part.type === "month")?.value;
  const day = koreanDateParts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date(date);
  }

  return new Date(`${year}-${month}-${day}T00:00:00+09:00`);
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
