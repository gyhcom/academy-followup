# 현재 이슈 정리

이 문서는 현재 실행 카드와 후속 후보를 한눈에 보기 위한 요약입니다.  
상세 백로그는 [작업 티켓](../planning/tickets.md)을 기준으로 유지합니다.

| 티켓 | 상태 | 우선순위 | 목적 | 선행 조건 | 다음 액션 |
| --- | --- | --- | --- | --- | --- |
| T-617 파일럿 seed 적용 상태 정합성 점검 | 완료 | P0 | 200명 파일럿 기준 데이터 고정 | Supabase verify SQL 실행 | 정상화된 기준값 유지 |
| T-620 assistant 발송 제한 실계정 UAT | 완료 | P1 | 보조 선생님 발송 제한 확인 | assistant 계정 준비 | 운영 중 권한 회귀 확인 |
| T-619 전체문자 발송 전 대상/중복 제외 카운트 미리보기 | 완료 | P1 | 전체문자 전 대상/중복 제외 수 확인성 강화 | 200명 데이터 | 파일럿에서 원장 이해도 확인 |
| T-618 선생님/보조 홈 요약 담당 기준 정리 | 완료 | P1 | 담당 반 기준 오늘 할 일 표시 | 역할별 데이터 검증 | 운영 중 역할별 회귀 확인 |
| T-621 개발자식 용어 제거 | 완료 | P0 | `dry-run`, `pending`, `팔로업` 등 사용자 문구 정리 | UX 점검 문서 | 운영 중 새 문구 회귀 확인 |
| T-622 홈 상태 문구 통일 | 완료 | P1 | 홈의 문자 대상/미발송/완료 표현 통일 | T-621 방향 확정 | 운영 중 홈 문구 회귀 확인 |
| T-623 위험 동작 버튼 스타일/확인 문구 통일 | 완료 | P1 | 삭제/해제/발송/개인정보 포함 액션 실수 방지 | 현재 버튼 목록 점검 | 운영 중 위험 액션 회귀 확인 |
| T-624 빈 상태 문구 개선 | 완료 | P2 | 빈 화면에서 다음 행동 안내 | role별 빈 상태 확인 | 운영 중 빈 상태 문구 회귀 확인 |
| T-625 assistant 발송 버튼 권한 안내 개선 | 완료 | P2 | 보조 선생님 발송 제한을 버튼/문구에서 사전 안내 | T-620 실계정 UAT | 운영 중 assistant 권한 문구 회귀 확인 |
| T-604 운영 전환 릴리즈 체크리스트 | 완료 | P0 | 실제 운영 전 배포/권한/실데이터/SMS/Spring 상태 점검 | T-625 완료 | 운영 전환 체크리스트 기준으로 릴리즈 확인 |
| T-501 실제 구조 데이터 운영 전환 검증 | 준비 완료 | P0 | 실제 구조 20~30명 데이터로 운영 흐름 검증 | 운영 전환 체크리스트 | CSV 템플릿 기준으로 원장 확인 후 투입 |
| T-310 SOLAPI 테스트 번호 제한 발송 | 준비 완료 | P0 | 테스트 번호 1건 실제 수신으로 발송 전환 위험 확인 | 실데이터 dry-run 확인 | SOLAPI env/발신번호/테스트 번호 확정 후 실행 |
| T-628 docs 정리 및 monorepo 전환 준비 | 완료 | P1 | 문서 기준 정리와 구조 전환 준비 | 현재 docs 목록 점검 | 기준 문서 유지 |
| T-629 Next.js 앱 frontend 디렉터리 이동 | 완료 | P1 | monorepo 목표 구조로 프론트 이동 | T-628 완료 | Vercel frontend 기준 유지 |
| T-630 Spring Boot backend skeleton 추가 | 완료 | P1 | 백엔드 전환을 위한 최소 Spring Boot 앱 추가 | T-629 완료 | 로컬 backend 유지 |
| T-631 Spring Boot 인증/권한 컨텍스트 | 완료 | P1 | Supabase token 기반 사용자/학원/역할 컨텍스트 구성 | T-630 완료 | `/api/auth/context` smoke 유지 |
| T-632 report summary API 첫 이관 | 완료 | P1 | `GET /api/reports/summary`를 Spring Boot로 우선 이전 | T-631 완료 | 로컬 Spring API와 기존 Next API 숫자 회귀 확인 |
| T-633 Railway 배포 준비 | 보류 | P1 | `apps/backend`를 Railway 서비스로 배포 가능하게 설정 | T-632 로컬 검증 | Railway 결제 전까지 보류 |
| T-634 Frontend-Spring 로컬 연동 | 완료 | P1 | 로컬 frontend에서 Spring report API 우선 호출 및 fallback 구성 | T-632 | `NEXT_PUBLIC_BACKEND_API_URL`은 로컬에서만 사용 |
| T-635 로컬 Spring 검증 루틴 | 완료 | P1 | AI 도움 없이 로컬 Spring 검증을 반복할 수 있게 문서/스크립트 제공 | T-632 | 검증 루틴 유지 |
| T-636 로컬 Spring 전환 소스 정리 | 완료 | P1 | 다음 API 이관 전 Supabase REST/fallback 패턴 정리 | T-635 | 공통 client/helper 기반 유지 |
| T-637 Spring audit logs 조회 API 이관 | 완료 | P1 | 최근 변경 이력 조회를 Spring Boot read-only API로 이전 | T-636 | 로컬 Spring 우선 호출과 SSR fallback 유지 |
| T-638 Spring 전환 완료 기준 문서화 | 완료 | P1 | API 위험도와 오늘의 Spring 완료 기준 고정 | T-637 | high-risk API는 파일럿 안정화 전 Next.js 유지 |
| T-639 저위험 Spring API 추가 이관 | 완료 | P1 | health/templates/message preview/bulk preview를 Spring에 추가 | T-638 | 로컬 Spring API와 Next.js fallback 회귀 확인 |
| T-640 운영 설정/문자 템플릿 저장 API 이관 | 완료 | P1 | 설정/템플릿 저장을 Spring에 추가하고 audit log 유지 | T-639 | 로컬 Spring API와 Next.js fallback 회귀 확인 |
| T-641 리포트 CSV 내보내기 API 이관 | 완료 | P1 | 학생/출석/문자/이력 CSV 다운로드를 Spring에 추가 | T-640 | 개인정보 마스킹과 Next.js fallback 회귀 확인 |
| T-642 연락 기록 followups API 이관 | 완료 | P1 | 연락 기록 조회/저장을 Spring에 추가 | T-641 | 문자/출석/학생 상세 fallback 회귀 확인 |
| T-643 출석 attendance API 이관 | 완료 | P1 | 출석 조회/저장을 Spring에 추가 | T-642 | 출석 탭 Spring 우선 호출과 Next.js fallback 회귀 확인 |
| T-644 학생/반/스케줄 API 이관 | 완료 | P1 | 단건 학생/반/스케줄 저장을 Spring에 추가 | T-643 | 관리 탭과 보강 등록 fallback 회귀 확인 |
| T-645 구성원 members API 이관 | 완료 | P1 | 구성원 조회/생성/수정을 Spring에 추가 | T-644 | Auth/profile rollback과 Next.js fallback 회귀 확인 |
| T-646 개별 문자 발송 API 이관 | 완료 | P1 | 개별 문자 발송/dry-run/로그 저장을 Spring에 추가 | T-645 | 문자/출석 패널 Spring 우선 호출과 Next.js fallback 회귀 확인 |
| T-647 전체문자 발송 API 이관 | 완료 | P1 | 전체문자 발송/dry-run/로그 저장을 Spring에 추가 | T-646 | 전체문자 화면 Spring 우선 호출과 Next.js fallback 회귀 확인 |
| T-648 플랫폼 학원 관리 API 이관 | 완료 | P1 | 플랫폼 학원 생성/상태 관리를 Spring에 추가 | T-647 | 플랫폼 콘솔 Spring 우선 호출과 Next.js fallback 회귀 확인 |
| T-649 남은 운영 API 이관 | 완료 | P1 | bulk 학생/스케줄, 타 학원 수업, 스케줄 공유 API를 Spring에 추가 | T-648 | 관리/학생 상세/보강 화면 Spring 우선 호출과 Next.js fallback 회귀 확인 |
| T-650 Spring 전환 배포 준비 완료 | 완료 | P1 | Railway 배포 준비 문서와 최종 전환 기준 고정 | T-649 | Railway 결제 후 배포 smoke test 진행 |
| T-654 출석부 지각/결석 다중 선택 일괄 문자 | 완료 | P1 | 출석부에서 지각/결석 학생을 여러 명 선택해 학생명 변수 치환 문자 기록/테스트 발송 처리 | 출석부 문자 흐름, SOLAPI dry-run 유지 | 실제 수업 단위 dry-run 검증 |
| T-635 출석부 중심 제품 방향 재정의 및 후속 이슈 분리 | 완료 | P0 | 원장 미팅 결과를 기준으로 제품 방향을 출석부 중심으로 재정의 | 월요일 원장 미팅 | 후속 이슈 #73~#78 순서대로 검토 |
| T-655 역할별 운영 콘솔 메뉴 구조 재정의 | 완료 | P1 | PC 우선으로 원장/관리자 운영 콘솔과 선생님 수업 처리 메뉴를 분리 | T-635 제품 방향 문서 | 역할별 메뉴 회귀 확인 |
| T-657 출석부 달력 보기 및 날짜 드릴다운 UI 구현 | 완료 | P0 | 원장/관리자가 월간 달력에서 날짜를 선택하고 수업/학생/연락 필요 상세와 학생 drawer를 확인 | 기존 출석/학생/연락 데이터 | 운영 데이터 투입 후 실제 날짜별 count 회귀 확인 |
| T-657 PC 운영 콘솔 Shell 재정의 | 완료 | P1 | PC 원장/관리자 화면을 왼쪽 사이드바 기반 업무 콘솔로 고정 | T-655 메뉴 구조 정리 | PC 1440px 기준 회귀 확인 유지 |
| T-656 출석부 장부형/테이블형 레이아웃 설계 | 부분 완료 | P0 | PC 출석부를 학생 row 중심 장부형 구조로 설계 | T-657 PC Shell 정리 | 달력/오늘 처리 병행 기준으로 후속 UI 세부 보정 |
| T-667 출석부/문자 액션 정합성 점검 | 완료 | P0 | 표시 전용 보드/비활성 CTA/초안 적용 버튼을 실제 동작 또는 명확한 안내로 정리 | T-657 달력 보기, T-654 일괄 문자 | 운영 전환 전 버튼별 실제 동작 회귀 확인 |
| T-668 운영 DB 정리 실행 기준 고정 | 완료 | P0 | seed-only 정리와 전체 운영 데이터 리셋 모드를 분리하고 실제 데이터 투입 전 runbook을 고정 | T-667 액션 정합성 정리 | Supabase SQL Editor에서 Preview -> Cleanup -> Verify 실행 |
| T-670 학생 CSV 템플릿 한글 깨짐 수정 + 퇴원 처리 안내 개선 | 완료 | P0 | Excel용 학생 CSV 템플릿 인코딩을 보정하고, 학생 삭제 대신 퇴원 처리 기준을 화면에 안내 | 학생 CSV 일괄 등록, 학생 수정 폼 | 실제 운영 데이터 투입 전 템플릿 다운로드와 퇴원 처리 안내 확인 |
| T-671 관리 콘솔 Command Center 제품화 리디자인 | 완료 | P1 | 관리 화면의 큰 히어로/보드형 메뉴를 제거하고 상태 요약 + 섹션 목록 navigation 중심의 업무 콘솔로 정리 | T-670 CSV/퇴원 처리 안내 | PC/모바일 관리 화면 섹션 이동 회귀 확인 |
| T-672 B2B 업무 콘솔 디자인 시스템 하드닝 | 완료 | P1 | 앱 전체의 둥근 카드/파스텔 상태색/강한 그림자를 줄이고 저채도 lozenge, row, border 중심의 업무 콘솔 톤으로 통일 | T-671 관리 콘솔 제품화 | 주요 화면 PC/모바일 시각 회귀 확인 |
| T-673 Attio 기준 전체 UI 문법 전환 | 완료 | P1 | 메인 레퍼런스를 Attio형 record/list/detail panel로 고정하고 shell, 출석부, 문자, 관리 화면의 공통 문법을 정렬 | T-672 디자인 시스템 하드닝 | PC 1440px 기준 record/list/detail 구조와 모바일 회귀 확인 |

