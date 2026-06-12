import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SaveClassPayload = {
  classId?: string;
  name: string;
  subject: string;
  gradeLabel: string;
  teacherId: string;
};

export type SaveStudentPayload = {
  studentId?: string;
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

export type SaveStudentSchedulePayload = {
  scheduleId?: string;
  studentId: string;
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

export type SaveStudentScheduleResponse = {
  schedule?: {
    id: string;
  };
  error?: string;
};

export async function saveClass(payload: SaveClassPayload, mode: "create" | "edit") {
  await saveWithFallback({
    path: "/api/classes",
    method: mode === "create" ? "POST" : "PATCH",
    payload,
    fallbackError: "반 정보를 저장하지 못했습니다.",
  });
}

export async function saveStudent(payload: SaveStudentPayload, mode: "create" | "edit") {
  await saveWithFallback({
    path: "/api/students",
    method: mode === "create" ? "POST" : "PATCH",
    payload,
    fallbackError: "학생 정보를 저장하지 못했습니다.",
  });
}

export async function saveStudentSchedule(
  payload: SaveStudentSchedulePayload,
  mode: "create" | "edit",
) {
  return saveWithFallback<SaveStudentScheduleResponse>({
    path: "/api/student-schedules",
    method: mode === "create" ? "POST" : "PATCH",
    payload,
    fallbackError: payload.isActive ? "스케줄을 저장하지 못했습니다." : "스케줄을 삭제하지 못했습니다.",
  });
}

async function saveWithFallback<TResponse extends { error?: string } = { error?: string }>({
  path,
  method,
  payload,
  fallbackError,
}: {
  path: string;
  method: "POST" | "PATCH";
  payload: unknown;
  fallbackError: string;
}): Promise<TResponse> {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL(path, env.backendApiUrl), {
          method,
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as TResponse;

        if (response.ok) {
          return responsePayload;
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? fallbackError);
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json()) as TResponse;

  if (!response.ok) {
    throw new Error(responsePayload.error ?? fallbackError);
  }

  return responsePayload;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
