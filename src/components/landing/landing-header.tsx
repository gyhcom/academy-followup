"use client";

import { ArrowRight, ChevronDown, LogIn, Menu, School, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { audienceMenuItems, featureMenuGroups, landingNavItems } from "@/lib/landing-content";

export function LandingHeader() {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <header className="relative z-30 text-white">
      {showBanner ? <AnnouncementBanner onClose={() => setShowBanner(false)} /> : null}

      <DesktopHeaderBar />
      <MobileHeaderBar />
    </header>
  );
}

function DesktopHeaderBar() {
  return (
    <div className="hidden border-b border-white/12 bg-[#5862d9] lg:block">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-8">
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
  );
}

function MobileHeaderBar() {
  return (
    <div className="border-b border-[#eaecf5] bg-white text-[#202557] shadow-sm lg:hidden">
      <div className="relative flex min-h-18 w-full items-center gap-2 px-3 pr-14">
        <Link
          href="/"
          className="flex size-10 shrink-0 items-center justify-center rounded-md bg-[#eef0ff] text-[#5862d9]"
          aria-label="Academy Follow-up 홈"
        >
          <School size={21} />
        </Link>

        <Link
          href="/login"
          className="flex min-h-11 w-[7.2rem] min-w-0 shrink items-center justify-center rounded-md border-2 border-[#686d80] px-2 text-[0.82rem] font-semibold text-[#626779]"
        >
          제품 보기
        </Link>
        <a
          href="#demo"
          className="flex min-h-11 w-[7.5rem] min-w-0 shrink items-center justify-center rounded-md bg-[#ef676b] px-2 text-[0.82rem] font-semibold text-white"
        >
          가격 문의
        </a>

        <button
          type="button"
          className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-md bg-[#eef0ff] text-[#5862d9]"
          aria-label="메뉴 열기"
        >
          <Menu size={30} strokeWidth={2.4} className="sr-only" />
          <span className="grid gap-1.5" aria-hidden>
            <span className="block h-0.5 w-7 rounded-full bg-[#5862d9]" />
            <span className="block h-0.5 w-7 rounded-full bg-[#5862d9]" />
            <span className="block h-0.5 w-7 rounded-full bg-[#5862d9]" />
          </span>
        </button>
      </div>
    </div>
  );
}

function AnnouncementBanner({ onClose }: { onClose: () => void }) {
  return (
    <div className="relative overflow-hidden bg-[#ef676b] px-4 py-3 text-center text-sm font-semibold">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <span className="absolute left-[5%] top-[-0.2rem] h-3 w-8 -rotate-[12deg] rounded-full bg-[#58b9c6] sm:left-[17%] sm:top-[-0.75rem] sm:size-8 sm:rounded-full sm:bg-[#ffd35a]" />
        <span className="absolute left-[10%] bottom-1 h-8 w-9 rotate-[-17deg] rounded-[0.35rem] bg-[#9d50dc] sm:left-[24%] sm:top-4 sm:h-8 sm:w-3 sm:rotate-[34deg] sm:rounded-full sm:bg-[#6f8cff]" />
        <span className="absolute right-[8%] top-2 size-7 rounded-full bg-[#f4cc4e] sm:left-[28%] sm:right-auto sm:top-6 sm:h-10 sm:w-10 sm:rotate-[-18deg] sm:rounded-[0.35rem] sm:bg-[#f14fa3]" />
        <span className="absolute right-[22%] top-2 hidden h-7 w-9 rotate-[12deg] rounded-[0.35rem] bg-[#ffe8a3] sm:block" />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl items-center justify-center gap-3">
        <span className="max-w-[15rem] break-keep sm:hidden">학원 운영 SaaS 파일럿을 준비 중입니다</span>
        <span className="hidden sm:inline">파일럿 학원 기준으로 운영 SaaS 구조를 만드는 중입니다</span>
        <a
          href="#demo"
          className="hidden items-center gap-1 underline-offset-4 hover:underline sm:inline-flex"
        >
          데모 보기
          <ArrowRight size={14} />
        </a>
        <button
          type="button"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/14 text-white transition hover:bg-white/22 md:absolute md:right-0 md:top-1/2 md:-translate-y-1/2"
          aria-label="상단 안내 닫기"
        >
          <X size={16} />
        </button>
      </div>
    </div>
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
