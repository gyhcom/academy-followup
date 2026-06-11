# 운영 전환 릴리즈 체크리스트 - 2026-06

이 문서는 Academy Follow-up을 데모가 아니라 친구 학원 1주 운영 파일럿에 올리기 전 확인할 기준입니다.
200명 seed는 부하/UX 검증용이고, 실제 운영은 실제 구조 데이터와 테스트 번호 제한 발송을 거쳐 시작합니다.

운영 데이터 정리 전에는 [운영 데이터 정리 전 선행 점검](./operations-pre-reset-checklist-2026-06.md)을 먼저 실행합니다. 이 문서의 Preview/Cleanup/Verify 순서를 통과하기 전에는 seed/demo 데이터를 삭제하지 않습니다.

## 1. 운영 전환 원칙

- Production 앱은 Vercel + 기존 Next.js API 기준으로 안정 운영합니다.
- Spring Boot backend는 Railway 결제 전까지 로컬 검증용으로 유지합니다.
- Vercel Production에는 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.
- 실제 SMS는 테스트 번호 1건 수신 확인 전까지 학부모 번호로 발송하지 않습니다.
- 200명 seed는 실제 개인정보가 아니라 화면 밀도와 권한 검증을 위한 데이터입니다.

## 2. 릴리즈 전 환경 확인

| 확인 항목 | 기준 |
| --- | --- |
| Production URL | `https://academy-followup.vercel.app` 접속 가능 |
| Vercel 배포 | latest deployment가 최신 `main` 기준 READY |
| Supabase health | `/api/health/supabase`가 `connected` 반환 |
| Supabase migration | `audit_logs`, 외부 학원 수업, 스케줄 공유 동의 컬럼 적용 완료 |
| SMS 설정 | 실제 발송 전에는 `sms_dry_run=true` 유지 |
| Spring backend | Production 미연결, 로컬 검증만 사용 |
| Backend env | Production에 `NEXT_PUBLIC_BACKEND_API_URL` 미설정 |

## 3. 권한별 운영 확인

| 계정 | 확인 |
| --- | --- |
| `owner@test.com / 1234` | 홈, 출석, 문자, 관리, 리포트, 이력 접근 가능 |
| `teacher@test.com / 12345678` | 담당 반만 표시, 관리 탭 숨김, 전화번호 숫자 비노출 |
| `assistant@test.com / 12345678` | 연락 기록 저장 가능, 테스트 발송 버튼 권한 안내/비활성 표시 |

중단 기준:

- teacher/assistant에게 학생 또는 학부모 전화번호 숫자가 보이면 운영 중단
- assistant가 `allow_assistant_send=false`에서 테스트 발송 가능하면 운영 중단
- owner가 리포트/CSV/이력 확인을 못 하면 운영 전 수정

## 4. 실제 데이터 전환 준비

첫 운영 투입은 전체 학생이 아니라 실제 구조 일부로 시작합니다.

실제 데이터 전환 전에 먼저 할 일:

- 200명 seed 기준 스냅샷과 CSV export를 남깁니다.
- `auth.users`, `profiles`, `academies`, `academy_settings`, `message_templates`, `platform_admins`는 보존 대상으로 확정합니다.
- 운영 데이터 cleanup은 `Preview -> Cleanup -> Verify` 순서로만 진행합니다.
- Cleanup SQL은 자동 실행하지 않고 Supabase SQL Editor에서 사람이 직접 실행합니다.

권장 범위:

- 반 1~2개
- 학생 20~30명
- 선생님 1~3명
- 월~토 정규 수업 요일/시간 포함
- 타 학원 스케줄 공유 동의 여부 포함

CSV 필수 필드:

- 학생명
- 학교
- 학년
- 소속 반
- 학부모 연락처
- 학생 연락처
- 수업 요일
- 수업 시작/종료 시간
- 담당 선생님
- 타 학원 스케줄 공유 동의 여부

실행 전 결정:

- 200명 seed를 유지한 별도 파일럿 DB에서 검증할지, 실제 운영 DB를 새로 만들지 결정
- 실제 개인정보가 들어가는 DB에는 demo/seed 정리 SQL을 실행하지 않음
- 실데이터 투입 후 학생 수, 반 수, 스케줄 미등록 학생 수를 SQL과 앱 양쪽에서 확인

