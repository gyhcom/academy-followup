import { env } from "@/lib/env";
import type { AttendanceStatus } from "@/lib/attendance";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AttendanceRecordItem = {
  id: string;
  studentId: string;
  classId: string;
  teacherId: string | null;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: string;
  checkedAt: string | null;
  arrivedAt: string | null;
  note: string | null;
  followupId: string | null;
  followupStatus: string | null;
  followupSentAt: string | null;
};

export type AttendanceApiResponse = {
  records?: AttendanceRecordItem[];
  record?: AttendanceRecordItem;
  error?: string;
};

export type SaveAttendanceResponse = {
  record: AttendanceRecordItem;
};

export type SaveAttendancePayload = {
  studentId: string;
  classId: string;
  attendanceDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  status: AttendanceStatus;
  note: string | null;
};

export async function fetchAttendanceRecords(date: string, signal?: AbortSignal) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const backendUrl = new URL("/api/attendance", env.backendApiUrl);
        backendUrl.searchParams.set("date", date);
        const response = await fetch(backendUrl.toString(), {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
        });
        const payload = (await response.json()) as AttendanceApiResponse;

        if (response.ok) {
          return payload;
        }

        if (response.status < 500) {
          throw new Error(payload.error ?? "출석 기록을 불러오지 못했습니다.");
        }
      }
    } catch (error) {
      if (signal?.aborted || !(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch(`/api/attendance?date=${encodeURIComponent(date)}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as AttendanceApiResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "출석 기록을 불러오지 못했습니다.");
  }

  return payload;
}

export async function saveAttendanceRecord(payload: SaveAttendancePayload): Promise<SaveAttendanceResponse> {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/attendance", env.backendApiUrl), {
          method: "PATCH",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as AttendanceApiResponse;

        if (response.ok && responsePayload.record) {
          return { record: responsePayload.record };
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? "출석 상태를 저장하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/attendance", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json()) as AttendanceApiResponse;

  if (!response.ok || !responsePayload.record) {
    throw new Error(responsePayload.error ?? "출석 상태를 저장하지 못했습니다.");
  }

  return { record: responsePayload.record };
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
