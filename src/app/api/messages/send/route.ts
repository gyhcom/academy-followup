import { NextResponse } from "next/server";
import { sendSms } from "@/lib/sms/solapi";

type SendMessageRequest = {
  to?: string;
  text?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as SendMessageRequest;

  if (!body.to || !body.text) {
    return NextResponse.json(
      { error: "수신번호와 메시지 본문이 필요합니다." },
      { status: 400 },
    );
  }

  if (process.env.SMS_DRY_RUN !== "false") {
    return NextResponse.json({
      dryRun: true,
      message: "SMS_DRY_RUN이 활성화되어 실제 문자를 발송하지 않았습니다.",
      payload: {
        to: body.to,
        text: body.text,
      },
    });
  }

  const result = await sendSms({
    to: body.to,
    text: body.text,
  });

  return NextResponse.json({ dryRun: false, result });
}

