# 데모 리허설 결과 - 2026-05-10

대상 브랜치: `main`

기준 문서: `docs/testing/demo-scenario.md`

실행 환경:

- 로컬 개발 서버 `http://localhost:3000`
- 원장 계정 `owner@test.com`
- 담당 선생님 계정 `uat-teacher@test.com`
- 보조 선생님 계정 `uat-assistant@test.com`
- SMS 설정 `sms_dry_run=true`

## 요약

친구 원장에게 보여줄 3분 데모 시나리오를 실제 로그인 흐름으로 점검했습니다.

원장 로그인, 원장 미처리 보드, 반별 출석부, 결석 문자 초안, 본문 수정, 팔로업 저장, dry-run 발송, 학생 히스토리, 보강 날짜/시간 선택, 보강 문자 발송 후 스케줄 자동 등록, 선생님/보조 선생님 권한 차이를 확인했습니다.

기능 흐름은 데모 가능한 상태입니다.

## 확인 결과

| 영역 | 결과 | 메모 |
| --- | --- | --- |
| 원장 로그인 | 통과 | 학원명과 원장 화면 표시 확인 |
| 원장 미처리 보드 | 통과 | 오늘 처리 대상 학생 목록 확인 |
| 반별 출석부 | 통과 | 수업 시간 선택과 상태 변경 확인 |
| 결석 문자 초안 | 통과 | 학생 선택 후 문자 패널 표시 확인 |
| 문자 본문 수정 | 통과 | 자동 체크는 실패로 기록됐지만 DB의 `followups.message_body`에 수정 문구 저장 확인 |
| 팔로업 저장 | 통과 | 최근 팔로업에 기록 반영 |
| dry-run 발송 | 통과 | 실제 SMS 없이 발송 기록 생성 |
| 학생 히스토리 | 통과 | 최근 연락 기록 최신순 확인 |
| 보강 달력 | 통과 | 학생 주간 스케줄과 보강 후보 확인 |
| 보강 문자 발송 | 통과 | 새 학생 기준 dry-run 발송 확인 |
| 보강 스케줄 자동 등록 | 통과 | 발송 후 `스케줄에 입력` 활성화 및 등록 확인 |
| 담당 선생님 권한 | 통과 | 관리 탭 미노출, 배정 반 표시 |
| 보조 선생님 권한 | 통과 | 배정 반 없음 안내 표시 |

## 특이사항

첫 보강 시연은 기존 UAT 데이터가 남아 있던 학생으로 실행해서 중복 발송 방지에 걸렸습니다. 같은 학생, 같은 사유, 같은 수신자 조합으로 이미 발송 기록이 있으면 재발송을 막는 정상 동작입니다.

이후 새 학생 `UAT 김다인`으로 다시 실행해 보강 dry-run 발송과 스케줄 자동 등록까지 통과했습니다.

실제 원장 데모 전에는 아래 둘 중 하나를 선택하는 것이 좋습니다.

- 데모 전용 새 학생을 사용한다.
- 데모 직전에 테스트 연락 기록을 정리한다.

## 스크린샷

스크린샷은 로컬 `.local/demo/` 아래에 저장했습니다.

- `.local/demo/01-owner-board.png`
- `.local/demo/02-attendance-board.png`
- `.local/demo/03-attendance-message-draft.png`
- `.local/demo/04-dryrun-sent.png`
- `.local/demo/05-history.png`
- `.local/demo/06-makeup-calendar.png`
- `.local/demo/07-makeup-draft.png`
- `.local/demo/08-makeup-schedule-created-new-student.png`
- `.local/demo/09-teacher-view.png`
- `.local/demo/10-assistant-empty.png`

## 남은 확인

이번 리허설은 dry-run 기준입니다. 실제 SMS 발송은 Solapi 연동과 운영 발신번호 준비 후 별도 점검이 필요합니다.
