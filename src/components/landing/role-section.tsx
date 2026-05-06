import { ArrowRight, Building2, Home, MapPin, School, Shuffle, UsersRound } from "lucide-react";
import { audienceMenuItems } from "@/lib/landing-content";

export function RoleSection() {
  return (
    <section id="audiences" className="border-y border-[#dfe3ff] bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[#5862d9]">누구를 위한 서비스인가</p>
            <h2 className="mt-4 max-w-md break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
              홈스쿨링이 아니라, 센터형 교육기관에 맞춥니다.
            </h2>
            <p className="mt-5 max-w-md break-keep text-base leading-7 text-[#60688e]">
              해외 교육기관 SaaS의 센터형 구조는 “집에서 하는 돌봄”보다 “교육 프로그램이 있는 기관
              운영”에 가깝습니다. 우리는 한국 학원 기준으로 다시 분류합니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {audienceMenuItems.map((card, index) => {
              const Icon = audienceIcons[index] ?? School;
              return (
              <article
                key={card.title}
                className="group rounded-xl border border-[#dfe3ff] bg-[#f8f9ff] p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-xl hover:shadow-[#26328f]/8"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-white text-[#5862d9]">
                    <Icon size={19} />
                  </div>
                  <ArrowRight size={17} className="mt-2 text-[#8d94be] transition group-hover:translate-x-1 group-hover:text-[#5862d9]" />
                </div>
                <h3 className="mt-5 break-keep text-lg font-semibold leading-7 text-[#202557]">{card.title}</h3>
                <p className="mt-2 break-keep text-sm leading-6 text-[#60688e]">{card.body}</p>
              </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const audienceIcons = [School, Building2, MapPin, Shuffle, UsersRound, Home];
