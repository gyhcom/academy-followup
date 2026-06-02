import { NextResponse } from "next/server";
import { isFollowupReason, type FollowupReason } from "@/lib/followup-templates";
import {
  isMessageRecipientType,
  type MessageRecipientType,
} from "@/lib/message-recipients";
import {
  getMessageLengthError,
  normalizeMessageForSending,
} from "@/lib/message-length";
import {
  getRouteWorkspace,
  getStudentForFollowupAccess,
} from "@/lib/server/route-workspace";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type CreateFollowupRequest = {
  studentId?: unknown;
  reason?: unknown;
  messageBody?: unknown;
  attendanceRecordId?: unknown;
  recipientType?: unknown;
};

type CreatedFollowupRecord = {
  id: string;
  status: string;
  created_at: string;
};

type AttendanceRecordForFollowup = {
  id: string;
  academy_id: string;
  student_id: string;
  class_id: string;
  status: string;
  followup_id: string | null;
};

type FollowupHistoryRecord = {
  id: string;
  reason: string;
  message_body: string;
  recipient_type: string;
  status: string;
  sent_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const { admin, profile } = workspaceResult.workspace;

  const studentId = new URL(request.url).searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "학생 ID가 필요합니다." }, { status: 400 });
  }

  const accessResult = await getStudentForFollowupAccess({
    workspace: workspaceResult.workspace,
    studentId,
    requireActiveStudent: false,
    permissionError: "이 학생의 연락 기록을 볼 권한이 없습니다.",
  });

  if (!accessResult.ok) {
    return NextResponse.json(
      { error: accessResult.error },
      { status: accessResult.status },
    );
  }

  const { data: followups, error: followupsError } = await admin
    .from("followups")
    .select("id, reason, message_body, recipient_type, status, sent_at, created_at")
    .eq("academy_id", profile.academy_id)
    .eq("student_id", accessResult.student.id)
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<FollowupHistoryRecord[]>();

  if (followupsError) {
    return NextResponse.json({ error: followupsError.message }, { status: 500 });
  }

  return NextResponse.json({
    followups: (followups ?? []).map((followup) => ({
      id: followup.id,
      reason: followup.reason,
      messageBody: followup.message_body,
      recipientType: followup.recipient_type,
      status: followup.status,
      sentAt: followup.sent_at,
      createdAt: followup.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const { admin, profile, userId } = workspaceResult.workspace;

  const parsedRequest = await parseCreateFollowupRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const accessResult = await getStudentForFollowupAccess({
    workspace: workspaceResult.workspace,
    studentId: parsedRequest.studentId,
    requireActiveStudent: true,
    inactiveError: "비활성 학생은 연락 기록을 만들 수 없습니다.",
    permissionError: "이 학생의 연락 기록을 만들 권한이 없습니다.",
  });

  if (!accessResult.ok) {
    return NextResponse.json(
      { error: accessResult.error },
      { status: accessResult.status },
    );
  }

  const attendanceRecord = await getAttendanceRecordForFollowup({
    admin,
    academyId: profile.academy_id,
    attendanceRecordId: parsedRequest.attendanceRecordId,
  });

  if (!attendanceRecord.ok) {
    return NextResponse.json(
      { error: attendanceRecord.error },
      { status: attendanceRecord.status },
    );
  }

  if (
    attendanceRecord.data &&
    (attendanceRecord.data.student_id !== accessResult.student.id ||
      attendanceRecord.data.class_id !== accessResult.student.class_id)
  ) {
    return NextResponse.json(
      { error: "출석 기록과 팔로업 대상 학생 정보가 일치하지 않습니다." },
      { status: 400 },
    );
  }

  const { data: followup, error: followupError } = await admin
    .from("followups")
    .insert({
      academy_id: profile.academy_id,
      student_id: accessResult.student.id,
      class_id: accessResult.student.class_id,
      teacher_id: userId,
      reason: parsedRequest.reason,
      message_body: parsedRequest.messageBody,
      recipient_type: parsedRequest.recipientType,
      status: "draft",
    })
    .select("id, status, created_at")
    .single<CreatedFollowupRecord>();

  if (followupError) {
    return NextResponse.json({ error: followupError.message }, { status: 500 });
  }

  if (attendanceRecord.data) {
    const { error: attendanceUpdateError } = await admin
      .from("attendance_records")
      .update({
        followup_id: followup.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attendanceRecord.data.id)
      .eq("academy_id", profile.academy_id);

    if (attendanceUpdateError) {
      return NextResponse.json({ error: attendanceUpdateError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    followup: {
      id: followup.id,
      status: followup.status,
      createdAt: followup.created_at,
      attendanceRecordId: attendanceRecord.data?.id ?? null,
    },
  });
}

async function parseCreateFollowupRequest(request: Request): Promise<
  | {
      ok: true;
      studentId: string;
      reason: FollowupReason;
      messageBody: string;
      recipientType: MessageRecipientType;
      attendanceRecordId: string | null;
    }
  | { ok: false; error: string }
> {
  let body: CreateFollowupRequest;

  try {
    body = (await request.json()) as CreateFollowupRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  if (typeof body.studentId !== "string" || body.studentId.length === 0) {
    return { ok: false, error: "학생 ID가 필요합니다." };
  }

  if (!isFollowupReason(body.reason)) {
    return { ok: false, error: "지원하지 않는 연락 사유입니다." };
  }

  if (typeof body.messageBody !== "string" || body.messageBody.trim().length === 0) {
    return { ok: false, error: "저장할 문자 본문이 필요합니다." };
  }

  const messageBody = normalizeMessageForSending(body.messageBody);
  const messageLengthError = getMessageLengthError(messageBody);

  if (messageLengthError) {
    return { ok: false, error: messageLengthError };
  }

  const recipientType =
    body.recipientType === undefined ? "parent" : body.recipientType;

  if (!isMessageRecipientType(recipientType)) {
    return { ok: false, error: "지원하지 않는 문자 수신자입니다." };
  }

  if (
    body.attendanceRecordId !== undefined &&
    (typeof body.attendanceRecordId !== "string" ||
      body.attendanceRecordId.trim().length === 0)
  ) {
    return { ok: false, error: "출석 기록 ID 형식이 올바르지 않습니다." };
  }

  const attendanceRecordId =
    typeof body.attendanceRecordId === "string" ? body.attendanceRecordId.trim() : null;

  return {
    ok: true,
    studentId: body.studentId,
    reason: body.reason,
    messageBody,
    recipientType,
    attendanceRecordId,
  };
}

async function getAttendanceRecordForFollowup({
  admin,
  academyId,
  attendanceRecordId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  attendanceRecordId: string | null;
}): Promise<
  | { ok: true; data: AttendanceRecordForFollowup | null }
  | { ok: false; status: number; error: string }
> {
  if (!attendanceRecordId) {
    return { ok: true, data: null };
  }

  const { data, error } = await admin
    .from("attendance_records")
    .select("id, academy_id, student_id, class_id, status, followup_id")
    .eq("id", attendanceRecordId)
    .eq("academy_id", academyId)
    .maybeSingle<AttendanceRecordForFollowup>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!data) {
    return { ok: false, status: 404, error: "연결할 출석 기록을 찾을 수 없습니다." };
  }

  if (data.status !== "absent" && data.status !== "late") {
    return {
      ok: false,
      status: 400,
      error: "결석 또는 지각 출석 기록만 문자 팔로업과 연결할 수 있습니다.",
    };
  }

  return { ok: true, data };
}
