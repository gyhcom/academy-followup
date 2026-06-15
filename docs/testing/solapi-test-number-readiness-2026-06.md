# SOLAPI 테스트 번호 제한 발송 준비 - 2026-06

이 문서는 dry-run 검증 이후 실제 SMS/LMS를 테스트 번호 1건으로만 확인하는 기준입니다. 실제 학부모 번호 발송은 이 문서의 테스트가 통과한 뒤 별도 승인으로 진행합니다.

## 1. 목적

- SOLAPI 연동이 실제로 문자 1건을 보낼 수 있는지 확인합니다.
- 오발송을 막기 위해 테스트 번호 1개만 허용합니다.
- `message_logs`에 성공/실패 상태가 남는지 확인합니다.

## 2. 사전 조건

| 항목 | 기준 |
| --- | --- |
| 실데이터 dry-run | 실제 구조 20~30명 데이터로 기록 저장과 테스트 발송 로그 확인 |
| 발신번호 | SOLAPI 콘솔에서 등록/승인 완료 |
| Vercel env | server-side secret만 설정, browser public env에 secret 없음 |
| 테스트 번호 | 원장 또는 개발자 휴대폰 1개로 제한 |
| assistant 정책 | `allow_assistant_send=false` 유지 |
| 중복 방지 | `duplicate_guard_minutes` 유지 |

## 3. 필요한 환경변수

Vercel server-side와 나중에 Railway backend에만 설정합니다.

```text
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER_PHONE=
```

주의:

- `SOLAPI_API_SECRET`은 `NEXT_PUBLIC_` prefix를 붙이지 않습니다.
- Production에 Spring backend URL은 아직 연결하지 않습니다.
- 테스트 번호 제한 정책을 확인하기 전에는 `sms_dry_run=false`로 바꾸지 않습니다.

## 4. 실행 순서

1. `sms_dry_run=true`에서 실제 구조 데이터 학생 1명에게 테스트 발송을 실행합니다.
2. 앱에서 `message_logs.status=dry_run` 기록이 남는지 확인합니다.
3. SOLAPI env와 발신번호를 확인합니다.
4. 테스트 번호 제한 기준을 확인합니다.
   - 실제 수신 번호는 테스트 번호 1개만 사용합니다.
   - 학부모 번호 전체 발송은 금지합니다.
5. `sms_dry_run=false` 전환 전 owner가 발송 대상/수신 번호를 다시 확인합니다.
6. 테스트 번호 1건만 실제 발송합니다.
7. 수신 여부와 `message_logs` 상태를 확인합니다.
8. 실패하면 실패 메시지와 provider 응답을 기록하고 `sms_dry_run=true`로 되돌립니다.

## 5. 확인 SQL

```sql
select
  id,
  status,
  recipient_phone_masked,
  provider_message_id,
  error_message,
  created_at
from public.message_logs
where academy_id = '11111111-1111-4111-8111-111111111111'
order by created_at desc
limit 10;
```

설정 확인:

```sql
select
  sms_dry_run,
  allow_assistant_send,
  duplicate_guard_minutes
from public.academy_settings
where academy_id = '11111111-1111-4111-8111-111111111111';
```

## 6. 중단 기준

- 테스트 번호 외 번호가 실제 발송 대상에 포함됨
- `SOLAPI_API_SECRET`이 public env로 노출됨
- `allow_assistant_send=false`인데 assistant가 실제 발송 가능
- 중복 방지 시간 내 동일 수신자에게 재발송 가능
- 2000byte 초과 문구가 발송 가능
- 실패했는데 UI 또는 로그에 실패 상태가 남지 않음

## 7. 완료 기준

- 테스트 번호 1건 실제 수신 확인
- `message_logs.status`가 성공 또는 실패 상태로 명확히 저장
- 실패 시 원장이 이해할 수 있는 오류 문구 표시
- 테스트 이후 학부모 번호 확대 발송 여부를 별도 결정

## 8. 운영 기본값

- 파일럿 시작 전 기본값은 `sms_dry_run=true`입니다.
- 실제 발송 확대는 원장 승인 후 제한 범위부터 진행합니다.
- Spring Boot가 Railway에 배포되기 전까지 Production 문자 발송은 기존 Next.js API 기준으로 검증합니다.
