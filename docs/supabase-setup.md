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

Supabase CLI를 설치한 경우에는 migration 파일을 기준으로 적용합니다.

```bash
supabase link --project-ref <project-ref>
supabase db push
```

## 3. 파일럿 seed 적용

개발/파일럿 DB에는 아래 파일을 실행합니다.

```text
supabase/seed.sql
```

seed에는 더배움프라임영수학원, 샘플 반, 샘플 학생, 기본 문자 템플릿이 포함됩니다.

## 4. 로컬 환경변수

`.env.example`을 참고해 `.env.local`을 만듭니다.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

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

## 6. Vercel 환경변수

Vercel Project Settings에서 Production/Preview 환경변수에 같은 값을 등록합니다.

초기 Preview 환경은 안전하게 아래 값을 유지합니다.

```text
SMS_DRY_RUN=true
```

