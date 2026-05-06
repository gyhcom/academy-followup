import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function FinalCtaSection() {
  return (
    <section id="demo" className="bg-[#5862d9] py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#ffcb66]">파일럿 준비</p>
          <h2 className="mt-4 max-w-3xl break-keep text-4xl font-semibold leading-tight sm:text-5xl">
            먼저 보여줄 수 있는 제품처럼 만들고, 기능은 단계별로 붙입니다.
          </h2>
          <p className="mt-4 max-w-2xl break-keep text-base leading-7 text-white/72">
            랜딩은 학원 운영 SaaS로 보이게 바꾸고, 앱 내부는 학생/반 관리와 후속 연락 기록부터
            확장합니다.
          </p>
        </div>
        <Link
          href="/login"
          className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#ff6a67] px-5 text-sm font-semibold text-white transition hover:bg-[#ff565b]"
        >
          로그인해서 확인하기
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
