import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  LogIn,
  MessageSquareText,
  MousePointerClick,
  School,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { demoAcademy } from "@/lib/demo-academy";

const painPoints = [
  "결석, 재시험, 숙제 미완료 안내가 선생님마다 다른 방식으로 나감",
  "문자는 보냈지만 누가 언제 어떤 내용으로 보냈는지 기록이 남지 않음",
  "수업 끝난 직후가 가장 바쁜데, 문구를 매번 새로 쓰거나 복붙해야 함",
];

const workflow = [
  {
    title: "반 선택",
    description: "오늘 수업한 반을 고릅니다.",
    icon: ClipboardCheck,
  },
  {
    title: "학생 선택",
    description: "학부모에게 안내가 필요한 학생을 누릅니다.",
    icon: UsersRound,
  },
  {
    title: "사유 선택",
    description: "결석, 재시험, 상담 등 상황을 선택합니다.",
    icon: MousePointerClick,
  },
  {
    title: "문자 확인",
    description: "학원 말투로 만든 초안을 확인하고 기록합니다.",
    icon: MessageSquareText,
  },
];

const outcomes = [
  "선생님은 수업 직후 10초 안에 안내 초안을 만들 수 있습니다.",
  "원장은 오늘 어떤 학생에게 어떤 안내가 나갔는지 확인할 수 있습니다.",
  "학원별 말투와 발신명 기준을 맞춰 학부모 커뮤니케이션을 정리합니다.",
];

