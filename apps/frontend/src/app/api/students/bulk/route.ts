import { NextResponse } from "next/server";
import { canManageAcademy } from "@/lib/permissions";
import {
  syncAutomaticScheduleLinks,
  type ShareableStudentRecord,
} from "@/lib/server/automatic-schedule-sharing";
import {
  type StudentImportDraft,
  validateStudentImportDrafts,
} from "@/lib/student-import";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

const maxImportRows = 300;

type BulkStudentRequest = {
  rows?: unknown;
};

type ProfileRecord = {
  role: string;
  academy_id: string;
};

type ClassRecord = {
  id: string;
  name: string;
};

type ExistingStudentRecord = {
  name: string;
  parent_phone: string;
};

type InsertedStudentRecord = ShareableStudentRecord & {
  id: string;
};

export async function POST(request: Request) {
  const workspace = await getAuthorizedWorkspace();

  if (!workspace.ok) {
    return NextResponse.json({ error: workspace.error }, { status: workspace.status });
  }

  const parsedRequest = await parseBulkStudentRequest(request);

  if (!parsedRequest.ok) {
    return NextResponse.json({ error: parsedRequest.error }, { status: 400 });
  }

  const { data: classes, error: classError } = await workspace.admin
    .from("classes")
    .select("id, name")
    .eq("academy_id", workspace.profile.academy_id)
    .returns<ClassRecord[]>();

  if (classError) {
    return NextResponse.json({ error: classError.message }, { status: 500 });
  }

  const validation = validateStudentImportDrafts(parsedRequest.rows, classes ?? []);

  if (validation.validRows.length === 0) {
    return NextResponse.json(
      {
        error: "등록 가능한 학생이 없습니다.",
        invalidRows: validation.invalidRows.slice(0, 30),
      },
      { status: 400 },
    );
  }

  const { data: existingStudents, error: existingError } = await workspace.admin
    .from("students")
    .select("name, parent_phone")
    .eq("academy_id", workspace.profile.academy_id)
    .returns<ExistingStudentRecord[]>();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existingKeys = new Set(
    (existingStudents ?? []).map(
      (student) => `${student.name.trim()}:${student.parent_phone.trim()}`,
    ),
  );
  const rowsToInsert = validation.validRows.filter(
    (row) => !existingKeys.has(`${row.name}:${row.normalizedParentPhone}`),
  );
  const duplicateCount = validation.validRows.length - rowsToInsert.length;

  if (rowsToInsert.length === 0) {
    return NextResponse.json(
      {
        error: "이미 등록된 학생만 포함되어 있습니다.",
        insertedCount: 0,
        duplicateCount,
        invalidCount: validation.invalidRows.length,
      },
      { status: 409 },
    );
  }

  const { data, error } = await workspace.admin
    .from("students")
    .insert(
      rowsToInsert.map((row) => ({
        academy_id: workspace.profile.academy_id,
        class_id: row.classId,
        name: row.name,
        school_name: row.schoolName || null,
        grade_label: row.gradeLabel || null,
        parent_name: row.parentName || null,
        parent_phone: row.normalizedParentPhone,
        student_phone: row.normalizedStudentPhone,
        schedule_share_consent_confirmed: row.scheduleShareConsentConfirmed,
        schedule_share_consent_confirmed_at: row.scheduleShareConsentConfirmed
          ? new Date().toISOString()
          : null,
        schedule_share_consent_confirmed_by: row.scheduleShareConsentConfirmed
          ? workspace.userId
          : null,
        status: row.status,
      })),
    )
    .select(
      "id, academy_id, name, school_name, grade_label, parent_phone, student_phone, schedule_share_consent_confirmed",
    )
    .returns<InsertedStudentRecord[]>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const student of data ?? []) {
    const syncResult = await syncAutomaticScheduleLinks({
      admin: workspace.admin,
      student,
      userId: workspace.userId,
    });

    if (!syncResult.ok) {
      return NextResponse.json({ error: syncResult.error }, { status: 500 });
    }
  }

  return NextResponse.json({
    insertedCount: data?.length ?? rowsToInsert.length,
    duplicateCount,
    invalidCount: validation.invalidRows.length,
    totalRows: validation.rows.length,
    message: `학생 ${data?.length ?? rowsToInsert.length}명을 등록했습니다.`,
  });
}

async function getAuthorizedWorkspace(): Promise<
  | {
      ok: true;
      admin: ReturnType<typeof createSupabaseAdminClient>;
      profile: ProfileRecord;
      userId: string;
    }
  | { ok: false; status: number; error: string }
> {
  if (!hasSupabaseServerEnv()) {
    return { ok: false, status: 500, error: "Supabase 세션 환경변수가 설정되지 않았습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  if (!hasSupabaseAdminEnv()) {
    return { ok: false, status: 500, error: "서버 전용 Supabase 키가 설정되지 않았습니다." };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .maybeSingle<ProfileRecord>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!profile) {
    return { ok: false, status: 403, error: "학원 워크스페이스 연결이 필요합니다." };
  }

  if (!canManageAcademy(profile.role)) {
    return { ok: false, status: 403, error: "학생 일괄 등록은 원장 또는 관리자만 할 수 있습니다." };
  }

  return { ok: true, admin, profile, userId: user.id };
}

async function parseBulkStudentRequest(
  request: Request,
): Promise<{ ok: true; rows: StudentImportDraft[] } | { ok: false; error: string }> {
  let body: BulkStudentRequest;

  try {
    body = (await request.json()) as BulkStudentRequest;
  } catch {
    return { ok: false, error: "요청 본문을 읽을 수 없습니다." };
  }

  if (!Array.isArray(body.rows)) {
    return { ok: false, error: "등록할 학생 목록이 필요합니다." };
  }

  if (body.rows.length > maxImportRows) {
    return { ok: false, error: `한 번에 ${maxImportRows}명까지만 등록할 수 있습니다.` };
  }

  const rows = body.rows.map((row, index) => toStudentImportDraft(row, index + 1));

  return { ok: true, rows };
}

function toStudentImportDraft(value: unknown, fallbackRowNumber: number): StudentImportDraft {
  const row = isRecord(value) ? value : {};

  return {
    rowNumber: typeof row.rowNumber === "number" ? row.rowNumber : fallbackRowNumber,
    name: toText(row.name),
    className: toText(row.className),
    schoolName: toText(row.schoolName),
    gradeLabel: toText(row.gradeLabel),
    parentName: toText(row.parentName),
    parentPhone: toText(row.parentPhone),
    studentPhone: toText(row.studentPhone),
    scheduleShareConsentConfirmed:
      row.scheduleShareConsentConfirmed === true
        ? "동의"
        : toText(row.scheduleShareConsentConfirmed),
    status: toText(row.status),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toText(value: unknown) {
  return typeof value === "string" ? value : "";
}
