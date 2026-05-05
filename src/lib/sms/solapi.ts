import { SolapiMessageService } from "solapi";
import { env } from "@/lib/env";

type SendSmsInput = {
  to: string;
  text: string;
};

export async function sendSms({ to, text }: SendSmsInput) {
  if (!env.solapiApiKey || !env.solapiApiSecret || !env.solapiSenderPhone) {
    throw new Error("SOLAPI 환경변수가 설정되지 않았습니다.");
  }

  const service = new SolapiMessageService(env.solapiApiKey, env.solapiApiSecret);

  return service.send([
    {
      to,
      from: env.solapiSenderPhone,
      text,
    },
  ]);
}
