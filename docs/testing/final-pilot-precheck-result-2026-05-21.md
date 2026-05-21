# 파일럿 전 최종 사전 점검 결과

날짜: 2026-05-21

## 범위

- 로컬 앱 `http://localhost:3010`
- 모바일 390px 기준 smoke 확인
- 원장 계정 `owner@test.com`
- 실제 SMS 발송은 하지 않고 `sms_dry_run=true` 전제 유지

## 자동 확인 결과

| 항목 | 결과 | 메모 |
| --- | --- | --- |
| Supabase health | 통과 | `/api/health/supabase`가 `connected` 반환 |
| 로그인 | 통과 | `owner@test.com / 1234` 로그인 후 `/app` 진입 |
| 홈 | 통과 | 학원명과 홈 화면 표시 |
| 출석 | 통과 | `반별 출석부` 진입, 가로 overflow 없음 |
| 문자 | 통과 | `수업 후 연락` 진입, 가로 overflow 없음 |
| 전체문자 | 통과 | `전체문자` 화면 접근, 가로 overflow 없음 |
| 관리 | 통과 | 원장 시작 순서와 학생 관리 접근, 가로 overflow 없음 |
| 콘솔 오류 | 통과 | smoke 중 브라우저 console error 없음 |
| lint | 통과 | `npm run lint` |
| typecheck | 통과 | `npx tsc --noEmit` |
| build | 통과 | `npm run build` |
| diff check | 통과 | `git diff --check` |

## 아직 실제 데이터로 확인해야 할 것

1. 친구 학원 실제 CSV 일부 투입
   - 실제 반명, 학생명, 학교/학년, 연락처, 스케줄 표현 확인
   - 학생 30명 이상에서 관리/문자/출석 화면 밀도 확인
2. 실제 데이터 기준 dry-run
   - 결석/지각 문자 dry-run
   - 전체문자 중복 수신자 제외
   - `followups`, `message_logs` 기록 확인
3. 학원 간 스케줄 공유
   - 일반 창과 시크릿 창처럼 세션을 분리해 더배움/다솜 양방향 코드 연결 확인
   - 다른 학생 연결 차단과 한쪽 공유 해제 시 양쪽 종료 확인
4. SOLAPI 실제 발송 전 준비
   - 발신번호, SOLAPI 환경변수, `sms_dry_run` 전환 조건 확인
   - 테스트 번호 1개로 제한 발송하는 별도 단계 필요

## 판단

- 현재 main 기준으로 로컬 smoke와 빌드는 통과했습니다.
- 파일럿 전 가장 큰 미확인 항목은 실제 학원 데이터 투입과 실제 데이터 기준 dry-run입니다.
- 실제 SMS 발송은 아직 켜지 않는 것이 맞습니다.
