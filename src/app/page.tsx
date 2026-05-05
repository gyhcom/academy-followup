import { Bell, ClipboardCheck, MessageSquareText, School, UsersRound } from "lucide-react";

const students = [
  { name: "김민준", status: "결석 안내", className: "중2 수학 A반", tone: "확인 필요" },
  { name: "이서연", status: "재시험 안내", className: "중3 영어 B반", tone: "오늘 발송" },
  { name: "박지호", status: "숙제 미완료", className: "고1 수학 C반", tone: "팔로업" },
  { name: "최하은", status: "상담 권장", className: "중1 영어 A반", tone: "검토" },
];

const reasons = ["결석", "지각", "숙제 미완료", "재시험", "준비물", "상담 권장"];

export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex items-center justify-between border-b border-stone-200 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <School size={21} />
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">한국 학원용 팔로업 SaaS</p>
              <h1 className="text-xl font-semibold tracking-normal text-stone-950">Academy Follow-up</h1>
            </div>
          </div>
          <button className="rounded-md bg-stone-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-stone-800">
            파일럿 시작
          </button>
        </header>

        <div className="grid flex-1 gap-6 py-8 lg:grid-cols-[0.95fr_1.35fr]">
          <section className="flex flex-col justify-center">
            <div className="max-w-xl">
              <h2 className="text-4xl font-semibold leading-tight tracking-normal text-stone-950 sm:text-5xl">
                수업 후 학부모 팔로업을 10초 안에 끝내는 보드
              </h2>
              <p className="mt-5 text-lg leading-8 text-stone-600">
                학생 이름을 누르고 결석, 재시험, 숙제 미완료 같은 사유를 선택하면
                한국어 안내 문구를 만들고 문자 발송 기록까지 남깁니다.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <Metric label="원생" value="200명" />
                <Metric label="선생님" value="16명" />
                <Metric label="첫 목표" value="문자 발송" />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-stone-950">오늘의 팔로업</h3>
                <p className="mt-1 text-sm text-stone-500">반 선택 후 학생 이름을 눌러 바로 발송합니다.</p>
              </div>
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                <Bell size={16} />
                4건 대기
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[0.9fr_1fr]">
              <div className="border-b border-stone-200 p-5 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-700">
                  <UsersRound size={17} />
                  중2 수학 A반
                </div>
                <div className="space-y-2">
                  {students.map((student) => (
                    <button
                      key={student.name}
                      className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 py-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-950">{student.name}</p>
                        <p className="mt-1 text-xs text-stone-500">{student.className}</p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-medium text-stone-600">
                        {student.tone}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-stone-700">
                  <ClipboardCheck size={17} />
                  사유 선택
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {reasons.map((reason) => (
                    <button
                      key={reason}
                      className="rounded-md border border-stone-200 px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-emerald-400 hover:bg-emerald-50"
                    >
                      {reason}
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-800">
                    <MessageSquareText size={17} />
                    문자 미리보기
                  </div>
                  <p className="text-sm leading-7 text-stone-700">
                    [데모학원] 안녕하세요. 김민준 학생이 오늘 수업에 결석하여 안내드립니다.
                    확인 부탁드리며, 보강 일정이 필요한 경우 담당 선생님이 다시 안내드리겠습니다.
                  </p>
                  <button className="mt-4 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800">
                    문자 발송
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
