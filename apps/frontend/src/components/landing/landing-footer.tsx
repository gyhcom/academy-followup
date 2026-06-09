import { School } from "lucide-react";
import Link from "next/link";
import { landingNavItems } from "@/lib/landing-content";

export function LandingFooter() {
  return (
    <footer className="bg-[#202557] py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-white text-[#5862d9]">
              <School size={19} />
            </div>
            <p className="font-semibold">Academy Follow-up</p>
          </div>
          <p className="mt-4 max-w-sm break-keep text-sm leading-6 text-white/72">
            학생 관리, 수업 후 처리, 학부모 소통을 연결하는 한국 학원용 운영 SaaS.
          </p>
        </div>

        <div>
          <p className="text-sm font-semibold">페이지</p>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            {landingNavItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold">시작</p>
          <div className="mt-4 grid gap-2 text-sm text-white/72">
            <Link href="/login" className="transition hover:text-white">
              로그인
            </Link>
            <a href="#demo" className="transition hover:text-white">
              데모 요청
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
