import { ArrowRight, UploadCloud } from "lucide-react";
import Link from "next/link";
import { onboardingSteps } from "@/lib/landing-content";

export function OnboardingSection() {
  return (
    <section id="onboarding" className="bg-[#f6f4ed] py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#3a6b5a]">도입 방식</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#123b3b] sm:text-5xl">
            처음부터 전체 학원관리로 들어가지 않습니다.
          </h2>
          <p className="mt-5 max-w-xl break-keep text-base leading-8 text-[#52625d]">
            파일럿 반, 반복 문구, dry-run 발송 흐름부터 확인합니다. 실제 발송은 기록 저장과
            중복 방지까지 확인한 뒤 붙입니다.
          </p>
          <Link
            href="/login"
            className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#123b3b] px-5 text-sm font-semibold text-white transition hover:bg-[#0b2f2f]"
          >
            파일럿 화면 보기
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#123b3b]/12 bg-white p-5 shadow-xl shadow-[#123b3b]/8">
          <div className="flex items-center gap-3 border-b border-[#123b3b]/10 pb-4">
            <div className="flex size-11 items-center justify-center rounded-md bg-[#e5efe6] text-[#123b3b]">
              <UploadCloud size={21} />
            </div>
            <div>
              <p className="text-sm text-[#687872]">Pilot setup</p>
              <h3 className="text-lg font-semibold text-[#123b3b]">2~3개 반으로 시작</h3>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {onboardingSteps.map((step) => (
              <article key={step.step} className="rounded-xl bg-[#f8faf4] p-4">
                <p className="font-mono text-xs font-semibold text-[#3a6b5a]">{step.step}</p>
                <h4 className="mt-2 text-base font-semibold text-[#123b3b]">{step.title}</h4>
                <p className="mt-1 break-keep text-sm leading-6 text-[#52625d]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
