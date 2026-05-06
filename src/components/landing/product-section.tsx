import { CheckCircle2, MessageSquareText, Sparkles } from "lucide-react";
import { demoAcademy } from "@/lib/demo-academy";
import { followupRows, productTabs } from "@/lib/landing-content";

export function ProductSection() {
  return (
    <section id="product" className="bg-[#123b3b] py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#b7e4c7]">제품 화면</p>
          <h2 className="mt-4 max-w-xl break-keep text-4xl font-semibold leading-tight sm:text-5xl">
            학생 목록은 길어지고, 작성 화면은 필요할 때만 열립니다.
          </h2>
          <p className="mt-5 max-w-xl break-keep text-base leading-8 text-white/72">
            모바일에서는 학생 목록을 메인으로 두고 선택한 후속 안내만 하단에서 확인합니다.
            데스크톱에서는 원장/관리자가 전체 흐름을 볼 수 있습니다.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
          <MobilePhoneMockup />
          <DirectorBoardMockup />
        </div>
      </div>
    </section>
  );
}

export function FeatureTabsSection() {
  return (
    <section id="operations" className="bg-[#f6f4ed] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold text-[#3a6b5a]">운영 흐름</p>
          <h2 className="mt-4 break-keep text-4xl font-semibold leading-tight text-[#123b3b] sm:text-5xl">
            기능을 많이 보이기보다, 실제 업무 순서대로 보여줍니다.
          </h2>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {productTabs.map((tab) => (
            <article key={tab.label} className="rounded-xl border border-[#123b3b]/12 bg-white p-5">
              <p className="text-sm font-semibold text-[#3a6b5a]">{tab.label}</p>
              <h3 className="mt-4 break-keep text-xl font-semibold leading-7 text-[#123b3b]">
                {tab.title}
              </h3>
              <p className="mt-3 break-keep text-sm leading-6 text-[#52625d]">{tab.body}</p>
              <div className="mt-5 grid gap-2">
                {tab.bullets.map((bullet) => (
                  <div key={bullet} className="flex gap-2 text-sm text-[#42534d]">
                    <CheckCircle2 className="mt-0.5 shrink-0 text-[#3a6b5a]" size={16} />
                    <p>{bullet}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MobilePhoneMockup() {
  return (
    <div className="mx-auto w-full max-w-[20rem] rounded-[2rem] border border-white/15 bg-[#0b2f2f] p-3 shadow-2xl">
      <div className="rounded-[1.5rem] bg-[#f6f4ed] p-4 text-[#123b3b]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#687872]">오늘 수업</p>
            <h3 className="text-base font-semibold">중2 수학 A반</h3>
          </div>
          <Sparkles size={18} className="text-[#c7772f]" />
        </div>

        <div className="mt-4 space-y-2">
          {["김민준", "이서연", "박지호", "최하린"].map((student, index) => (
            <div key={student} className="rounded-lg border border-[#123b3b]/10 bg-white p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{student}</p>
                <span className="text-xs text-[#687872]">010-****</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {["결석", "재시험", "숙제"].map((reason, reasonIndex) => (
                  <span
                    key={reason}
                    className={[
                      "rounded-md px-2 py-1 text-xs font-semibold",
                      index === 0 && reasonIndex === 0
                        ? "bg-[#123b3b] text-white"
                        : "bg-[#edf1e8] text-[#42534d]",
                    ].join(" ")}
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl bg-[#123b3b] px-3 py-3 text-white">
          <p className="truncate text-sm font-semibold">김민준 · 결석 안내</p>
          <p className="mt-0.5 text-xs text-white/65">문자 초안이 준비됐습니다.</p>
        </div>
      </div>
    </div>
  );
}

function DirectorBoardMockup() {
  return (
    <div className="rounded-2xl border border-white/12 bg-white p-4 text-[#123b3b] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#123b3b]/10 pb-3">
        <div>
          <p className="text-xs text-[#687872]">{demoAcademy.name}</p>
          <h3 className="mt-1 text-lg font-semibold">오늘의 후속 연락</h3>
        </div>
        <span className="rounded-md bg-[#edf1e8] px-3 py-2 text-sm font-semibold">4건 대기</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-[#123b3b]/10">
        {followupRows.map((row) => (
          <div
            key={`${row.student}-${row.reason}`}
            className="grid grid-cols-[1fr_auto] gap-3 border-b border-[#123b3b]/10 bg-[#f8faf4] px-3 py-3 last:border-b-0"
          >
            <div>
              <p className="text-sm font-semibold">{row.student}</p>
              <p className="mt-1 text-xs text-[#687872]">
                {row.className} · {row.reason}
              </p>
            </div>
            <p className="self-center rounded-md bg-white px-2 py-1 text-xs text-[#52625d]">
              {row.state}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl bg-[#123b3b] p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageSquareText size={17} />
          문자 미리보기
        </div>
        <p className="mt-3 text-sm leading-6 text-white/75">
          [{demoAcademy.senderName}] 안녕하세요. 김민준 학생이 오늘 수업에 결석하여
          안내드립니다. 확인 부탁드립니다.
        </p>
      </div>
    </div>
  );
}
