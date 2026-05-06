import { faqItems } from "@/lib/landing-content";

export function FaqSection() {
  return (
    <section id="faq" className="bg-[#f6f4ed] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-[#3a6b5a]">FAQ</p>
          <h2 className="mt-4 break-keep text-4xl font-semibold leading-tight text-[#123b3b] sm:text-5xl">
            처음 도입할 때 나오는 질문
          </h2>
        </div>

        <div className="grid gap-3">
          {faqItems.map((item) => (
            <article key={item.question} className="rounded-xl bg-white p-5">
              <h3 className="break-keep text-lg font-semibold text-[#123b3b]">{item.question}</h3>
              <p className="mt-2 break-keep text-sm leading-6 text-[#52625d]">{item.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
