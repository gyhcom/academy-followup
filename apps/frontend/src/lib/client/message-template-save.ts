import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SaveMessageTemplatePayload = {
  reason: string;
  title: string;
  body: string;
  isActive: boolean;
};

export async function saveMessageTemplate(payload: SaveMessageTemplatePayload) {
  if (env.backendApiUrl) {
    try {
      const supabase = createSupabaseBrowserClient();
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;

      if (accessToken) {
        const response = await fetch(new URL("/api/message-templates", env.backendApiUrl), {
          method: "PATCH",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const backendPayload = (await response.json()) as { error?: string };

        if (response.ok) {
          return;
        }

        if (response.status < 500) {
          throw new Error(backendPayload.error ?? "문자 템플릿을 저장하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/message-templates", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const fallbackPayload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(fallbackPayload.error ?? "문자 템플릿을 저장하지 못했습니다.");
  }
}
