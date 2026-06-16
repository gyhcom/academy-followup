import type { ManagementAuditLog } from "@/app/app/management-types";
import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export async function fetchAuditLogsFromBackend(signal: AbortSignal, limit = 20) {
  if (!env.backendApiUrl) {
    return null;
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;

    if (!accessToken) {
      return null;
    }

    const backendUrl = new URL("/api/audit/logs", env.backendApiUrl);
    backendUrl.searchParams.set("limit", String(limit));
    const response = await fetch(backendUrl.toString(), {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      logs?: ManagementAuditLog[];
    };

    return payload.logs ?? null;
  } catch {
    if (signal.aborted) {
      return null;
    }

    return null;
  }
}