## 출석부 중심 후속 이슈

주의: 기존 문서에는 Spring 전환 작업으로 T-636~T-641 번호가 이미 사용되어 있습니다. 아래 GitHub Issue는 월요일 원장 미팅 요청 원문 번호를 유지해 생성했으며, 문서에서는 “출석부 중심 후속 이슈”로 별도 구분합니다.

| GitHub Issue | 티켓 | 우선순위 | 목표 | 제외 범위 | 추천 브랜치 |
| --- | --- | --- | --- | --- | --- |
| #73 | T-636 출석부 메뉴 우선순위 및 상태 단순화 | P0 | 출석부를 핵심 메뉴로 올리고 출석/지각/결석 상태를 단순화 | 달력형 출석부, 문자 변수, 교재비 | `codex/t-636-attendance-menu-status-simplification` |
| #74 | T-637 출석부 다중 선택 및 지각/결석 일괄 처리 | P0 | 여러 학생 선택 후 지각/결석 상태 변경 | 실제 문자 발송 | `codex/t-637-attendance-bulk-status-update` |
| #75 | T-638 선택 학생 일괄 문자 및 이름 변수 치환 | P0 | 선택 학생에게 동일 템플릿을 학생명 변수만 치환해서 발송 | 수강료/교재비 변수 | `codex/t-638-attendance-bulk-message-variables` |
| #76 | T-639 학생 식별 정보 및 개인 메모 개선 | P1 | 동명이인 구분, 성별 아이콘, 휴대폰 일부 표시, 개인 메모 | 전화번호 원문 노출 확대, 전체 상담 CRM | `codex/t-639-student-identity-notes` |
| #77 | T-640 달력형 출석부 UX 검토 | P1 | 날짜/수업시간 기준의 달력형 출석부 구조 검토 | 바로 전체 달력 구현, DB schema 변경 | `codex/t-640-calendar-attendance-ux-review` |
| #78 | T-641 교재비/수강료 변수 및 월말 안내 문자 설계 | P2 | 교재비/수강료 금액 기록과 월말 안내 문자 설계 | 결제/수납/미납/청구서/영수증 | `codex/t-641-fee-material-message-design` |
| #80 | T-655 역할별 운영 콘솔 메뉴 구조 재정의 | P1 | 원장/관리자 PC 운영 콘솔 메뉴와 선생님 수업 처리 메뉴 분리 | 출석부 장부형 대개편, DB/API/Spring 변경 | `codex/t-655-role-based-operating-console-nav` |
| #81 | T-656 출석부 장부형/테이블형 레이아웃 설계 | P0 | PC 출석부를 학생 row, 다중 선택, batch action, 우측 문자/메모 패널 중심으로 설계 | T-655 PR에서 실제 출석부 대개편 구현 | `codex/t-656-attendance-ledger-layout-design` |
| #83 | T-657 PC 운영 콘솔 Shell 재정의 | P1 | PC `/app`을 왼쪽 사이드바 기반 업무 콘솔 shell로 전환 | 출석부 장부형 구현, DB/API/Spring 변경 | `codex/t-657-pc-operating-console-shell` |
| #97 | T-657 출석부 달력 보기 및 날짜 드릴다운 UI 구현 | P0 | 월간 달력에서 날짜를 클릭해 날짜별 수업/학생/연락 필요 상세와 학생 drawer를 확인 | DB/API/Spring 변경, 외부 캘린더 라이브러리 | `codex/t-657-attendance-calendar-drilldown` |

