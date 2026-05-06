import { CheckCircle2 } from "lucide-react";
import { outcomes } from "@/lib/landing-content";

export function OutcomesSection() {
  return (
    <section className="border-y border-[#123b3b]/10 bg-white py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#3a6b5a]">왜 지금 필요한가</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#123b3b] sm:text-5xl">
            학원 규모가 커질수록 후속 연락은 운영 문제가 됩니다.
          </h2>
        </div>

        <div className="grid gap-4">
          {outcomes.map((item) => (
            <article
              key={item.title}
              className="grid gap-4 border-t border-[#123b3b]/10 py-5 sm:grid-cols-[2.5rem_1fr]"
            >
              <CheckCircle2 className="mt-1 text-[#3a6b5a]" size={22} />
              <div>
                <h3 className="break-keep text-xl font-semibold text-[#123b3b]">{item.title}</h3>
                <p className="mt-2 break-keep text-base leading-7 text-[#52625d]">{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
