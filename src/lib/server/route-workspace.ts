import { canAccessAssignedClass } from "@/lib/permissions";
import { hasSupabaseAdminEnv, createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createSupabaseServerClient,
  hasSupabaseServerEnv,
} from "@/lib/supabase/server";

export type RouteWorkspaceProfile = {
  role: string;
  academy_id: string;
};

export type RouteWorkspaceContext = {
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  profile: RouteWorkspaceProfile;
};

export type FollowupAccessStudent = {
  id: string;
  academy_id: string;
  class_id: string | null;
  name: string;
  status: string;
};

export type FollowupAccessClass = {
  id: string;
  academy_id: string;
  name: string;
  teacher_id: string | null;
};

export async function getRouteWorkspace(): Promise<
  | { ok: true; workspace: RouteWorkspaceContext }
  | { ok: false; status: number; error: string }
> {
  if (!hasSupabaseServerEnv()) {
    return {
      ok: false,
      status: 500,
      error: "Supabase 세션 환경변수가 설정되지 않았습니다.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: "로그인이 필요합니다." };
  }

  if (!hasSupabaseAdminEnv()) {
    return {
      ok: false,
      status: 500,
      error: "서버 전용 Supabase 키가 설정되지 않았습니다.",
    };
  }

  const admin = createSupabaseAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select("role, academy_id")
    .eq("id", user.id)
    .maybeSingle<RouteWorkspaceProfile>();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }

  if (!profile) {
    return {
      ok: false,
      status: 403,
      error: "학원 워크스페이스 연결이 필요합니다.",
    };
  }

  return {
    ok: true,
    workspace: {
      admin,
      userId: user.id,
      profile,
    },
  };
}

export async function getStudentForFollowupAccess({
  workspace,
  studentId,
  requireActiveStudent,
  permissionError,
  inactiveError,
}: {
  workspace: RouteWorkspaceContext;
  studentId: string;
  requireActiveStudent: boolean;
  permissionError: string;
  inactiveError?: string;
}): Promise<
  | {
      ok: true;
      student: FollowupAccessStudent;
      classRecord: FollowupAccessClass | null;
    }
  | { ok: false; status: number; error: string }
> {
  const { data: student, error: studentError } = await workspace.admin
    .from("students")
    .select("id, academy_id, class_id, name, status")
    .eq("id", studentId)
    .eq("academy_id", workspace.profile.academy_id)
    .maybeSingle<FollowupAccessStudent>();

  if (studentError) {
    return { ok: false, status: 500, error: studentError.message };
  }

  if (!student) {
    return { ok: false, status: 404, error: "선택한 학생을 찾을 수 없습니다." };
  }

  if (requireActiveStudent && student.status !== "active") {
    return {
      ok: false,
      status: 403,
      error: inactiveError ?? "비활성 학생은 처리할 수 없습니다.",
    };
  }

  const classRecord = await getStudentClass({
    workspace,
    classId: student.class_id,
  });

  if (!classRecord.ok) {
    return { ok: false, status: 500, error: classRecord.error };
  }

  if (
    !canAccessAssignedClass({
      role: workspace.profile.role,
      classTeacherId: classRecord.data?.teacher_id ?? null,
      userId: workspace.userId,
    })
  ) {
    return { ok: false, status: 403, error: permissionError };
  }

  return { ok: true, student, classRecord: classRecord.data };
}

async function getStudentClass({
  workspace,
  classId,
}: {
  workspace: RouteWorkspaceContext;
  classId: string | null;
}): Promise<{ ok: true; data: FollowupAccessClass | null } | { ok: false; error: string }> {
  if (!classId) {
    return { ok: true, data: null };
  }

  const { data, error } = await workspace.admin
    .from("classes")
    .select("id, academy_id, name, teacher_id")
    .eq("id", classId)
    .eq("academy_id", workspace.profile.academy_id)
    .maybeSingle<FollowupAccessClass>();

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, data: data ?? null };
}
