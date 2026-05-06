import { LogIn, School } from "lucide-react";
import Link from "next/link";
import { landingNavItems } from "@/lib/landing-content";

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[#183c3c]/10 bg-[#f6f4ed]/92 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="Academy Follow-up 홈">
          <div className="flex size-10 items-center justify-center rounded-md bg-[#123b3b] text-white">
            <School size={21} />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold text-[#123b3b]">Academy Follow-up</p>
            <p className="hidden text-xs text-[#62716c] sm:block">학원 후속 연락 운영 도구</p>
          </div>
        </Link>

        <nav
          aria-label="주요 메뉴"
          className="hidden items-center gap-6 text-sm font-medium text-[#42534d] md:flex"
        >
          {landingNavItems.map((item) => (
            <a key={item.href} href={item.href} className="transition hover:text-[#123b3b]">
              {item.label}
            </a>
          ))}
        </nav>

        <Link
          href="/login"
          className="flex min-h-10 shrink-0 items-center gap-2 rounded-md bg-[#123b3b] px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0b2f2f] sm:px-4"
        >
          <LogIn size={16} />
          로그인
        </Link>
      </div>
    </header>
  );
}
