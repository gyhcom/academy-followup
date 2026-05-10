# 학생 관리 모바일 UX 점검 결과 - 2026-05-10

대상 티켓: `T-409`

대상 브랜치: `main`

## 요약

대량 학생 상태에서 선생님/원장이 핸드폰으로 학생 관리 화면을 볼 때 불편한 지점을 줄이기 위해 학생 상세와 필터 UX를 조정했습니다.

모바일에서는 학생 목록을 유지한 채 학생 상세를 하단 시트로 열고, 필터는 기본 접힘 상태로 둡니다. PC에서는 기존 좌우 분할 레이아웃을 유지합니다.

## 확인 데이터

- 테스트 계정: `owner@test.com`
- 학생 수: 107명
- 화면: 관리 > 학생 관리

## 확인 결과

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| 원장 로그인 | 통과 | `/app` 진입 |
| 관리 학생 목록 진입 | 통과 | 학생 관리 목록 표시 |
| 필터 접힘 기본 상태 | 통과 | 모바일에서 검색과 목록이 먼저 보임 |
| 필터 버튼으로 필터 표시 | 통과 | 반/상태/스케줄/정렬 select 표시 |
| 학생 선택 시 하단 시트 표시 | 통과 | 학생 상세, 스케줄, 최근 팔로업 표시 |
| 하단 시트 닫기 | 통과 | 목록 화면으로 복귀 |
| 모바일 390px | 통과 | 가로 overflow 없음 |
| iPad 세로 | 통과 | 가로 overflow 없음 |
| iPad 가로 | 통과 | 가로 overflow 없음 |
| PC 1440px | 통과 | 가로 overflow 없음 |

## 스크린샷

스크린샷은 로컬 `.local/mobile-ux/` 아래에 저장했습니다.

- `.local/mobile-ux/01-mobile-list-filter-collapsed.png`
- `.local/mobile-ux/02-mobile-filter-open.png`
- `.local/mobile-ux/03-mobile-detail-sheet.png`
- `.local/mobile-ux/04-mobile-390.png`
- `.local/mobile-ux/04-ipad-portrait.png`
- `.local/mobile-ux/04-ipad-landscape.png`
- `.local/mobile-ux/04-desktop.png`

## 메모

다음 모바일 개선 후보는 출석부에서 학생 수가 많은 반을 볼 때 `미체크/확인 필요` 학생만 빠르게 좁혀 보는 빠른 필터입니다.
