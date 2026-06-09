# Monorepo 전환 계획

## 1. 현재 구조

현재 저장소 루트에는 Next.js 앱이 직접 위치하고, `supabase`, `docs`가 함께 있습니다.

현재 구조는 MVP 개발 속도에는 유리하지만, 장기적으로 Spring Boot 백엔드를 추가하고 IntelliJ에서 루트 프로젝트를 관리하려면 프론트/백엔드 경계가 불명확해질 수 있습니다.

## 2. 목표 구조

```text
academy-followup/
├─ frontend/
│  └─ academy-followup-web/
├─ backend/
│  └─ academy-followup-api/
├─ supabase/
├─ docs/
└─ README.md
```

## 3. 왜 이 구조로 가는지

- IntelliJ에서 루트 프로젝트를 열고 frontend/backend/docs/supabase를 함께 관리하기 위함
- Spring Boot 백엔드 중심 전환을 준비하기 위함
- Next.js는 화면/UX 중심으로 유지하기 위함
- Supabase는 DB/Auth 기준으로 유지하되, API 책임 경계를 명확히 하기 위함
- Codex 작업 단위를 프론트/백엔드/문서로 나누기 위함

## 4. 전환 순서

1. docs 정리
2. Next.js 앱을 `frontend/academy-followup-web`로 이동
3. Vercel Root Directory 변경 및 배포 검증
4. Spring Boot API skeleton을 `backend/academy-followup-api`에 추가
5. read-only API부터 Spring Boot로 분리
6. audit/message/report 순서로 이전 검토
7. attendance/makeup은 마지막에 검토

## 5. 리스크

- Vercel Root Directory 설정 누락
- import alias 깨짐
- package script 경로 변경
- 환경변수 설정 누락
- Codex 작업 컨텍스트 증가
- 프론트/백엔드 책임 경계 혼란

## 6. 롤백 기준

- 로컬 build 실패
- Vercel Preview 실패
- import alias 대량 오류
- production URL 접근 실패
- 환경변수 누락으로 로그인/API가 깨짐

## 7. 완료 기준

- 문서 기준 정리 완료
- 현재 앱 구조 이동 전 준비 완료
- 다음 이슈로 Next.js 이동 작업 가능
- Vercel 배포 기준과 롤백 기준이 문서화됨
