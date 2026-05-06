import { roleCards } from "@/lib/landing-content";

export function RoleSection() {
  return (
    <section className="border-y border-[#123b3b]/10 bg-white py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold text-[#3a6b5a]">역할별로 보는 제품</p>
            <h2 className="mt-3 max-w-md break-keep text-3xl font-semibold leading-tight text-[#123b3b] sm:text-4xl">
              같은 화면을 모두에게 강요하지 않습니다.
            </h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {roleCards.map((card) => (
              <article
                key={card.role}
                className="rounded-xl border border-[#123b3b]/12 bg-[#f8faf4] p-5"
              >
                <p className="text-sm font-semibold text-[#3a6b5a]">{card.role}</p>
                <h3 className="mt-3 break-keep text-lg font-semibold leading-7 text-[#123b3b]">
                  {card.title}
                </h3>
                <div className="mt-5 grid gap-2">
                  {card.points.map((point) => (
                    <p key={point} className="rounded-md bg-white px-3 py-2 text-sm text-[#42534d]">
                      {point}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
