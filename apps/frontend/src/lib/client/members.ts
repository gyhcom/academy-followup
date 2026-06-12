import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type SaveMemberPayload = {
  memberId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  password: string;
};

export async function saveMember(payload: SaveMemberPayload, mode: "create" | "edit") {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/members", env.backendApiUrl), {
          method: mode === "create" ? "POST" : "PATCH",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as { error?: string };

        if (response.ok) {
          return;
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? "구성원 정보를 저장하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/members", {
    method: mode === "create" ? "POST" : "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(responsePayload.error ?? "구성원 정보를 저장하지 못했습니다.");
  }
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
