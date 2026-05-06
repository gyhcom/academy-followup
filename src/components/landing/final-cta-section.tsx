import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function FinalCtaSection() {
  return (
    <section id="demo" className="bg-[#123b3b] py-16 text-white sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-semibold text-[#b7e4c7]">파일럿 준비</p>
          <h2 className="mt-4 max-w-3xl break-keep text-4xl font-semibold leading-tight sm:text-5xl">
            실제 문자 발송보다 먼저, 선생님이 이 흐름을 쓰는지 확인합니다.
          </h2>
          <p className="mt-4 max-w-2xl break-keep text-base leading-7 text-white/72">
            로그인 화면, 파일럿 학원 데이터, 문자 미리보기까지 연결되어 있습니다. 다음은 기록
            저장과 dry-run 발송입니다.
          </p>
        </div>
        <Link
          href="/login"
          className="flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-[#123b3b] transition hover:bg-[#f6f4ed]"
        >
          로그인해서 확인하기
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}
