# Railway Spring Backend 배포 준비 체크리스트

이 문서는 Railway 결제 후 `apps/backend` Spring Boot 서비스를 바로 연결할 수 있도록 준비 상태와 검증 절차를 고정합니다. 아직 Production Vercel에는 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.

## 1. 배포 기준

- Railway Root Directory: `apps/backend`
- Java: 21
- Build/Run: Gradle Wrapper 사용
- Health URL:
  - `GET /health`
  - `GET /actuator/health`
- Frontend는 Vercel + Next.js 유지
- DB/Auth는 Supabase 유지
- 기존 Next.js API는 fallback으로 유지

## 2. Railway 환경변수

필수:

```text
SPRING_PROFILES_ACTIVE=railway
SUPABASE_URL=<Supabase project URL>
SUPABASE_SERVICE_ROLE_KEY=<server-only service role key>
ALLOWED_ORIGINS=<Vercel production URL>,<Vercel preview URL if needed>
```

문자 실발송 검증 시 필요:

```text
SOLAPI_API_KEY=<SOLAPI API key>
SOLAPI_API_SECRET=<SOLAPI API secret>
SOLAPI_SENDER_PHONE=<registered sender phone>
```

주의:

- `SUPABASE_SERVICE_ROLE_KEY`는 Railway backend와 Vercel server-side에만 둡니다.
- browser에 노출되는 값은 `NEXT_PUBLIC_BACKEND_API_URL` 하나만 허용합니다.
- Railway 결제 전에는 Vercel Production에 `NEXT_PUBLIC_BACKEND_API_URL`을 넣지 않습니다.

## 3. Railway 배포 후 smoke test

Railway public URL을 `BACKEND_URL`로 둡니다.

```bash
BACKEND_URL="https://<railway-service>.up.railway.app"

curl "$BACKEND_URL/health"
curl "$BACKEND_URL/actuator/health"
```

기대값:

- `/health`: `{"status":"ok"}`
- `/actuator/health`: `UP`

인증 없는 API:

```bash
curl -i "$BACKEND_URL/api/auth/context"
```

기대값:

- `401`
- 사용자 메시지: `로그인이 필요합니다.`

## 4. Supabase token smoke

로컬에서 owner token을 생성해 Railway backend를 직접 호출합니다.

```bash
OWNER_TOKEN=$(node - <<'NODE'
const fs = require("fs");
const envText = fs.readFileSync("apps/frontend/.env.local", "utf8");
for (const line of envText.split(/\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
}

fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email: "owner@test.com", password: "1234" }),
})
  .then((response) => response.json())
  .then((body) => process.stdout.write(body.access_token ?? ""))
  .catch(() => process.exit(1));
NODE
)
```

확인:

```bash
curl "$BACKEND_URL/api/auth/context" \
  -H "Authorization: Bearer $OWNER_TOKEN"

curl "$BACKEND_URL/api/reports/summary?range=today" \
  -H "Authorization: Bearer $OWNER_TOKEN"

curl "$BACKEND_URL/api/audit/logs?limit=20" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

기대값:

- owner token: `200`
- teacher/assistant token: 리포트/이력 API는 `403`
- token 없음: `401`

## 5. Frontend 연결 전 확인

Vercel에 backend URL을 넣기 전, 로컬 frontend로 Railway backend를 먼저 호출합니다.

```bash
NEXT_PUBLIC_BACKEND_API_URL="$BACKEND_URL" npm run dev --workspace apps/frontend -- --port 3011
```

확인 화면:

- `/login`
- owner 로그인
- `/app` 홈/출석/문자/관리
- 관리 > 리포트
- 관리 > 이력
- 문자 > 개별/전체문자 미리보기
- 학생 상세 > 타 학원 수업/공유 일정 조회

기대값:

- Network에서 Railway `/api/*` 호출 확인
- 실패 시 기존 Next.js `/api/*` fallback 확인
- 화면 오류 없음

## 6. Vercel Production 연결 절차

연결 전 조건:

- Railway `/health`, `/actuator/health` 정상
- owner/teacher/assistant token smoke 완료
- 로컬 frontend + Railway backend smoke 완료
- `sms_dry_run=true` 유지 확인

Vercel env:

```text
NEXT_PUBLIC_BACKEND_API_URL=https://<railway-service>.up.railway.app
```

연결 후 즉시 확인:

- owner: 홈/출석/문자/관리/리포트/이력
- teacher: 담당 반 출석/문자 가능, 관리 탭 숨김
- assistant: 연락 기록 저장 가능, 발송 제한 안내 유지
- 플랫폼 관리자: `/platform` 학원 목록 조회

## 7. Rollback

문제 발생 시 Vercel에서 아래 env를 제거하고 재배포합니다.

```text
NEXT_PUBLIC_BACKEND_API_URL
```

Rollback 기대값:

- frontend는 기존 Next.js API만 호출
- Spring backend가 꺼져도 Production 앱은 계속 동작
- DB migration rollback 불필요

## 8. 완료 기준

- Railway에 바로 연결할 수 있는 Root Directory와 env 목록이 문서화되어 있습니다.
- 운영 API는 Spring Boot에 추가되어 있고 Next.js fallback이 유지됩니다.
- Production 연결은 Railway smoke test 후 별도 승인으로만 진행합니다.
- 결제 전 현재 상태는 “코드/API 이관 완료 + 배포 준비 완료 + Production 미연결”입니다.
