import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SharedScheduleResponse = {
  error?: string;
  canManage?: boolean;
  links?: Array<{
    id: string;
    academyName: string;
    connectedAt: string;
    schedules: Array<{
      id: string;
      academyName: string;
      scheduleType: string;
      scheduleDate: string | null;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      subject: string | null;
      title: string;
    }>;
  }>;
  code?: string;
  expiresAt?: string;
  message?: string;
};

export async function fetchStudentScheduleSharing(studentId: string, signal?: AbortSignal) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const backendUrl = new URL("/api/student-schedule-sharing", env.backendApiUrl);
        backendUrl.searchParams.set("studentId", studentId);
        const response = await fetch(backendUrl.toString(), {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
        });
        const payload = (await response.json()) as SharedScheduleResponse;

        if (response.ok) {
          return payload;
        }

        if (response.status < 500) {
          throw new Error(payload.error ?? "공유 스케줄을 불러오지 못했습니다.");
        }
      }
    } catch (error) {
      if (signal?.aborted || !(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch(`/api/student-schedule-sharing?studentId=${studentId}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as SharedScheduleResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "공유 스케줄을 불러오지 못했습니다.");
  }

  return payload;
}

export async function postStudentScheduleSharing(body: Record<string, string>) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/student-schedule-sharing", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const payload = (await response.json()) as SharedScheduleResponse;

        if (response.ok) {
          return payload;
        }

        if (response.status < 500) {
          throw new Error(payload.error ?? "스케줄 공유 요청을 처리하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/student-schedule-sharing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as SharedScheduleResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "스케줄 공유 요청을 처리하지 못했습니다.");
  }

  return payload;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
