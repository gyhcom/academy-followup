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
    <section className="border-y border-[#123b3b]/10 bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#3a6b5a]">첫 검증</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#123b3b] sm:text-5xl">
            실제 학원 규모를 기준으로 화면과 흐름을 맞춥니다.
          </h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {proofItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.label} className="rounded-xl bg-[#f8faf4] p-5">
                <div className="mb-5 flex size-10 items-center justify-center rounded-md bg-white text-[#123b3b]">
                  <Icon size={19} />
                </div>
                <p className="text-sm text-[#687872]">{item.label}</p>
                <p className="mt-2 break-keep text-lg font-semibold leading-7 text-[#123b3b]">
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
