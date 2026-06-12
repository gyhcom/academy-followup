import { env } from "@/lib/env";
import type { MessageRecipientType } from "@/lib/message-recipients";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type BulkMessageSendPayload = {
  targetType: "all" | "class" | "grade";
  classId?: string;
  gradeLabel?: string;
  recipientType: MessageRecipientType;
  messageBody: string;
  excludeDuplicateRecipients: boolean;
};

export type BulkMessageSendResult = {
  dryRun?: boolean;
  message?: string;
  targetStudentCount?: number;
  candidateRecipientCount?: number;
  recipientCount?: number;
  duplicateExcludedCount?: number;
  error?: string;
};

export async function sendBulkMessage(payload: BulkMessageSendPayload) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/bulk-messages/send", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as BulkMessageSendResult;

        if (response.ok) {
          return responsePayload;
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? "전체문자를 처리하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/bulk-messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const fallbackPayload = (await response.json()) as BulkMessageSendResult;

  if (!response.ok) {
    throw new Error(fallbackPayload.error ?? "전체문자를 처리하지 못했습니다.");
  }

  return fallbackPayload;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
