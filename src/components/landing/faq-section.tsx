import { faqItems } from "@/lib/landing-content";

export function FaqSection() {
  return (
    <section id="faq" className="bg-[#f6f7ff] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#5862d9]">FAQ</p>
          <h2 className="mt-4 break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
            처음 도입할 때 나오는 질문
          </h2>
        </div>

        <div className="grid gap-3">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-xl border border-[#dfe3ff] bg-white p-5">
              <h3 className="break-keep text-lg font-semibold text-[#202557]">{item.question}</h3>
              <p className="mt-2 break-keep text-sm leading-6 text-[#60688e]">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
