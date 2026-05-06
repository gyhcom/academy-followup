import { ArrowRight, CheckCircle2, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { demoAcademy } from "@/lib/demo-academy";
import { demoSteps, heroStats } from "@/lib/landing-content";

export function HeroSection() {
  return (
    <section className="bg-[#f6f4ed]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 sm:py-18 lg:grid-cols-[0.9fr_1.1fr] lg:py-24">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="max-w-fit rounded-full bg-[#e5efe6] px-3 py-1 text-sm font-semibold text-[#123b3b]">
            한국 학원 수업 후 운영에 맞춘 팔로업 워크플로우
          </p>
          <h1 className="mt-6 max-w-3xl break-keep text-5xl font-semibold leading-[1.04] tracking-normal text-[#123b3b] sm:text-6xl lg:text-7xl">
            수업 끝나고 밀리는 학부모 연락을 한 흐름으로
          </h1>
          <p className="mt-6 max-w-2xl break-keep text-base leading-8 text-[#52625d] sm:text-lg">
            결석, 재시험, 숙제 미완료 안내를 선생님 휴대폰에서 만들고 원장이 나중에
            확인할 수 있게 기록합니다.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#123b3b] px-5 text-sm font-semibold text-white transition hover:bg-[#0b2f2f]"
            >
              제품 화면 보기
              <ArrowRight size={17} />
            </Link>
            <a
              href="#demo"
              className="flex min-h-12 items-center justify-center rounded-md border border-[#123b3b]/20 bg-white px-5 text-sm font-semibold text-[#123b3b] transition hover:bg-[#edf1e8]"
            >
              데모 흐름 보기
            </a>
          </div>

          <div className="mt-9 grid max-w-xl gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="min-w-0 border-t border-[#123b3b]/18 pt-3">
                <p className="text-xs text-[#687872]">{stat.label}</p>
                <p className="mt-1 break-keep text-xl font-semibold text-[#123b3b]">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        <DemoIntakeCard />
      </div>
    </section>
  );
}

function DemoIntakeCard() {
  return (
    <div className="w-full max-w-[calc(100vw-2rem)] min-w-0 overflow-hidden rounded-2xl border border-[#123b3b]/12 bg-white p-4 shadow-2xl shadow-[#123b3b]/10 sm:max-w-none sm:p-5">
      <div className="min-w-0 overflow-hidden rounded-xl bg-[#123b3b] p-4 text-white sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">{demoAcademy.name}</p>
            <h2 className="mt-1 text-2xl font-semibold">데모 준비</h2>
          </div>
          <div className="flex size-11 items-center justify-center rounded-md bg-white text-[#123b3b]">
            <MessageSquareText size={22} />
          </div>
        </div>

        <div className="mt-6 grid gap-2">
          {demoSteps.map((step, index) => (
            <div
              key={step}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.06] px-3 py-3"
            >
            <div className="flex items-center gap-3">
              <div className="flex size-7 items-center justify-center rounded-md bg-white/10 text-xs font-semibold">
                {index + 1}
              </div>
                <p className="min-w-0 truncate text-sm font-semibold">{step}</p>
            </div>
              {index === 0 ? <CheckCircle2 size={18} className="text-[#b7e4c7]" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#123b3b]/12 bg-[#f8faf4] p-4">
        <p className="text-sm font-semibold text-[#123b3b]">지금 검증할 업무</p>
        <div className="mt-3 grid gap-2 text-sm text-[#42534d]">
          <div className="rounded-md bg-white px-3 py-2">결석 문자</div>
          <div className="rounded-md bg-white px-3 py-2">재시험 안내</div>
          <div className="rounded-md bg-white px-3 py-2">숙제 미완료 후속</div>
        </div>
      </div>
    </div>
  );
}
