import { env } from "@/lib/env";
import type { FollowupReason } from "@/lib/followup-templates";
import type { getMessageLengthMetrics } from "@/lib/message-length";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type MessagePreviewPayload = {
  studentId: string;
  reason: FollowupReason;
  makeupCandidateTime?: string | null;
};

export type MessagePreviewResult = {
  title?: string;
  body?: string;
  metrics?: ReturnType<typeof getMessageLengthMetrics>;
  error?: string;
};

export type MessagePreviewSuccess = Omit<MessagePreviewResult, "body"> & {
  body: string;
};

export async function fetchMessagePreview(
  payload: MessagePreviewPayload,
  signal: AbortSignal,
): Promise<MessagePreviewSuccess> {
  if (env.backendApiUrl) {
    try {
      const supabase = createSupabaseBrowserClient();
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;

      if (accessToken) {
        const response = await fetch(new URL("/api/messages/preview", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal,
        });
        const backendPayload = (await response.json()) as MessagePreviewResult;

        if (response.ok && backendPayload.body) {
          return { ...backendPayload, body: backendPayload.body };
        }
      }
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/messages/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
  const fallbackPayload = (await response.json()) as MessagePreviewResult;

  if (!response.ok || !fallbackPayload.body) {
    throw new Error(fallbackPayload.error ?? "문자 미리보기를 만들지 못했습니다.");
  }

  return { ...fallbackPayload, body: fallbackPayload.body };
}