## 출석부 달력 후속 후보

| 후보 | 우선순위 | 목표 |
| --- | --- | --- |
| T-658 달력 보기용 출석 요약 API 추가 | P1 | 월간 달력 cell의 수업/학생/미체크/연락 필요 요약을 서버에서 안정적으로 제공 |
| T-659 학생 스케줄 drawer 데이터 보강 | P1 | 학생 drawer의 월간 출석 이력, 최근 연락 기록, 주간 스케줄을 더 정확한 조회 데이터로 보강 |
| T-660 날짜별 연락 필요 학생 일괄 문자 연결 | P1 | 날짜 상세의 연락 필요 탭에서 여러 학생 선택 후 문자 처리로 연결 |
| T-661 학생별 월간 장부 matrix 구현 | P2 | 학생 row + 날짜 column 기반 월간 출석 matrix 구현 |

## 현재 추천 진행 순서

| 순서 | 티켓 | 우선순위 | 이유 |
| --- | --- | --- | --- |
| 1 | T-668 운영 DB 정리 실행 기준 고정 | P0 | 현재 DB에 200명 seed 외 리허설 데이터가 섞일 수 있으므로, seed-only 정리와 전체 리셋 모드를 분리한 뒤 실제 실행해야 합니다. |
| 2 | T-501 실제 구조 데이터 운영 전환 검증 | P0 | 정리된 DB에 실제 반 1~2개/학생 20~30명 구조를 넣고 출석/문자/관리 흐름을 검증해야 합니다. |
| 3 | T-310 SOLAPI 테스트 번호 제한 발송 | P0 | dry-run만으로는 실제 문자 전환 리스크를 확인할 수 없으므로, 테스트 번호 1건 수신과 `message_logs` 상태를 확인해야 합니다. |
| 4 | T-658 달력 보기용 출석 요약 API 추가 | P1 | 현재 달력 월간 요약은 프론트 조합 중심이라 실제 데이터가 늘면 성능/정합성 리스크가 있습니다. |
| 5 | T-660 날짜별 연락 필요 학생 일괄 문자 연결 | P1 | 달력 날짜 상세의 `연락 필요` 탭을 실제 업무 처리로 연결하면 원장/선생님 사용성이 커집니다. |
| 6 | T-659 학생 스케줄 drawer 데이터 보강 | P1 | drawer가 제품처럼 보이려면 월간 출석/최근 연락/주간 스케줄 데이터 정확도를 더 높여야 합니다. |
| 7 | T-708 보안/개인정보 운영 체크리스트 | P1 | 실제 개인정보와 문자 발송을 다루기 전 외부 설명 가능한 운영 기준이 필요합니다. |