## 5. 모바일 운영 흐름 확인

모바일 390px 기준으로 아래 흐름을 실제 데이터로 확인합니다.

홈:

- 오늘 학원 일정이 날짜 기준으로 보임
- 미발송/발송 완료/오늘 문자 대상 수가 이해됨
- 공유된 타 학원 일정은 보강 제외 참고 정보로 보임

출석:

- 수업 선택 후 학생 8~15명 기준 도착/지각/예외 체크 가능
- 결석/지각 선택 후 문자 초안으로 이어짐
- 저장 상태와 실패 메시지가 이해됨

문자:

- 개별 문자에서 학생 선택, 사유 선택, 기록 저장, 테스트 발송 흐름 확인
- 전체문자에서 대상 수, 발송 후보, 실제 발송, 중복 제외 수 확인
- 2000byte 초과 차단 확인

관리:

- 학생/반/스케줄 수정 가능
- 타 학원 공유 동의 체크 가능
- 리포트 CSV 다운로드 가능
- 최근 변경 이력에 수정 기록 표시

## 6. SOLAPI 테스트 번호 제한 발송 준비

실제 발송은 T-310에서 별도 승인 후 진행합니다.

사전 확인:

- SOLAPI API key 준비
- 발신번호 등록/승인 확인
- Vercel server env에만 SOLAPI secret 설정
- 테스트 번호 1개만 실제 수신 대상으로 사용
- 중복 발송 방지와 2000byte 차단 유지

테스트 순서:

1. `sms_dry_run=true`에서 같은 문구를 테스트 발송해 로그가 남는지 확인
2. 테스트 번호 제한 조건을 확인
3. `sms_dry_run=false`로 전환 전 Vercel env와 발신번호 재확인
4. 테스트 번호 1건 실제 수신 확인
5. `message_logs`에서 성공/실패 상태 확인
6. 확인 후 다시 운영 정책에 맞게 `sms_dry_run` 상태를 결정

학부모 번호로 확대 발송하는 것은 테스트 번호 수신 확인 후 별도 승인으로 진행합니다.

## 7. Spring Boot 운영 준비

Railway 결제 전:

- 로컬 Spring Boot만 사용
- `report summary`, `audit logs`는 로컬 Spring 우선 호출 + Next fallback 검증 유지
- Production Vercel은 기존 Next.js API만 사용

Railway 결제 후:

- `apps/backend`를 Railway 서비스로 연결
- `/health`, `/actuator/health` 확인
- `/api/auth/context` owner/teacher/assistant token 확인
- `/api/reports/summary`, `/api/audit/logs` owner 200, teacher/assistant 403 확인
- Vercel `NEXT_PUBLIC_BACKEND_API_URL` 연결은 리포트/이력 화면만 제한적으로 진행
- 문제 발생 시 Vercel env 제거로 즉시 Next.js fallback

## 8. 최종 운영 시작 기준

아래가 모두 충족되면 친구 학원 1주 운영 파일럿을 시작할 수 있습니다.

- 실제 구조 데이터 20~30명 투입 완료
- 모바일 390px에서 홈/출석/문자/관리 핵심 흐름 확인 완료
- owner/teacher/assistant 권한 확인 완료
- assistant 발송 제한 안내 확인 완료
- 전화번호 비노출 확인 완료
- 리포트/CSV/감사 로그 확인 완료
- SOLAPI 테스트 번호 1건 수신 확인 또는 dry-run 유지 결정 완료
- Spring backend Production 미연결 또는 제한 연결 상태 명확화

## 9. 운영 중 기록할 피드백

- 출석 체크가 5~10초 안에 가능한지
- 원장이 미발송/미처리 학생을 바로 찾는지
- 문자 발송 전 대상/중복 제외 수를 이해하는지
- 관리 화면에서 학생/반/스케줄 수정이 막히지 않는지
- 보강 제외 일정이 실제 보강 판단에 도움이 되는지
- 선생님/보조 선생님이 권한 제한을 이해하는지
