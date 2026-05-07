import { ArrowRight, CheckCircle2, ClipboardList, MessageSquareText, UsersRound } from "lucide-react";
import Link from "next/link";
import { onboardingSteps } from "@/lib/landing-content";

export function OnboardingSection() {
  return (
    <section id="onboarding" className="relative overflow-hidden bg-[#f6f7ff] py-16 sm:py-22">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-full opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_45%_at_50%_0%,#000_45%,transparent_100%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#5862d9 1px,transparent 1px),linear-gradient(to bottom,#5862d9 1px,transparent 1px)",
          backgroundSize: "3rem 3rem",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[#5862d9]">도입 방식</p>
            <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
              3단계로 실제 학원 흐름을 먼저 검증합니다.
            </h2>
          </div>
          <div>
            <p className="max-w-2xl break-keep text-base leading-8 text-[#60688e]">
              강의 샘플의 3-step 구조처럼, 우리 랜딩도 사용자가 바로 이해할 수 있는 짧은
              흐름을 먼저 보여줍니다. 전체 교체가 아니라 파일럿 반부터 시작합니다.
            </p>
            <Link
              href="/login"
              className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-md bg-[#5862d9] px-5 text-sm font-semibold text-white transition hover:bg-[#4852c8]"
            >
              파일럿 화면 보기
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>

        <div className="relative mt-12 border-y border-[#cfd5ff]">
          <div className="pointer-events-none absolute inset-y-[10%] left-1/3 hidden w-px bg-gradient-to-b from-transparent via-[#b8c0ff] to-transparent lg:block" />
          <div className="pointer-events-none absolute inset-y-[10%] right-1/3 hidden w-px bg-gradient-to-b from-transparent via-[#b8c0ff] to-transparent lg:block" />

          <div className="grid lg:grid-cols-3">
            {onboardingSteps.map((step, index) => (
              <article
                key={step.step}
                className="group relative min-h-[28rem] border-b border-[#dfe3ff] bg-white/72 p-5 backdrop-blur transition hover:bg-white lg:border-b-0"
              >
                <div className="mb-6 inline-flex items-center gap-3 rounded-xl border border-[#dfe3ff] bg-white px-4 py-3">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5862d9]">
                    {index === 0 ? <ClipboardList size={18} /> : null}
                    {index === 1 ? <UsersRound size={18} /> : null}
                    {index === 2 ? <MessageSquareText size={18} /> : null}
                  </div>
                  <p className="font-mono text-sm font-semibold tracking-wider text-[#5862d9]">
                    STEP {step.step}
                  </p>
                </div>

                <h3 className="break-keep text-2xl font-semibold leading-8 text-[#202557]">
                  {step.title}
                </h3>
                <p className="mt-3 break-keep text-sm leading-6 text-[#60688e]">{step.body}</p>

                <StepPreview index={index} />
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepPreview({ index }: { index: number }) {
  if (index === 0) {
    return (
      <div className="mt-8 overflow-hidden rounded-xl border border-[#dfe3ff] bg-[#f8f9ff] shadow-lg shadow-[#26328f]/8">
        <div className="border-b border-[#dfe3ff] bg-white px-4 py-3">
          <p className="text-sm font-semibold text-[#202557]">현재 운영 방식</p>
        </div>
        <div className="grid gap-2 p-4 text-sm">
          {["결석 문자는 누가 보내나요?", "보강 가능 시간은 어디서 보나요?", "이전 연락 기록은 남나요?"].map((item) => (
            <div key={item} className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-[#60688e]">
              <CheckCircle2 size={16} className="text-[#69c48f]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (index === 1) {
    return (
      <div className="mt-8 overflow-hidden rounded-xl border border-[#dfe3ff] bg-white shadow-lg shadow-[#26328f]/8">
        <div className="grid grid-cols-[4.5rem_1fr]">
          <aside className="bg-[#202557] p-3 text-xs text-white/72">
            <p className="font-semibold text-white">Pilot</p>
            <div className="mt-5 grid gap-2">
              {["학생", "반", "스케줄"].map((item, itemIndex) => (
                <span
                  key={item}
                  className={itemIndex === 1 ? "rounded-md bg-white px-2 py-1 text-[#202557]" : "px-2 py-1"}
                >
                  {item}
                </span>
              ))}
            </div>
          </aside>
          <div className="p-4">
            {["중2 수학 A", "중3 영어 B", "고1 수학 C"].map((item) => (
              <div key={item} className="border-b border-[#dfe3ff] py-3 last:border-b-0">
                <p className="text-sm font-semibold text-[#202557]">{item}</p>
                <p className="mt-1 text-xs text-[#68709b]">학생 8~12명 등록</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-[#dfe3ff] bg-[#202557] p-4 text-white shadow-lg shadow-[#26328f]/12">
      <p className="text-sm font-semibold">문자 초안</p>
      <p className="mt-3 break-keep text-sm leading-6 text-white/72">
        [더배움프라임] 안녕하세요. 김민준 학생 보강 일정 안내드립니다.
      </p>
      <div className="mt-4 flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm font-semibold text-[#202557]">
        <span>히스토리 저장</span>
        <span className="text-[#5862d9]">완료</span>
      </div>
    </div>
  );
}
