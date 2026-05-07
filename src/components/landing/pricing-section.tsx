import { ArrowRight, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import { pricingFeatures } from "@/lib/landing-content";

export function PricingSection() {
  return (
    <section id="pricing" className="relative overflow-hidden bg-white py-16 sm:py-22">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#cfd5ff] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#cfd5ff] to-transparent" />

      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#5862d9]">가격 가설</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
            처음에는 복잡한 요금제보다 파일럿 하나로 검증합니다.
          </h2>
          <p className="mt-5 max-w-xl break-keep text-base leading-8 text-[#60688e]">
            강의 샘플의 단일 가격 카드 구조를 참고했습니다. 지금 단계에서는 여러 플랜보다
            한 학원에서 실제로 쓰는 흐름을 돈 받을 수 있는지 확인하는 게 먼저입니다.
          </p>
        </div>

        <div className="mx-auto w-full max-w-[34rem] rounded-2xl border border-[#dfe3ff] bg-[#f8f9ff] p-4 shadow-2xl shadow-[#26328f]/10">
          <div className="rounded-xl border border-[#dfe3ff] bg-white p-6">
            <div className="flex items-start justify-between gap-4 border-b border-[#dfe3ff] pb-5">
              <div>
                <p className="text-sm font-semibold text-[#5862d9]">Pilot Standard</p>
                <h3 className="mt-2 text-2xl font-semibold text-[#202557]">친구 학원 기준 파일럿</h3>
              </div>
              <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5862d9]">
                <CreditCard size={20} />
              </div>
            </div>

            <div className="mt-6 flex items-end gap-2">
              <span className="text-4xl font-semibold tracking-normal text-[#202557]">월 49,000원</span>
              <span className="pb-1 text-sm font-medium text-[#68709b]">가설</span>
            </div>
            <p className="mt-2 break-keep text-sm leading-6 text-[#60688e]">
              실제 과금 전에는 1개 학원 파일럿으로 사용 빈도와 운영 가치를 먼저 확인합니다.
            </p>

            <div className="mt-6 grid gap-3">
              {pricingFeatures.map((feature) => (
                <div key={feature} className="flex items-start gap-3 text-sm leading-6 text-[#424b74]">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#5862d9]">
                    <Check size={14} strokeWidth={2.4} />
                  </span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <Link
              href="/login"
              className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#5862d9] px-5 text-sm font-semibold text-white transition hover:bg-[#4852c8]"
            >
              파일럿 화면 보기
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
