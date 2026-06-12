import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ExternalAcademyClassPayload = {
  action: "create_class_and_enroll" | "deactivate_enrollment";
  studentId?: string;
  enrollmentId?: string;
  academyName?: string;
  classTitle?: string;
  subject?: string;
  scheduleDate?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  memo?: string;
};

export type ExternalAcademyClassResponse = {
  error?: string;
  message?: string;
  enrollmentId?: string;
};

export async function saveExternalAcademyClass(payload: ExternalAcademyClassPayload) {
  return postWithFallback(payload, "타 학원 수업을 저장하지 못했습니다.");
}

async function postWithFallback(payload: ExternalAcademyClassPayload, fallbackError: string) {
  if (env.backendApiUrl) {
    try {
      const accessToken = await getAccessToken();

      if (accessToken) {
        const response = await fetch(new URL("/api/external-academy-classes", env.backendApiUrl), {
          method: "POST",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        const responsePayload = (await response.json()) as ExternalAcademyClassResponse;

        if (response.ok) {
          return responsePayload;
        }

        if (response.status < 500) {
          throw new Error(responsePayload.error ?? fallbackError);
        }
      }
    } catch (error) {
      if (!(error instanceof TypeError)) {
        throw error;
      }
    }
  }

  const response = await fetch("/api/external-academy-classes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const responsePayload = (await response.json()) as ExternalAcademyClassResponse;

  if (!response.ok) {
    throw new Error(responsePayload.error ?? fallbackError);
  }

  return responsePayload;
}

async function getAccessToken() {
  const supabase = createSupabaseBrowserClient();
  const sessionResult = await supabase.auth.getSession();

  return sessionResult.data.session?.access_token ?? null;
}
