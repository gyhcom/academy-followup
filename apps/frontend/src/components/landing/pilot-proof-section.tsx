import { MessageSquareText, School, ShieldCheck, UsersRound } from "lucide-react";
import { demoAcademy } from "@/lib/demo-academy";

const proofItems = [
  { label: "파일럿 학원", value: demoAcademy.name, icon: School },
  { label: "원생 규모", value: `${demoAcademy.stats.students}명 내외`, icon: UsersRound },
  { label: "운영 인원", value: `${demoAcademy.stats.staff}명 내외`, icon: ShieldCheck },
  { label: "첫 검증 범위", value: "결석·재시험·숙제 안내", icon: MessageSquareText },
];

export function PilotProofSection() {
  return (
    <section className="border-y border-[#dfe3ff] bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#5862d9]">첫 검증</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
            실제 학원 규모를 기준으로 제품 범위를 좁힙니다.
          </h2>
          <p className="mt-5 max-w-xl break-keep text-base leading-8 text-[#60688e]">
            상업화 방향은 넓게 잡되, 지금 개발은 친구 학원의 실제 업무에서 반복되는 흐름부터
            확인합니다.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {proofItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-xl border border-[#dfe3ff] bg-[#f8f9ff] p-5">
                <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-white text-[#5862d9]">
                  <Icon size={19} />
                </div>
                <p className="text-sm text-[#68709b]">{item.label}</p>
                <p className="mt-2 break-keep text-lg font-semibold leading-7 text-[#202557]">
                  {item.value}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
