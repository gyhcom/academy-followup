import { NextResponse } from "next/server";
import {
  assertReportAccess,
  getReportSummary,
  isReportRange,
} from "@/lib/server/reports";
import { getRouteWorkspace } from "@/lib/server/route-workspace";

export async function GET(request: Request) {
  const workspaceResult = await getRouteWorkspace();

  if (!workspaceResult.ok) {
    return NextResponse.json(
      { error: workspaceResult.error },
      { status: workspaceResult.status },
    );
  }

  const access = assertReportAccess(workspaceResult.workspace);

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const rangeParam = new URL(request.url).searchParams.get("range");
  const range = isReportRange(rangeParam) ? rangeParam : "today";
  const summaryResult = await getReportSummary({
    admin: workspaceResult.workspace.admin,
    academyId: workspaceResult.workspace.profile.academy_id,
    range,
  });

  if (!summaryResult.ok) {
    return NextResponse.json({ error: summaryResult.error }, { status: 500 });
  }

  return NextResponse.json({ summary: summaryResult.summary });
}
