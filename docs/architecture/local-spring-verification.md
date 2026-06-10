# 로컬 Spring Boot 검증 루틴

이 문서는 Railway 결제/배포 전까지 로컬에서 Spring Boot API 전환을 반복 검증하는 기준입니다. Production Vercel에는 아직 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.

## 1. 목적

- Spring Boot backend가 Supabase 로그인 사용자와 권한을 올바르게 판단하는지 확인합니다.
- 첫 이관 API인 `GET /api/reports/summary`가 기존 Next.js API와 같은 운영 리포트 값을 보여주는지 확인합니다.
- backend가 꺼져도 frontend가 기존 Next.js API로 fallback 되는지 확인합니다.

## 2. 사전 조건

- `apps/frontend/.env.local`에 Supabase 값이 있어야 합니다.
- backend 실행 시 아래 환경변수가 필요합니다.
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3011`
- Production/Vercel에는 `NEXT_PUBLIC_BACKEND_API_URL`을 넣지 않습니다.

## 3. Backend 실행

프론트 환경변수를 backend용으로 재사용해 실행합니다.

```bash
set -a
source apps/frontend/.env.local
export SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
export ALLOWED_ORIGINS="http://localhost:3010,http://localhost:3011"
set +a

npm run dev:backend
```

기본 확인:

```bash
curl http://localhost:8080/health
curl http://localhost:8080/actuator/health
```

## 4. Access Token 준비

Supabase Auth password grant로 테스트 계정 token을 만들 수 있습니다. token은 로그에 남기지 말고 로컬 shell 변수로만 사용합니다.

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

## 5. Spring API 직접 확인

```bash
curl http://localhost:8080/api/auth/context \
  -H "Authorization: Bearer $OWNER_TOKEN"

curl "http://localhost:8080/api/reports/summary?range=today" \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

기대값:

- owner/manager: report summary `200`
- teacher/assistant: report summary `403`
- token 없음: `401`
- 200명 seed 기준: 학생 200명, 반 20개, 스케줄 미등록 0명

## 6. Frontend 로컬 연동 확인

Spring backend가 켜진 상태에서 frontend를 실행합니다.

```bash
npm run dev:frontend:spring-local
```

확인 경로:

- `http://localhost:3011/login`
- `owner@test.com / 1234`
- `/app` 진입
- 관리 탭 > 리포트

기대값:

- 브라우저 network에서 `http://localhost:8080/api/reports/summary?range=today` 호출
- 화면에 학생 200명, 반 20개, 스케줄 미등록 0명 표시
- 콘솔 에러 없음

## 7. Fallback 확인

Spring backend를 끈 뒤 같은 화면을 다시 엽니다.

기대값:

- 기존 Next.js `/api/reports/summary?range=today` 호출
- 화면은 계속 정상 표시
- 로컬에서 backend URL을 켠 상태로 backend만 끄면 `ERR_CONNECTION_REFUSED`가 1회 보일 수 있습니다. 이는 fallback 확인 과정의 콘솔 노이즈이며, Production에는 backend URL을 설정하지 않으므로 발생하지 않습니다.

Production 유사 확인은 backend URL 없이 frontend를 실행합니다.

```bash
npm run dev --workspace apps/frontend -- --port 3012
```

이 경우 기존 Next.js API만 호출되어야 합니다.

## 8. 회귀 검증

```bash
npm run test:backend
npm run lint --workspace apps/frontend
npx tsc --noEmit -p apps/frontend/tsconfig.json
npm run build --workspace apps/frontend
git diff --check
```

## 9. 하지 않을 것

- Railway 결제 전 backend를 Production에 연결하지 않습니다.
- Vercel Production에 `NEXT_PUBLIC_BACKEND_API_URL`을 설정하지 않습니다.
- 기존 Next.js `/api/reports/summary`를 삭제하지 않습니다.
- 출석/문자/학생 관리 쓰기 API는 아직 Spring으로 옮기지 않습니다.
