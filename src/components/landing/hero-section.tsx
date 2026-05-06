import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  MonitorSmartphone,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { demoAcademy } from "@/lib/demo-academy";
import { demoSteps, heroStats, roleCards } from "@/lib/landing-content";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#5862d9] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-24 lg:pt-20">
        <div className="flex min-w-0 flex-col justify-center">
          <p className="text-base font-semibold text-white/86">학원 운영을 위한 커뮤니케이션 OS</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-normal sm:text-6xl lg:text-7xl">
            <span className="block">학생 관리부터</span>
            <span className="block">학부모 연락까지</span>
            <span className="block">한 곳에서</span>
          </h1>
          <p className="mt-6 max-w-2xl break-words text-base font-medium leading-8 text-white/82 sm:break-keep sm:text-lg">
            <span className="block sm:inline">결석 문자로 시작해 </span>
            <span className="block sm:inline">학생·반·선생님 기록까지 </span>
            <span className="block sm:inline">연결하는 운영 SaaS입니다.</span>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ff6a67] px-5 text-sm font-semibold text-white shadow-lg shadow-[#26328f]/20 transition hover:bg-[#ff565b]"
            >
              제품 화면 보기
              <ArrowRight size={17} />
            </Link>
            <a
              href="#features"
              className="flex min-h-12 items-center justify-center rounded-md border border-white/50 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/14"
            >
              기능 구조 보기
            </a>
          </div>

          <div className="mt-10">
            <p className="text-xl font-semibold">먼저, 어떤 역할로 볼까요?</p>
            <div className="mt-4 grid max-w-xl gap-3">
              {roleCards.map((card, index) => (
                <a
                  key={card.role}
                  href="#features"
                  className="group flex min-h-20 items-center justify-between gap-4 rounded-xl bg-white p-4 text-[#202557] shadow-xl shadow-[#25308d]/10 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#25308d]/18"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5862d9]">
                      {index === 0 ? <Building2 size={21} /> : null}
                      {index === 1 ? <UsersRound size={21} /> : null}
                      {index === 2 ? <ClipboardList size={21} /> : null}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold">{card.role}</p>
                      <p className="mt-1 truncate text-sm text-[#68709b]">{card.title}</p>
                    </div>
                  </div>
                  <ArrowRight size={18} className="shrink-0 text-[#5862d9] transition group-hover:translate-x-1" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="relative min-w-0">
          <PlatformPreview />
          <ChatPreview />
        </div>
      </div>

      <div className="bg-white px-4 py-5 text-[#202557] sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3">
          {heroStats.map((stat) => (
            <div key={stat.label} className="min-w-0 border-l border-[#dfe3ff] pl-4 first:border-l-0 first:pl-0">
              <p className="text-xs font-semibold text-[#68709b]">{stat.label}</p>
              <p className="mt-1 break-keep text-lg font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PlatformPreview() {
  return (
    <div className="mx-auto w-full max-w-[18.5rem] overflow-hidden rounded-[1.4rem] border-[6px] border-[#e7e9ff] bg-white p-2 text-[#202557] shadow-2xl shadow-[#26328f]/28 sm:max-w-[42rem] sm:p-3">
      <div className="overflow-hidden rounded-[1rem] border border-[#dfe3ff] bg-[#f7f8ff]">
        <div className="grid min-h-[23rem] grid-cols-[3.4rem_minmax(0,1fr)] sm:grid-cols-[6.4rem_1fr]">
          <aside className="bg-[#4e58ce] p-2 text-white sm:p-3">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded bg-white" />
              <span className="hidden text-xs font-semibold sm:inline">academy</span>
            </div>
            <div className="mt-8 grid gap-2 text-[0.64rem] sm:text-xs">
              {["홈", "학생", "반", "출결", "연락", "리포트"].map((item, index) => (
                <div
                  key={item}
                  className={[
                    "rounded-md px-2 py-2",
                    index === 3 ? "bg-white text-[#4e58ce]" : "bg-white/8 text-white/82",
                  ].join(" ")}
                >
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-[#dfe3ff] pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="truncate text-sm font-semibold text-[#68709b]">{demoAcademy.name}</p>
                <h2 className="mt-1 break-keep text-xl font-semibold sm:text-2xl">오늘의 학원 운영</h2>
              </div>
              <div className="hidden grid-cols-3 gap-2 text-center text-xs sm:grid">
                {["결석", "재시험", "상담"].map((item, index) => (
                  <div key={item} className="rounded-md bg-white px-3 py-2 shadow-sm">
                    <p className="font-semibold text-[#4e58ce]">{index + 2}</p>
                    <p className="mt-1 text-[#68709b]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">수업 후 처리</h3>
                  <span className="rounded-md bg-[#fff0e7] px-2 py-1 text-xs font-semibold text-[#dd5b42]">
                    4건 대기
                  </span>
                </div>
                <div className="mt-4 grid gap-2">
                  {["중2 수학 A반", "중3 영어 B반", "고1 수학 C반"].map((className, index) => (
                    <div key={className} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-[#e8eaff] px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold">{className}</p>
                        <p className="mt-1 text-xs text-[#68709b]">
                          {index === 0 ? "결석 안내 필요" : "재시험/숙제 확인"}
                        </p>
                      </div>
                      <CheckCircle2 size={17} className={index === 0 ? "text-[#ff6a67]" : "text-[#69c48f]"} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-white p-4 shadow-sm">
                <h3 className="font-semibold">학부모 연락 초안</h3>
                <div className="mt-4 rounded-lg bg-[#202557] p-3 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <MessageSquareText size={16} />
                    결석 안내
                  </div>
                  <p className="mt-3 break-keep text-xs leading-5 text-white/72">
                    오늘 수업 결석으로 확인되어 안내드립니다. 보강 일정은 확인 후 다시
                    연락드리겠습니다.
                  </p>
                </div>
                <div className="mt-3 grid gap-2">
                  {demoSteps.map((step, index) => (
                    <div key={step} className="flex items-center gap-2 text-xs text-[#68709b]">
                      <span className="flex size-5 items-center justify-center rounded bg-[#eef0ff] font-semibold text-[#4e58ce]">
                        {index + 1}
                      </span>
                      {step}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="mt-5 rounded-xl bg-white p-4 text-[#202557] shadow-2xl shadow-[#26328f]/18 lg:absolute lg:-bottom-12 lg:right-0 lg:w-[23rem]">
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#5862d9]">
          <MonitorSmartphone size={20} />
        </div>
        <div>
          <p className="break-keep text-sm font-semibold">이 학원에서는 어떤 기능부터 쓰면 좋을까요?</p>
          <p className="mt-1 text-xs text-[#68709b]">파일럿 상담 · 1분 전</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["학생/반 관리", "후속 문자", "원장 보드"].map((item) => (
          <span key={item} className="rounded-full bg-[#f1f3ff] px-3 py-1.5 text-xs font-semibold text-[#4e58ce]">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
