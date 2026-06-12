import { env } from "@/lib/env";
import type { MessageRecipientType } from "@/lib/message-recipients";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type BulkMessagePreviewPayload = {
  targetType: "all" | "class" | "grade";
  classId?: string;
  gradeLabel?: string;
  recipientType: MessageRecipientType;
  excludeDuplicateRecipients: boolean;
};

export type BulkMessagePreviewResult = {
  targetStudentCount?: number;
  candidateRecipientCount?: number;
  recipientCount?: number;
  duplicateExcludedCount?: number;
  error?: string;
};

export async function fetchBulkMessagePreview(
  payload: BulkMessagePreviewPayload,
  signal: AbortSignal,
) {
  if (env.backendApiUrl) {
    try {
      const supabase = createSupabaseBrowserClient();
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;

      if (accessToken) {
        const response = await fetch(new URL("/api/bulk-messages/preview", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal,
        });
        const backendPayload = (await response.json()) as BulkMessagePreviewResult;

        if (response.ok) {
          return backendPayload;
        }
      }
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/bulk-messages/preview", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal,
  });
  const fallbackPayload = (await response.json()) as BulkMessagePreviewResult;

  if (!response.ok) {
    throw new Error(fallbackPayload.error ?? "전체문자 대상을 확인하지 못했습니다.");
  }

  return fallbackPayload;
}
