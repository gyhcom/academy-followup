import { NextResponse } from "next/server";
import {
  createSupabaseAdminClient,
  hasSupabaseAdminEnv,
} from "@/lib/supabase/admin";

export async function GET() {
  if (!hasSupabaseAdminEnv()) {
    return NextResponse.json({
      ok: false,
      status: "not_configured",
      message: "Supabase URL 또는 service role key가 설정되지 않았습니다.",
    });
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("academies").select("id").limit(1);

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        status: "connection_failed",
        message: error.message,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    status: "connected",
  });
}
