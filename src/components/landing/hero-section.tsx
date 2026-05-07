import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  MessageSquareText,
  MonitorSmartphone,
  School,
  Smartphone,
  Tablet,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { demoAcademy } from "@/lib/demo-academy";
import { heroStats, roleCards } from "@/lib/landing-content";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#5862d9] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(46rem,100%)] opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,#000_45%,transparent_100%)]"
        style={{
          backgroundImage:
            "linear-gradient(to right,#ffffff 1px,transparent 1px),linear-gradient(to bottom,#ffffff 1px,transparent 1px)",
          backgroundSize: "3rem 3rem",
        }}
      />
      <MobileHeroContent />
      <DesktopHeroContent />
      <HeroStatsStrip />
    </section>
  );
}

function MobileHeroContent() {
  return (
    <div className="mx-auto max-w-md px-4 pb-14 pt-10 text-center lg:hidden">
      <Link href="/" className="inline-flex items-center justify-center gap-3" aria-label="Academy Follow-up 홈">
        <span className="flex size-10 items-center justify-center rounded-md bg-white text-[#5862d9]">
          <School size={21} />
        </span>
        <span className="text-xl font-semibold">Academy Follow-up</span>
      </Link>

      <h1 className="mt-12 text-[2.82rem] font-semibold leading-[1.12] tracking-normal">
        <span className="block">학원 운영은</span>
        <span className="block">가볍게.</span>
        <span className="block">기록은 한 곳에.</span>
      </h1>

      <div className="mt-10 grid gap-3 text-left">
        {roleCards.map((card, index) => (
          <HeroRoleCard key={card.role} card={card} index={index} mobile />
        ))}
      </div>

      <p className="mt-8 text-base text-white/82">
        이미 사용 중인가요?{" "}
        <Link href="/login" className="font-semibold underline underline-offset-4">
          로그인
        </Link>
      </p>
    </div>
  );
}

function DesktopHeroContent() {
  return (
    <div className="mx-auto hidden max-w-7xl gap-10 px-8 pb-24 pt-20 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
      <div className="flex min-w-0 flex-col justify-center">
        <p className="text-base font-semibold text-white/86">학원 운영을 위한 커뮤니케이션 OS</p>
        <h1 className="mt-5 max-w-3xl text-7xl font-semibold leading-[1.08] tracking-normal">
          <span className="block">학생 관리부터</span>
          <span className="block">학부모 연락까지</span>
          <span className="block">한 곳에서</span>
        </h1>
        <p className="mt-6 max-w-2xl break-keep text-lg font-medium leading-8 text-white/82">
          결석 문자로 시작해 학생·반·선생님 기록까지 연결하는 운영 SaaS입니다.
        </p>

        <div className="mt-8 flex gap-3">
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
              <HeroRoleCard key={card.role} card={card} index={index} />
            ))}
          </div>
        </div>
      </div>

      <ResponsiveDeviceShowcase />
    </div>
  );
}