## 현재 원칙

- GitHub Issue는 실제 실행 카드입니다.
- 문서만으로 끝나는 판단은 `docs/active`에 남기고, 구현이 필요할 때만 GitHub Issue를 만듭니다.
- 6월 중순까지 Spring Boot 전환을 시작할 수 있도록 구조 변경은 작게, API 이전은 `report summary`부터 순차적으로 진행합니다.
- Frontend는 Vercel, Spring Boot backend는 Railway를 기준으로 배포합니다.
- Railway 결제와 배포는 보류하고, 우선 로컬 Spring Boot로 API 이전과 fallback을 검증합니다.
- Spring API는 기존 Next.js API fallback을 유지한 상태에서만 production에 연결합니다.
- 로컬 Spring 소스는 다음 API 이관 전 공통 Supabase REST client와 frontend fallback helper를 기준으로 정리합니다.
- 현재 Spring 전환 완료 기준은 기존 Next.js API를 즉시 제거하는 것이 아니라, 운영 API를 Spring Boot에 추가하고 frontend에서 Spring 우선 호출 + Next.js fallback을 유지하며 Railway 배포 준비 문서를 갖춘 상태입니다.
- 주요 운영 API는 Spring Boot에 추가됐고 Next.js fallback을 유지합니다. 남은 Next 전용 라우트인 `/api/auth/redirect-target`는 로그인 화면용 Next server helper라 Spring 전환 대상 운영 API에서 제외합니다.
- 실제 Railway 배포와 Vercel `NEXT_PUBLIC_BACKEND_API_URL` 설정은 결제 후 smoke test를 통과한 뒤 별도 승인으로 진행합니다.
- PC 홈/관리 콘솔 개선은 main에 반영됐고 Vercel frontend 자동 배포 기준입니다.
- 실제 운영 전환 기준 문서는 `docs/testing/operations-real-data-transition-2026-06.md`, SOLAPI 테스트 번호 기준은 `docs/testing/solapi-test-number-readiness-2026-06.md`를 봅니다.
- 월요일 원장 미팅 이후 제품 중심이 출석부로 이동할 가능성이 커졌습니다. 기준 문서는 `docs/product/attendance-led-product-direction-2026-06.md`를 봅니다.
- PC 사용 비중이 커졌으므로 원장/관리자는 “학원 운영 콘솔”, 선생님/보조 선생님은 “수업 처리 도구”처럼 메뉴와 화면 밀도를 분리합니다.
- Spring Boot/Railway 후속 작업보다 출석부 중심 요구사항 P0를 먼저 정리합니다. 고객 미팅 결과에 따라 UI/API 우선순위가 바뀔 수 있습니다.
- 7월 13일 전까지는 파일럿 운영 개선과 안정화를 우선합니다.
- 실제 운영 학생은 앱에서 물리 삭제하지 않고 `퇴원` 상태로 관리합니다. reset/seed SQL은 개발·시연 데이터 정리용이며 실제 운영 DB에서는 실행하지 않습니다.
- 디자인 기준은 여러 상용 제품을 섞지 않고 Attio형 `record/list/detail panel` 문법으로 고정합니다. 출석부만 학원 장부 도메인에 맞게 날짜/수업/학생 record 구조로 보정합니다.
