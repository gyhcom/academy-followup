import { NextResponse } from "next/server";
import { isFollowupReason, type FollowupReason } from "@/lib/followup-templates";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

type CreateFollowupRequest = {
  studentId?: unknown;
  reason?: unknown;
  messageBody?: unknown;
  attendanceRecordId?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type StudentRecord = {
  id: string;
  academy_id: string;
  class_id: string | null;
  status: string;
};

type ClassRecord = {
  id: string;
  academy_id: string;
  teacher_id: string | null;
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
  status: string;
  sent_at: string | null;
  created_at: string;
};

export async function GET(request: Request) {
  const studentId = new URL(request.url).searchParams.get("studentId");

  if (!studentId) {
    return NextResponse.json({ error: "학생 ID가 필요합니다." }, { status: 400 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase 세션 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { error: "서버 전용 Supabase 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json(
      { error: "학원 워크스페이스 연결이 필요합니다." },
      { status: 403 },
    );
  }

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, academy_id, class_id, status")
    .eq("id", studentId)
    .eq("academy_id", profile.academy_id)
    .maybeSingle<StudentRecord>();

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  if (!student) {
    return NextResponse.json(
      { error: "선택한 학생을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const classRecord = await getStudentClass({
    admin,
    academyId: profile.academy_id,
    classId: student.class_id,
  });

  if (classRecord.error) {
    return NextResponse.json({ error: classRecord.error }, { status: 500 });
  }

  if (!canCreateFollowup(profile.role, classRecord.data, user.id)) {
    return NextResponse.json(
      { error: "이 학생의 팔로업 기록을 볼 권한이 없습니다." },
      { status: 403 },
    );
  }

  const { data: followups, error: followupsError } = await admin
    .from("followups")
    .select("id, reason, message_body, status, sent_at, created_at")
    .eq("academy_id", profile.academy_id)
    .eq("student_id", student.id)
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
      status: followup.status,
      sentAt: followup.sent_at,
      createdAt: followup.created_at,
    })),
  });
}

export async function POST(request: Request) {
  const parsedRequest = await parseCreateFollowupRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  if (!hasSupabaseServerEnv()) {
    return NextResponse.json(
      { error: "Supabase 세션 환경변수가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json(
      { error: "서버 전용 Supabase 키가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  if (!profile) {
    return NextResponse.json(
      { error: "학원 워크스페이스 연결이 필요합니다." },
      { status: 403 },
    );
  }

  const { data: student, error: studentError } = await admin
    .from("students")
    .select("id, academy_id, class_id, status")
    .eq("id", parsedRequest.studentId)
    .eq("academy_id", profile.academy_id)
    .maybeSingle<StudentRecord>();

  if (studentError) {
    return NextResponse.json({ error: studentError.message }, { status: 500 });
  }

  if (!student) {
    return NextResponse.json(
      { error: "선택한 학생을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (student.status !== "active") {
    return NextResponse.json(
      { error: "비활성 학생은 팔로업 기록을 만들 수 없습니다." },
      { status: 403 },
    );
  }

  const classRecord = await getStudentClass({
    admin,
    academyId: profile.academy_id,
    classId: student.class_id,
  });

  if (classRecord.error) {
    return NextResponse.json({ error: classRecord.error }, { status: 500 });
  }

  if (!canCreateFollowup(profile.role, classRecord.data, user.id)) {
    return NextResponse.json(
      { error: "이 학생의 팔로업 기록을 만들 권한이 없습니다." },
      { status: 403 },
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
    (attendanceRecord.data.student_id !== student.id ||
      attendanceRecord.data.class_id !== student.class_id)
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
      student_id: student.id,
      class_id: student.class_id,
      teacher_id: user.id,
      reason: parsedRequest.reason,
      message_body: parsedRequest.messageBody,
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
    return { ok: false, error: "지원하지 않는 팔로업 사유입니다." };
  }

  if (typeof body.messageBody !== "string" || body.messageBody.trim().length === 0) {
    return { ok: false, error: "저장할 문자 본문이 필요합니다." };
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
    messageBody: body.messageBody.trim(),
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

async function getStudentClass({
  admin,
  academyId,
  classId,
}: {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  academyId: string;
  classId: string | null;
}): Promise<{ data: ClassRecord | null; error: string | null }> {
  if (!classId) {
    return { data: null, error: null };
  }

  const { data, error } = await admin
    .from("classes")
    .select("id, academy_id, teacher_id")
    .eq("id", classId)
    .eq("academy_id", academyId)
    .maybeSingle<ClassRecord>();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

function canCreateFollowup(
  role: string,
  classRecord: ClassRecord | null,
  userId: string,
) {
  if (role === "owner" || role === "manager") {
    return true;
  }

  return classRecord?.teacher_id === userId;
}
