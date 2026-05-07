# Supabase 연결 가이드

## 1. 프로젝트 생성

Supabase에서 새 프로젝트를 생성합니다.

권장:

- Project name: `academy-followup`
- Region: 한국 대상이므로 가능한 가까운 리전 선택
- Database password: 안전하게 보관

## 2. 스키마 적용

SQL Editor에서 아래 파일 내용을 실행합니다.

```text
supabase/schema.sql
```

Supabase CLI를 설치한 경우에는 migration 파일을 기준으로 적용합니다. CLI 로그인은 브라우저 자동 인증이 안 되는 환경에서는 access token이 필요합니다.

```bash
supabase login --token <supabase-access-token>
supabase link --project-ref pemvzkiecivmstzqjkts
supabase db push
```

직접 DB URL이 IPv6로만 잡히는 환경에서는 `db push`가 실패할 수 있습니다. 이 경우 Supabase Dashboard의 Database Connection 정보에서 IPv4로 접근 가능한 pooler connection string을 복사해 아래처럼 적용합니다.

```bash
supabase db push --db-url '<pooler-connection-string>'
```

현재 프로젝트 ref:

```text
pemvzkiecivmstzqjkts
```

## 3. 파일럿 seed 적용

개발/파일럿 DB에는 아래 파일을 실행합니다.

```text
supabase/seed.sql
```

seed에는 더배움프라임영수학원, 더미 반 6개, 더미 원생 52명, 주간 스케줄, 오늘 날짜 출석 상태, 기본 문자 템플릿이 포함됩니다. 다시 실행해도 같은 더미 학생은 업데이트되고, 볼륨 테스트용 스케줄은 재생성됩니다.

주의:

- 실제 개인정보가 아니라 UI 검증용 더미 데이터입니다.
- 더미 전화번호가 들어 있으므로 실제 문자 발송 테스트에는 쓰지 않습니다.
- 이 seed를 실행한 환경에서는 `SMS_DRY_RUN=true`를 유지합니다.
- Supabase SQL Editor에서 `temporary table RLS` 경고가 보일 수 있지만, 쿼리 실행 중에만 쓰이는 임시 테이블입니다.
- `delete from student_schedules` 경고가 보일 수 있지만, `파일럿 볼륨 테스트%` 메모가 붙은 더미 스케줄만 재생성하기 위한 작업입니다.

## 4. 로컬 환경변수

`.env.example`을 참고해 `.env.local`을 만듭니다.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`에는 Supabase의 publishable key를 넣습니다.
`SUPABASE_SERVICE_ROLE_KEY`는 서버 health check와 관리자 작업용 secret key입니다. 클라이언트에 노출하면 안 됩니다.

로컬에서는 실제 문자 발송을 막기 위해 아래 값을 유지합니다.

```text
SMS_DRY_RUN=true
```

## 5. 연결 확인

앱을 실행한 뒤 아래 URL을 확인합니다.

```text
http://localhost:3000/api/health/supabase
```

정상 연결이면 아래 형태로 응답합니다.

```json
{
  "ok": true,
  "status": "connected"
}
```

환경변수가 없으면 `not_configured`, 스키마가 적용되지 않았거나 키가 틀리면 `connection_failed`가 반환됩니다.

현재 로컬 연결 확인 결과:

```json
{
  "ok": true,
  "status": "connected"
}
```

## 6. Vercel 환경변수

Vercel Project Settings에서 Production/Preview 환경변수에 같은 값을 등록합니다.

초기 Preview 환경은 안전하게 아래 값을 유지합니다.

```text
SMS_DRY_RUN=true
```
