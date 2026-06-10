import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ReportRange = "today" | "7d" | "month";

export type ReportSummary = {
  range: ReportRange;
  label: string;
  attendance: {
    total: number;
    present: number;
    late: number;
    absent: number;
    needsCheck: number;
    makeup: number;
    pending: number;
  };
  messages: {
    followups: number;
    logs: number;
    dryRun: number;
    sent: number;
    failed: number;
    sms: number;
    lms: number;
    overLimit: number;
  };
  students: {
    active: number;
    classes: number;
    missingSchedule: number;
  };
  audit: {
    count: number;
  };
};

export async function fetchReportSummary(range: ReportRange, signal: AbortSignal) {
  if (env.backendApiUrl) {
    try {
      const supabase = createSupabaseBrowserClient();
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;

      if (accessToken) {
        const backendUrl = new URL("/api/reports/summary", env.backendApiUrl);
        backendUrl.searchParams.set("range", range);
        const backendResponse = await fetch(backendUrl.toString(), {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal,
        });

        if (backendResponse.ok) {
          const backendPayload = (await backendResponse.json()) as {
            summary?: ReportSummary;
          };

          if (backendPayload.summary) {
            return backendPayload.summary;
          }
        }
      }
    } catch (error) {
      if (signal.aborted) {
        throw error;
      }
    }
  }

  const response = await fetch(`/api/reports/summary?range=${range}`, {
    cache: "no-store",
    signal,
  });
  const payload = (await response.json()) as {
    summary?: ReportSummary;
    error?: string;
  };

  if (!response.ok || !payload.summary) {
    throw new Error(payload.error ?? "운영 리포트를 불러오지 못했습니다.");
  }

  return payload.summary;
}
