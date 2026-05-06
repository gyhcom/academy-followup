import { ArrowRight, ChevronDown, LogIn, School, X } from "lucide-react";
import Link from "next/link";
import { audienceMenuItems, featureMenuGroups, landingNavItems } from "@/lib/landing-content";

export function LandingHeader() {
  return (
    <header className="relative z-30 bg-[#5862d9] text-white">
      <div className="bg-[#ff5c62] px-4 py-3 text-center text-sm font-semibold">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-3">
          <span className="sm:hidden">운영 SaaS 구조를 만드는 중</span>
          <span className="hidden sm:inline">파일럿 학원 기준으로 운영 SaaS 구조를 만드는 중입니다</span>
          <a href="#demo" className="hidden items-center gap-1 underline-offset-4 hover:underline sm:inline-flex">
            데모 보기
            <ArrowRight size={14} />
          </a>
          <X size={16} className="hidden opacity-80 md:block" aria-hidden />
        </div>
      </div>

      <div className="border-b border-white/12">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Academy Follow-up 홈">
          <div className="flex size-10 items-center justify-center rounded-md bg-white text-[#5862d9]">
            <School size={21} />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-base font-semibold">Academy Follow-up</p>
            <p className="hidden text-xs text-white/72 sm:block">학원 운영 커뮤니케이션 OS</p>
          </div>
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="hidden items-center gap-7 text-sm font-semibold text-white/86 lg:flex"
        >
          <MegaNav label="누구를 위한 서비스" href="#audiences">
            <div className="grid gap-3 sm:grid-cols-2">
              {audienceMenuItems.map((item) => (
                <a key={item.title} href="#audiences" className="rounded-lg p-3 text-[#1f2552] transition hover:bg-[#f1f3ff]">
                  <span className="text-sm font-semibold">{item.title}</span>
                  <span className="mt-1 block break-keep text-xs leading-5 text-[#60688e]">{item.body}</span>
                </a>
              ))}
            </div>
          </MegaNav>

          <MegaNav label="기능" href="#features">
            <div className="grid gap-5 sm:grid-cols-3">
              {featureMenuGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-sm font-semibold text-[#1f2552]">{group.title}</p>
                  <div className="mt-3 grid gap-2">
                    {group.items.map((item) => (
                      <a key={item} href="#features" className="rounded-md px-2 py-1.5 text-sm text-[#60688e] transition hover:bg-[#f1f3ff] hover:text-[#1f2552]">
                        {item}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MegaNav>

          {landingNavItems.slice(2).map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-white">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/login"
            className="hidden min-h-11 items-center justify-center rounded-md border border-white/50 px-4 text-sm font-semibold text-white transition hover:bg-white/10 sm:flex"
          >
            로그인
          </Link>
          <Link
            href="/login"
            className="hidden min-h-11 items-center gap-2 rounded-md bg-[#ff6a67] px-3 text-sm font-semibold text-white shadow-lg shadow-[#26328f]/20 transition hover:bg-[#ff565b] sm:flex sm:px-4"
          >
            <LogIn size={16} />
            시작하기
          </Link>
        </div>
        </div>
      </div>
    </header>
  );
}

function MegaNav({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <a href={href} className="flex items-center gap-1.5 transition hover:text-white">
        {label}
        <ChevronDown size={15} />
      </a>
      <div className="invisible absolute left-1/2 top-full w-[42rem] -translate-x-1/2 pt-5 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-xl border border-[#dfe3ff] bg-white p-4 shadow-2xl shadow-[#273091]/20">
          {children}
        </div>
      </div>
    </div>
  );
}