const previewStudents = [
  { name: "김민준", status: "결석", meta: "중2 수학 A반" },
  { name: "이서연", status: "재시험", meta: "중3 영어 B반" },
  { name: "박지호", status: "숙제", meta: "고1 수학 C반" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Academy Follow-up 홈">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-700 text-white">
              <School size={21} />
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-950">Academy Follow-up</p>
              <p className="hidden text-xs text-stone-500 sm:block">학원 팔로업 문자 운영 보드</p>
            </div>
          </Link>

          <nav aria-label="주요 메뉴" className="hidden items-center gap-6 text-sm font-medium text-stone-600 md:flex">
            <a href="#problem" className="transition hover:text-stone-950">
              문제
            </a>
            <a href="#workflow" className="transition hover:text-stone-950">
              흐름
            </a>
            <a href="#pilot" className="transition hover:text-stone-950">
              파일럿
            </a>
          </nav>

          <Link
            href="/login"
            className="flex min-h-10 items-center gap-2 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
          >
            <LogIn size={16} />
            로그인
          </Link>
        </div>
      </header>

      <section className="border-b border-stone-200 bg-stone-50">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="min-w-0 max-w-2xl">
            <h1 className="break-keep text-4xl font-semibold leading-tight tracking-normal text-stone-950 sm:text-5xl lg:text-6xl">
              수업 후 학부모 안내,
              <br />
              학생 이름만 누르면 끝.
            </h1>
            <p className="mt-5 max-w-full break-keep text-base leading-8 text-stone-600 sm:text-lg">
              Academy Follow-up은 학원 선생님이 결석, 재시험, 숙제 미완료, 상담 권장
              문자를 빠르게 만들고 기록까지 남기는 운영 보드입니다.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                학원 운영 보드 보기
                <ArrowRight size={17} />
              </Link>
              <a
                href="#workflow"
                className="flex min-h-12 items-center justify-center rounded-md border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
              >
                사용 흐름 보기
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <HeroStat label="예상 원생 규모" value={`${demoAcademy.stats.students}+`} />
              <HeroStat label="선생님/스태프" value={`${demoAcademy.stats.staff}명`} />
              <HeroStat label="핵심 작업" value="문자 팔로업" />
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section id="problem" className="border-b border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              학원 문자 업무는 작아 보여도 운영 품질을 바로 흔듭니다.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              특히 원생 200명 이상, 선생님 10명 이상이 되면 개인 휴대폰과 기억에 의존한
              안내는 금방 흐트러집니다.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {painPoints.map((item) => (
              <div key={item} className="rounded-lg border border-stone-200 bg-stone-50 p-5">
                <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-white text-amber-700 shadow-sm">
                  <Clock3 size={20} />
                </div>
                <p className="text-base font-medium leading-7 text-stone-800">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="border-b border-stone-200 bg-stone-50 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <h2 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
                선생님 기준으로 만든 4단계 흐름
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-600">
                기능을 많이 넣기보다, 수업 직후 가장 자주 반복되는 업무를 한 화면에서 끝내는
                데 집중합니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {workflow.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
                        <Icon size={20} />
                      </div>
                      <p className="text-sm font-semibold text-emerald-700">0{index + 1}</p>
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-stone-950">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
          <div className="rounded-xl border border-stone-200 bg-stone-950 p-5 text-white shadow-sm sm:p-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-medium text-emerald-300">{demoAcademy.name}</p>
                <h2 className="mt-1 text-xl font-semibold">오늘의 팔로업</h2>
              </div>
              <div className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200">
                4건 대기
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[0.85fr_1fr]">
              <div className="space-y-2">
                {previewStudents.map((student, index) => (
                  <div
                    key={student.name}
                    className={[
                      "rounded-lg border px-3 py-3",
                      index === 0
                        ? "border-emerald-400 bg-emerald-400/10"
                        : "border-white/10 bg-white/5",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{student.name}</p>
                      <span className="rounded-md bg-white/10 px-2 py-1 text-xs text-stone-200">
                        {student.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-400">{student.meta}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg bg-white p-4 text-stone-950">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareText size={17} />
                  문자 미리보기
                </div>
                <p className="mt-4 text-sm leading-7 text-stone-700">
                  [{demoAcademy.senderName}] 안녕하세요. 김민준 학생이 오늘 수업에 결석하여
                  안내드립니다. 확인 부탁드리며, 보강 일정이 필요한 경우 담당 선생님이 다시
                  안내드리겠습니다.
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button className="min-h-10 rounded-md border border-stone-200 text-sm font-semibold text-stone-700">
                    수정
                  </button>
                  <button className="min-h-10 rounded-md bg-emerald-700 text-sm font-semibold text-white">
                    발송 준비
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              원장은 기록을 보고, 선생님은 버튼만 누릅니다.
            </h2>
            <div className="mt-6 space-y-4">
              {outcomes.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20} />
                  <p className="text-base leading-7 text-stone-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="pilot" className="border-y border-stone-200 bg-stone-50 py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              첫 파일럿은 실제 학원 운영 규모에 맞춰 검증합니다.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              처음부터 거대한 학원 CRM을 만들기보다, 더배움프라임영수학원의 실제 수업 후
              문자 업무부터 좁게 검증합니다.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <InfoCard icon={<School size={19} />} label="파일럿 학원" value={demoAcademy.name} />
            <InfoCard icon={<UsersRound size={19} />} label="원생 규모" value={`${demoAcademy.stats.students}명 내외`} />
            <InfoCard icon={<ShieldCheck size={19} />} label="운영 인원" value={`${demoAcademy.stats.staff}명 내외`} />
            <InfoCard icon={<FileText size={19} />} label="첫 검증 범위" value="결석·재시험 문자" />
          </div>
        </div>
      </section>

      <section className="bg-emerald-800 py-14 text-white sm:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">학원 문자 팔로업부터 작게 시작합니다.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50">
              다음 단계는 문자 미리보기 API와 dry-run 발송 기록입니다. 실제 비용 없이 파일럿
              흐름을 먼저 검증합니다.
            </p>
          </div>
          <Link
            href="/login"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-50"
          >
            로그인해서 확인하기
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="bg-stone-950 py-8 text-stone-300">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 text-sm sm:px-8 md:flex-row md:items-center md:justify-between">
          <p className="font-semibold text-white">Academy Follow-up</p>
          <p>학원 수업 후 학부모 안내를 빠르게 정리하는 운영 보드</p>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-2xl">
      <div className="absolute -left-4 top-16 hidden h-28 w-28 rounded-full bg-emerald-200/60 blur-3xl sm:block" />
      <div className="absolute -right-4 bottom-10 hidden h-32 w-32 rounded-full bg-sky-200/60 blur-3xl sm:block" />

      <div className="relative rounded-2xl border border-stone-200 bg-white p-3 shadow-xl sm:p-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">모바일 운영 화면</p>
              <p className="text-base font-semibold text-stone-950">오늘의 팔로업</p>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
              <Sparkles size={13} />
              10초 초안
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-stone-600">
            <div className="rounded-md border border-emerald-600 bg-emerald-50 px-2 py-2 text-center text-emerald-800">
              1 반
            </div>
            <div className="rounded-md border border-emerald-600 bg-emerald-50 px-2 py-2 text-center text-emerald-800">
              2 학생
            </div>
            <div className="rounded-md border border-emerald-600 bg-emerald-50 px-2 py-2 text-center text-emerald-800">
              3 문자
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-hidden">
            {["중2 수학 A반", "중3 영어 B반", "고1 수학 C반"].map((className, index) => (
              <div
                key={className}
                className={[
                  "min-w-36 rounded-md border px-3 py-3",
                  index === 0
                    ? "border-emerald-600 bg-white"
                    : "border-stone-200 bg-white/70",
                ].join(" ")}
              >
                <p className="text-sm font-semibold text-stone-950">{className}</p>
                <p className="mt-1 text-xs text-stone-500">학생 18명</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-950">김민준</p>
                <p className="mt-1 text-xs text-stone-500">한들중 · 2학년</p>
              </div>
              <span className="rounded-md border border-stone-200 px-2 py-1 text-xs text-stone-600">
                010-****-0001
              </span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["결석", "재시험", "숙제 미완료", "상담 권장"].map((reason, index) => (
                <div
                  key={reason}
                  className={[
                    "rounded-md border px-3 py-2 text-center text-sm font-semibold",
                    index === 0
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-stone-200 bg-stone-50 text-stone-700",
                  ].join(" ")}
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-emerald-200 bg-white p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-950">
              <MessageSquareText size={16} />
              문자 미리보기
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-700">
              [{demoAcademy.senderName}] 안녕하세요. 김민준 학생이 오늘 수업에 결석하여
              안내드립니다. 확인 부탁드립니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-medium text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-800">
        {icon}
      </div>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-7 text-stone-950">{value}</p>
    </div>
  );
}
