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
  "선생님마다 문구가 다름",
  "누가 보냈는지 기록이 없음",
  "수업 후 복붙이 반복됨",
];

const workflow = [
  {
    title: "반 선택",
    description: "오늘 처리할 반을 고릅니다.",
    icon: ClipboardCheck,
  },
  {
    title: "학생 선택",
    description: "안내가 필요한 학생을 누릅니다.",
    icon: UsersRound,
  },
  {
    title: "사유 선택",
    description: "결석, 재시험, 상담 등 사유를 고릅니다.",
    icon: MousePointerClick,
  },
  {
    title: "문자 확인",
    description: "초안을 확인하고 기록을 남깁니다.",
    icon: MessageSquareText,
  },
];

const outcomes = [
  "선생님은 10초 안에 초안을 만듭니다.",
  "원장은 발송 기록을 확인합니다.",
  "학원 말투를 일정하게 유지합니다.",
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
            <div className="flex size-10 items-center justify-center rounded-lg bg-stone-950 text-white">
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

      <section className="border-b border-stone-200 bg-white">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.9fr_1.1fr] lg:py-20">
          <div className="min-w-0 max-w-2xl">
            <h1 className="break-keep text-4xl font-semibold leading-tight tracking-normal text-stone-950 sm:text-5xl lg:text-6xl">
              결석·재시험 문자,
              <br />
              아직도 선생님마다 따로 보내나요?
            </h1>
            <p className="mt-5 max-w-full break-keep text-base leading-8 text-stone-600 sm:text-lg">
              수업 끝나고 10초. 반, 학생, 사유만 선택하면 학부모 안내 초안과 기록이
              남습니다.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-stone-950 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
              >
                운영 보드 보기
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
              <HeroStat label="파일럿 규모" value={`${demoAcademy.stats.students}+`} />
              <HeroStat label="운영 인원" value={`${demoAcademy.stats.staff}명`} />
              <HeroStat label="첫 검증" value="결석·재시험" />
            </div>
          </div>

          <ProductPreview />
        </div>
      </section>

      <section id="problem" className="border-b border-stone-200 bg-white py-16 sm:py-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              먼저 이 문제부터 줄입니다.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              원생과 선생님이 늘면 문자 하나도 기억과 개인 휴대폰에 맡기기 어렵습니다.
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
                휴대폰에서 끝나는 4단계
              </h2>
              <p className="mt-4 text-base leading-7 text-stone-600">
                반, 학생, 사유, 문자 확인. 선생님 화면은 이 네 단계만 먼저 잘하면 됩니다.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {workflow.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-md bg-white text-stone-800 shadow-sm">
                        <Icon size={20} />
                      </div>
                      <p className="text-sm font-semibold text-stone-500">0{index + 1}</p>
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
                <p className="text-sm font-medium text-stone-300">{demoAcademy.name}</p>
                <h2 className="mt-1 text-xl font-semibold">오늘의 팔로업</h2>
              </div>
              <div className="rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-stone-100">
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
                        ? "border-white/35 bg-white/10"
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
                  <button className="min-h-10 rounded-md bg-stone-950 text-sm font-semibold text-white">
                    발송 준비
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-semibold tracking-normal text-stone-950 sm:text-4xl">
              원장은 기록을 보고, 선생님은 선택만 합니다.
            </h2>
            <div className="mt-6 space-y-4">
              {outcomes.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 shrink-0 text-stone-800" size={20} />
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
              첫 파일럿은 좁게 검증합니다.
            </h2>
            <p className="mt-4 text-base leading-7 text-stone-600">
              더배움프라임영수학원에서 결석·재시험 문자 흐름부터 확인합니다.
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

      <section className="bg-stone-950 py-14 text-white sm:py-16">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">실제 발송 전, 흐름부터 검증합니다.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-300">
              미리보기, 기록 저장, dry-run, 중복 방지 후 실제 문자 수신 테스트로 넘어갑니다.
            </p>
          </div>
          <Link
            href="/login"
            className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-stone-950 transition hover:bg-stone-100"
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
      <div className="relative rounded-2xl border border-stone-200 bg-white p-3 shadow-xl sm:p-4">
        <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-stone-500">모바일 운영 화면</p>
              <p className="text-base font-semibold text-stone-950">오늘의 팔로업</p>
            </div>
            <div className="flex items-center gap-1 rounded-md bg-stone-900 px-2 py-1 text-xs font-semibold text-white">
              <Sparkles size={13} />
              10초 초안
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-stone-600">
            <div className="rounded-md border border-stone-300 bg-white px-2 py-2 text-center text-stone-800">
              1 반
            </div>
            <div className="rounded-md border border-stone-300 bg-white px-2 py-2 text-center text-stone-800">
              2 학생
            </div>
            <div className="rounded-md border border-stone-300 bg-white px-2 py-2 text-center text-stone-800">
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
                    ? "border-stone-950 bg-white"
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
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-200 bg-stone-50 text-stone-700",
                  ].join(" ")}
                >
                  {reason}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-stone-300 bg-white p-3">
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
      <div className="mb-4 flex size-10 items-center justify-center rounded-md bg-stone-100 text-stone-800">
        {icon}
      </div>
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-7 text-stone-950">{value}</p>
    </div>
  );
}
