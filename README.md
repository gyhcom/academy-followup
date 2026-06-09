# Academy Follow-up

한국 학원 대상 B2B SaaS 실험 프로젝트입니다.

첫 목표는 거대한 학원관리시스템이 아니라, 선생님이 수업 직후 학생을 클릭하고 `결석`, `재시험`, `숙제 미완료` 같은 사유를 선택하면 학부모에게 보낼 문자를 빠르게 생성/발송하고 기록하는 것입니다.

## 제품 방향

- 기본 시장: 한국 학원
- 기본 언어: 한국어
- 첫 고객: 원생 약 200명, 선생님 약 16명 규모의 수학/영어 학원
- 첫 기능: 학생별 팔로업 문자 발송
- 장기 방향: 학원 운영 CRM / 팔로업 보드

## MVP 한 줄 정의

> 수업별 출석 체크 -> 확인 필요/지각/결석 학생 확인 -> 문자 초안 생성 -> dry-run 발송/기록 저장 -> 필요 시 보강 스케줄 등록

## 배포

- Demo URL: https://academy-followup.vercel.app
- Vercel Project: `academy-followup`
- 현재 배포 방식: GitHub repo 연결을 통한 Vercel 자동 배포
- Connected Repository: `gyhcom/academy-followup`
- Vercel Root Directory: `apps/frontend`

`main` 브랜치에 push하면 Vercel Production Deployment가 생성됩니다.

## 로컬 개발

Next.js 앱은 `apps/frontend` workspace에 있습니다.

```bash
npm install
npm run dev --workspace apps/frontend
npm run lint --workspace apps/frontend
npm run build --workspace apps/frontend
```

로컬 환경변수는 `apps/frontend/.env.example`을 기준으로 `apps/frontend/.env.local`에 설정합니다.

## 주요 사용자

- 원장: 전체 발송 현황, 반별/선생님별 팔로업 누락 확인
- 정규 선생님: 담당 학생의 결석, 재시험, 숙제 미완료 등 학부모 안내
- 보조 선생님: 수업 후 체크, 초안 작성, 필요 시 발송

## 초기 기능

- 학원/선생님/반/학생 등록
- 반별 학생 목록
- 학생별 팔로업 사유 선택
- 한국어 문자 템플릿 생성
- 발송 전 수정/미리보기
- SMS/LMS 발송
- 발송 기록 저장
- 원장용 오늘 발송 현황

## 제외할 기능

초기 버전에서는 아래 기능을 만들지 않습니다.

- 학생 앱
- 학부모 앱
- 실시간 채팅
- 학원비 수납
- 온라인 강의
- 문제은행
- 성적 분석 전체 시스템
- 카카오 알림톡 자동화

## 추천 스택

- Web: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- DB/Auth: Supabase Postgres
- Hosting: Vercel
- SMS: SOLAPI 우선 검토
- Error Tracking: Sentry
- Analytics: PostHog 또는 자체 이벤트 로그

## 개발 문서

- [문서 인덱스](./docs/README.md)
- [제품 기획서](./docs/product/product-plan.md)
- [기술 설계서](./docs/engineering/technical-plan.md)
- [작업 티켓](./docs/planning/tickets.md)
- [친구 원장 데모 시나리오](./docs/testing/demo-scenario.md)
- [Supabase 연결 가이드](./docs/engineering/supabase-setup.md)
