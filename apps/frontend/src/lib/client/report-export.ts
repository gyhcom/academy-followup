import { env } from "@/lib/env";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ReportExportType = "students" | "attendance" | "messages" | "audit";
export type ReportRange = "today" | "7d" | "month";

type DownloadReportExportParams = {
  type: ReportExportType;
  range: ReportRange;
  includePrivate: boolean;
};

export async function downloadReportExport({
  type,
  range,
  includePrivate,
}: DownloadReportExportParams) {
  if (env.backendApiUrl) {
    try {
      const supabase = createSupabaseBrowserClient();
      const sessionResult = await supabase.auth.getSession();
      const accessToken = sessionResult.data.session?.access_token;

      if (accessToken) {
        const backendUrl = buildExportUrl(env.backendApiUrl, { type, range, includePrivate });
        const backendResponse = await fetch(backendUrl, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (backendResponse.ok) {
          await downloadCsvBlob(backendResponse, `academy-${type}.csv`);
          return;
        }
      }
    } catch {
      // Fall back to the existing Next.js API below.
    }
  }

  const fallbackResponse = await fetch(buildExportUrl(window.location.origin, {
    type,
    range,
    includePrivate,
  }), {
    cache: "no-store",
  });

  if (!fallbackResponse.ok) {
    const payload = (await fallbackResponse.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "CSV를 내려받지 못했습니다.");
  }

  await downloadCsvBlob(fallbackResponse, `academy-${type}.csv`);
}

function buildExportUrl(
  baseUrl: string,
  { type, range, includePrivate }: DownloadReportExportParams,
) {
  const url = new URL("/api/reports/export", baseUrl);
  url.searchParams.set("type", type);
  url.searchParams.set("range", range);
  url.searchParams.set("includePrivate", String(includePrivate));

  return url.toString();
}

async function downloadCsvBlob(response: Response, fallbackFilename: string) {
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const filename = getFilename(response.headers.get("Content-Disposition")) ?? fallbackFilename;
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getFilename(disposition: string | null) {
  if (!disposition) {
    return null;
  }

  const utf8Filename = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];

  if (utf8Filename) {
    return decodeURIComponent(utf8Filename);
  }

  return disposition.match(/filename="([^"]+)"/)?.[1] ?? null;
}
