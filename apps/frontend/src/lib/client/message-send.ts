import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SendMessageResponse = {
  dryRun?: boolean;
  message?: string;
  recipientPhone?: string;
  recipientCount?: number;
  followupId?: string;
  duplicate?: boolean;
  duplicateGuardMinutes?: number;
  error?: string;
};

export class MessageSendError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "MessageSendError";
    this.status = status;
  }
}

export async function sendFollowupMessage(followupId: string) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/messages/send", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ followupId }),
        });
        const payload = (await response.json()) as SendMessageResponse;

        if (response.ok) {
          return payload;
        }

        if (response.status < 500) {
          throw new MessageSendError(errorMessage(response.status, payload), response.status);
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/messages/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ followupId }),
  });
  const payload = (await response.json()) as SendMessageResponse;

  if (!response.ok) {
    throw new MessageSendError(errorMessage(response.status, payload), response.status);
  }

  return payload;
}

function errorMessage(status: number, payload: SendMessageResponse) {
  if (status === 403) {
    return "발송 권한이 없습니다. 담당 반 또는 발송 권한을 확인해 주세요.";
  }

  return payload.error ?? "문자를 발송하지 못했습니다.";
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
