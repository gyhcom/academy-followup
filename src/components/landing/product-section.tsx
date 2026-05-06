import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  CreditCard,
  MessageSquareText,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { demoAcademy } from "@/lib/demo-academy";
import { followupRows, platformFeatureAreas, productTabs } from "@/lib/landing-content";

export function ProductSection() {
  return (
    <section id="product" className="bg-[#202557] py-16 text-white sm:py-22">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#ffcb66]">제품 방향</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight sm:text-5xl">
            문자 발송은 작은 입구, 중심은 학원 운영 기록입니다.
          </h2>
          <p className="mt-5 max-w-xl break-keep text-base leading-8 text-white/72">
            Brightwheel이 보육기관 운영 전체를 보여주듯이, 우리도 학원에서 반복되는 학생 관리,
            수업 후 처리, 학부모 소통을 하나의 운영 화면으로 묶습니다.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <MobilePhoneMockup />
          <DirectorBoardMockup />
        </div>
      </div>
    </section>
  );
}

export function FeatureTabsSection() {
  return (
    <section id="features" className="bg-[#f6f7ff] py-16 sm:py-22">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
          <div>
            <p className="text-sm font-semibold text-[#5862d9]">기능 구조</p>
            <h2 className="mt-4 break-keep text-4xl font-semibold leading-tight text-[#202557] sm:text-5xl">
              기능을 많이 붙여도 메뉴가 무너지지 않는 구조
            </h2>
          </div>
          <p className="max-w-2xl break-keep text-base leading-8 text-[#60688e]">
            상업화 페이지에서는 전체 제품 범위를 먼저 보여주고, 실제 개발은 현재 사용 가능한
            기능과 다음 개발 기능을 구분해서 진행합니다.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {productTabs.map((tab) => (
            <article key={tab.label} className="rounded-xl border border-[#dfe3ff] bg-white p-5 shadow-sm">
              <p className="text-sm font-semibold text-[#5862d9]">{tab.label}</p>
              <h3 className="mt-4 break-keep text-xl font-semibold leading-7 text-[#202557]">
                {tab.title}
              </h3>
              <p className="mt-3 break-keep text-sm leading-6 text-[#60688e]">{tab.body}</p>
              <div className="mt-5 grid gap-2">
                {tab.bullets.map((bullet) => (
                  <div key={bullet} className="flex gap-2 text-sm text-[#424b74]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#69c48f]" size={16} />
                    <p>{bullet}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {platformFeatureAreas.map((feature, index) => {
            const Icon = featureIcons[index] ?? Sparkles;
            return (
              <article key={feature.title} className="rounded-xl border border-[#dfe3ff] bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5862d9]">
                    <Icon size={20} />
                  </div>
                  <span className="rounded-md bg-[#fff0e7] px-2.5 py-1 text-xs font-semibold text-[#dd5b42]">
                    {feature.status}
                  </span>
                </div>
                <h3 className="mt-5 break-keep text-lg font-semibold text-[#202557]">{feature.title}</h3>
                <p className="mt-2 break-keep text-sm leading-6 text-[#60688e]">{feature.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function MobilePhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[20rem] rounded-[2rem] border border-white/15 bg-[#151a48] p-3 shadow-2xl shadow-black/20">
      <div className="rounded-[1.5rem] bg-[#f6f7ff] p-4 text-[#202557]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#68709b]">오늘 수업</p>
            <h3 className="text-base font-semibold">중2 수학 A반</h3>
          </div>
          <Sparkles size={18} className="text-[#ff9f68]" />
        </div>

        <div className="mt-4 space-y-2">
          {["김민준", "이서연", "박지호", "최하린"].map((student, index) => (
            <div key={student} className="rounded-lg border border-[#dfe3ff] bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{student}</p>
                <span className="text-xs text-[#68709b]">010-****</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {["결석", "재시험", "숙제"].map((reason, reasonIndex) => (
                  <span
                    key={reason}
                    className={[
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      index === 0 && reasonIndex === 0
                        ? "bg-[#5862d9] text-white"
                        : "bg-[#eef0ff] text-[#424b74]",
                    ].join(" ")}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-[#202557] px-3 py-3 text-white">
          <p className="truncate text-sm font-semibold">김민준 · 결석 안내</p>
          <p className="mt-0.5 text-xs text-white/65">문자 초안이 기록에 연결됩니다.</p>
        </div>
      </div>
    </div>
  );
}

function DirectorBoardMockup() {
  return (
    <div className="rounded-2xl border border-white/12 bg-white p-4 text-[#202557] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-[#dfe3ff] pb-3">
        <div>
          <p className="text-xs text-[#68709b]">{demoAcademy.name}</p>
          <h3 className="mt-1 text-lg font-semibold">원장 운영 보드</h3>
        </div>
        <span className="rounded-md bg-[#eef0ff] px-3 py-2 text-sm font-semibold text-[#5862d9]">
          4건 대기
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#dfe3ff]">
        {followupRows.map((row) => (
          <div
            key={`${row.student}-${row.reason}`}
            className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#dfe3ff] bg-[#f8f9ff] px-3 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-semibold">{row.student}</p>
              <p className="mt-1 text-xs text-[#68709b]">
                {row.className} · {row.reason}
              </p>
            </div>
            <p className="self-center rounded-md bg-white px-2 py-1 text-xs text-[#60688e]">
              {row.state}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[#202557] p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText size={17} />
          학부모 안내 기록
        </div>
        <p className="mt-3 break-keep text-sm leading-6 text-white/75">
          [{demoAcademy.senderName}] 안녕하세요. 김민준 학생이 오늘 수업에 결석하여
          안내드립니다. 확인 부탁드립니다.
        </p>
      </div>
    </div>
  );
}

const featureIcons = [BarChart3, UsersRound, ClipboardCheck, MessageSquareText, Sparkles, CreditCard];
