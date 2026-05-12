# 파일럿 안정화 점검 결과 - 2026-05-12

## 목적

친구 원장에게 3분 데모를 보여주기 전, `로그인 -> 홈 -> 문자 -> 출석 -> 관리 -> 문자 템플릿` 흐름이 빈 화면이나 화면 깨짐 없이 이어지는지 확인했습니다.

이번 점검에서는 실제 SMS 발송을 켜지 않았고, `sms_dry_run=true` 기준의 화면/흐름 안정화만 확인했습니다.

## 점검 환경

- 대상 URL: `http://localhost:3000`
- 배포 스모크:
  - `https://academy-followup.vercel.app/` 200 응답 확인
  - `/api/message-templates` 비로그인 요청 401 응답 확인
- 계정: `owner@test.com / 1234`
- 검증 도구: Playwright
- Browser 플러그인 경로: 현재 세션에서 Browser 조작 도구가 노출되지 않아 Playwright로 대체

## 확인 결과

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| 원장 로그인 | 통과 | `/login`에서 `/app` 진입 확인 |
| 홈 첫 화면 | 통과 | `오늘 학원 운영 요약` 표시 |
| 문자 탭 | 통과 | `수업 후 연락` 화면 표시 |
| 출석 탭 | 통과 | 반별 출석부 화면 표시 |
| 관리 탭 | 통과 | 관리 화면 진입 확인 |
| 문자 템플릿 | 통과 | 관리 내부 `사유별 템플릿` 섹션 진입 확인 |
| 모바일 390px | 통과 | 하단 탭바가 visual viewport 안에 고정됨 |
| 태블릿 768px | 통과 | 주요 탭 전환과 템플릿 화면 확인 |
| PC 1440px | 통과 | 관리 템플릿 테이블 확인 |
| 콘솔 오류 | 통과 | 주요 흐름에서 관련 console error/warn 없음 |

## 발견 및 수정

### 모바일 하단 탭바 위치

Playwright 모바일 에뮬레이션에서 `innerWidth=522`, `visualViewport.width=390`처럼 layout viewport와 visual viewport가 달라졌고, fixed 하단 탭바가 실제 화면 아래로 밀리는 문제가 있었습니다.

이 때문에 모바일 관리 화면에서 하단 `문자` 탭을 누르면 실제로는 화면 안쪽의 `반 등록` 버튼이 클릭되는 현상이 발생했습니다.

수정 내용:

- `src/app/layout.tsx`
  - `viewport` metadata 추가
  - `width=device-width`, `initialScale=1`, `viewportFit=cover`
- `src/app/app/app-workspace.tsx`
  - `window.visualViewport.height`를 `--app-vvh` CSS 변수로 동기화
  - 모바일 하단 탭바 위치를 layout viewport가 아니라 visual viewport 기준으로 보정
  - 탭바 폭을 `100dvw` 기준으로 제한

## 스크린샷 증거

로컬 검증 스크린샷:

- `/tmp/academy-stabilize-mobile390-home-final.png`
- `/tmp/academy-stabilize-mobile390-templates-final.png`
- `/tmp/academy-stabilize-tablet768-home-final.png`
- `/tmp/academy-stabilize-tablet768-templates-final.png`
- `/tmp/academy-stabilize-desktop1440-home-final.png`
- `/tmp/academy-stabilize-desktop1440-templates-final.png`

## 남은 리스크

- 실제 SOLAPI 발송은 이번 점검에서 제외했습니다.
- Production은 `main` push 후 Vercel 배포가 완료된 다음 같은 흐름을 한 번 더 보는 것이 좋습니다.
- 실제 학원 데이터 30명 이상을 넣은 뒤, 문자/출석 리스트의 스크롤 체감은 추가 확인이 필요합니다.