function HeroRoleCard({
  card,
  index,
  mobile = false,
}: {
  card: (typeof roleCards)[number];
  index: number;
  mobile?: boolean;
}) {
  return (
    <a
      href="#features"
      className={[
        "group flex items-center justify-between gap-4 bg-white text-[#202557] shadow-xl shadow-[#25308d]/10 transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-[#25308d]/18",
        mobile ? "min-h-24 rounded-2xl px-5 py-4" : "min-h-20 rounded-xl p-4",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-[#eef0ff] text-[#5862d9]">
          {index === 0 ? <Building2 size={21} /> : null}
          {index === 1 ? <UsersRound size={21} /> : null}
          {index === 2 ? <ClipboardList size={21} /> : null}
        </div>
        <div className="min-w-0">
          <p className={mobile ? "text-xl font-semibold" : "font-semibold"}>{card.role}</p>
          <p className="mt-1 truncate text-sm text-[#68709b]">{card.title}</p>
        </div>
      </div>
      <ArrowRight size={mobile ? 22 : 18} className="shrink-0 text-[#5862d9] transition group-hover:translate-x-1" />
    </a>
  );
}

function HeroStatsStrip() {
  return (
    <div className="bg-white px-4 py-5 text-[#202557] sm:px-8">
      <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-3">
        {heroStats.map((stat) => (
          <div
            key={stat.label}
            className="min-w-0 rounded-lg border border-[#dfe3ff] bg-white px-4 py-3 sm:rounded-none sm:border-y-0 sm:border-r-0 sm:border-l sm:py-0 sm:first:border-l-0 sm:first:pl-0"
          >
            <p className="text-xs font-semibold text-[#68709b]">{stat.label}</p>
            <p className="mt-1 break-keep text-lg font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResponsiveDeviceShowcase() {
  return (
    <div className="relative mx-auto hidden h-[36rem] w-full max-w-[42rem] min-w-0 overflow-visible lg:block">
      <DesktopDevice />
      <TabletDevice />
      <PhoneDevice />

      <div className="absolute bottom-2 left-1/2 z-20 w-[min(92%,28rem)] -translate-x-1/2 rounded-xl bg-white p-4 text-[#202557] shadow-2xl shadow-[#26328f]/18 sm:bottom-6">
        <div className="flex gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eef0ff] text-[#5862d9]">
            <MonitorSmartphone size={20} />
          </div>
          <div>
            <p className="break-keep text-sm font-semibold">앱 설치 없이 웹으로 접속합니다.</p>
            <p className="mt-1 text-xs leading-5 text-[#68709b]">
              PC에서는 원장 보드, 태블릿에서는 출결, 휴대폰에서는 수업 후 연락을 빠르게 처리합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopDevice() {
  return (
    <div className="absolute left-1 top-5 w-[21rem] rotate-[-7deg] rounded-[1.4rem] border-[6px] border-[#eef0ff] bg-white p-2 text-[#202557] shadow-2xl shadow-[#26328f]/26 sm:left-4 sm:top-10 sm:w-[35rem] lg:left-0 lg:top-16">
      <div className="overflow-hidden rounded-[1rem] border border-[#dfe3ff] bg-[#f7f8ff]">
        <div className="grid min-h-[22rem] grid-cols-[5rem_1fr]">
          <aside className="bg-[#4e58ce] p-3 text-white">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded bg-white" />
              <span className="text-xs font-semibold">academy</span>
            </div>
            <div className="mt-8 grid gap-2 text-xs">
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

          <div className="min-w-0 p-5">
            <div className="flex items-start justify-between gap-3 border-b border-[#dfe3ff] pb-4">
              <div>
                <p className="truncate text-sm font-semibold text-[#68709b]">{demoAcademy.name}</p>
                <h2 className="mt-1 break-keep text-2xl font-semibold">오늘의 학원 운영</h2>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
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
                  {["내 역할 선택", "현재 운영 방식 확인", "파일럿 데모 보기"].map((step, index) => (
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

function TabletDevice() {
  return (
    <div className="absolute right-0 top-24 z-10 w-[17rem] rotate-[8deg] rounded-[1.6rem] border-[7px] border-[#eef0ff] bg-white p-3 text-[#202557] shadow-2xl shadow-[#26328f]/30 sm:right-0 sm:top-28 sm:w-[27rem] lg:top-24">
      <div className="overflow-hidden rounded-[1.1rem] border border-[#dfe3ff] bg-[#f7f8ff]">
        <div className="flex items-center justify-between bg-[#5862d9] px-4 py-3 text-white">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Tablet size={16} />
            중2 수학 A반 출결
          </div>
          <span className="rounded-md bg-white/16 px-2 py-1 text-xs">태블릿</span>
        </div>

        <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 sm:p-4">
          {["김민준", "이서연", "박지호", "최하린", "정도윤", "한서아"].map((student, index) => (
            <div key={student} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#eef0ff] text-sm font-semibold text-[#5862d9]">
                  {student.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{student}</p>
                  <p className="mt-0.5 text-xs text-[#68709b]">{index % 2 === 0 ? "출석" : "확인 필요"}</p>
                </div>
              </div>
              <button className="mt-3 min-h-8 w-full rounded-md bg-[#26b8b1] text-xs font-semibold text-white">
                {index % 2 === 0 ? "출석 완료" : "결석 표시"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PhoneDevice() {
  return (
    <div className="absolute bottom-16 left-3 z-20 w-[7.6rem] rotate-[-5deg] rounded-[1.7rem] border-[6px] border-[#eef0ff] bg-white p-2 text-[#202557] shadow-2xl shadow-[#26328f]/28 sm:bottom-16 sm:left-0 sm:w-[10rem] lg:left-2">
      <div className="overflow-hidden rounded-[1.15rem] border border-[#dfe3ff] bg-white">
        <div className="bg-[#5862d9] px-3 py-3 text-white">
          <div className="flex items-center gap-1.5 text-[0.68rem] font-semibold">
            <Smartphone size={12} />
            수업 후 연락
          </div>
        </div>
        <div className="space-y-3 p-3">
          <div className="rounded-lg bg-[#f1f3ff] p-2">
            <p className="text-[0.7rem] font-semibold">김민준</p>
            <p className="mt-1 text-[0.64rem] leading-4 text-[#68709b]">결석 안내 초안</p>
          </div>
          <div className="rounded-lg bg-[#e6fbf5] p-2">
            <p className="text-[0.64rem] leading-4 text-[#24766f]">
              보강 일정 확인 후 연락드리겠습니다.
            </p>
          </div>
          <button className="min-h-8 w-full rounded-md bg-[#ff6a67] text-[0.68rem] font-semibold text-white">
            수정 후 기록
          </button>
        </div>
      </div>
    </div>
  );
}
