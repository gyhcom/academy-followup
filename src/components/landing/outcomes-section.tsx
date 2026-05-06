import { CheckCircle2 } from "lucide-react";
import { outcomes } from "@/lib/landing-content";

export function OutcomesSection() {
  return (
    <section className="border-y border-[#dfe3ff] bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#5862d9]">상업화 관점</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
            작은 기능으로 시작해도, 팔리는 건 큰 운영 문제입니다.
          </h2>
        </div>

        <div className="grid gap-4">
          {outcomes.map((item) => (
            <article
              key={item.title}
              className="grid gap-4 border-t border-[#dfe3ff] py-5 sm:grid-cols-[2.5rem_1fr]"
            >
              <CheckCircle2 className="mt-1 text-[#69c48f]" size={22} />
              <div>
                <h3 className="break-keep text-xl font-semibold text-[#202557]">{item.title}</h3>
                <p className="mt-2 break-keep text-base leading-7 text-[#60688e]">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
