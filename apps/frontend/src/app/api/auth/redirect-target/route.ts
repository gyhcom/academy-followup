import { NextResponse } from "next/server";
import { getPostLoginRedirectTarget } from "@/lib/server/platform-admin";

export async function GET() {
  const target = await getPostLoginRedirectTarget();

  return NextResponse.json({ target });
}
