import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type PlatformAcademyPayload = {
  action: "create" | "update_status";
  academyId?: string;
  name?: string;
  slug?: string;
  category?: string;
  plan?: string;
  status?: string;
  ownerEmail?: string;
  ownerName?: string;
  ownerPassword?: string;
};

export type PlatformAcademyResponse = {
  message?: string;
  academy?: unknown;
  error?: string;
};

export async function savePlatformAcademy(payload: PlatformAcademyPayload) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/platform/academies", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as PlatformAcademyResponse;

        if (response.ok) {
          return responsePayload;
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? "플랫폼 학원 정보를 저장하지 못했습니다.");
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/platform/academies", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const fallbackPayload = (await response.json()) as PlatformAcademyResponse;

  if (!response.ok) {
    throw new Error(fallbackPayload.error ?? "플랫폼 학원 정보를 저장하지 못했습니다.");
  }

  return fallbackPayload;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
