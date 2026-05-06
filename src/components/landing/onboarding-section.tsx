import { ArrowRight, UploadCloud } from "lucide-react";
import Link from "next/link";
import { onboardingSteps } from "@/lib/landing-content";

export function OnboardingSection() {
  return (
    <section id="onboarding" className="bg-[#f6f7ff] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#5862d9]">도입 방식</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
            다른 프로그램을 한 번에 갈아엎지 않고 시작합니다.
          </h2>
          <p className="mt-5 max-w-xl break-keep text-base leading-8 text-[#60688e]">
            이미 쓰는 방식이 있어도 빠르게 얹을 수 있어야 합니다.
            파일럿 반부터 세팅하고 후속 연락 업무를 먼저 검증합니다.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#5862d9] px-5 text-sm font-semibold text-white transition hover:bg-[#4852c8]"
          >
            파일럿 화면 보기
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#dfe3ff] bg-white p-5 shadow-xl shadow-[#26328f]/8">
          <div className="flex items-center gap-3 border-b border-[#dfe3ff] pb-4">
            <div className="flex size-11 items-center justify-center rounded-md bg-[#eef0ff] text-[#5862d9]">
              <UploadCloud size={21} />
            </div>
            <div>
              <p className="text-sm text-[#68709b]">Pilot setup</p>
              <h3 className="text-lg font-semibold text-[#202557]">2~3개 반으로 시작</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {onboardingSteps.map((step) => (
              <article key={step.step} className="rounded-xl bg-[#f8f9ff] p-4">
                <p className="font-mono text-xs font-semibold text-[#5862d9]">{step.step}</p>
                <h4 className="mt-2 text-base font-semibold text-[#202557]">{step.title}</h4>
                <p className="mt-1 break-keep text-sm leading-6 text-[#60688e]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
