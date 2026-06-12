import { env } from "@/lib/env";
import type { FollowupReason } from "@/lib/followup-templates";
import type { MessageRecipientType } from "@/lib/message-recipients";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type FollowupHistoryItem = {
  id: string;
  reason: string;
  messageBody: string;
  recipientType?: string;
  status: string;
  sentAt: string | null;
  createdAt: string;
};

export type FollowupHistoryResponse = {
  followups?: FollowupHistoryItem[];
  error?: string;
};

export type CreateFollowupPayload = {
  studentId: string;
  reason: FollowupReason;
  messageBody: string;
  attendanceRecordId?: string | null;
  recipientType: MessageRecipientType;
};

export type CreateFollowupResponse = {
  followup?: {
    id: string;
    status: string;
    createdAt: string;
    attendanceRecordId?: string | null;
  };
  error?: string;
};

export type CreateFollowupSuccess = {
  followup: NonNullable<CreateFollowupResponse["followup"]>;
};

export async function fetchFollowupHistory(studentId: string, signal?: AbortSignal) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const backendUrl = new URL("/api/followups", env.backendApiUrl);
        backendUrl.searchParams.set("studentId", studentId);
        const response = await fetch(backendUrl.toString(), {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
        });
        const payload = (await response.json()) as FollowupHistoryResponse;

        if (response.ok) {
          return payload;
        }

        if (response.status < 500) {
          throw new Error(payload.error ?? "연락 기록을 불러오지 못했습니다.");
        }
      }
    } catch (error) {
      if (signal?.aborted || !(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch(`/api/followups?studentId=${studentId}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as FollowupHistoryResponse;

  if (!response.ok) {
    throw new Error(payload.error ?? "연락 기록을 불러오지 못했습니다.");
  }

  return payload;
}

export async function createFollowup(
  payload: CreateFollowupPayload,
): Promise<CreateFollowupSuccess> {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/followups", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as CreateFollowupResponse;

        if (response.ok && responsePayload.followup) {
          return { followup: responsePayload.followup };
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? "연락 기록을 저장하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/followups", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json()) as CreateFollowupResponse;

  if (!response.ok || !responsePayload.followup) {
    throw new Error(responsePayload.error ?? "연락 기록을 저장하지 못했습니다.");
  }

  return { followup: responsePayload.followup };
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
