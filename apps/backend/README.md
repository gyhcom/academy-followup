# Academy Follow-up Backend

Spring Boot backend for the gradual Java migration. Operational APIs are now
implemented here while existing Next.js API routes remain as frontend fallback.

## Requirements

- Java 21 or newer
- Gradle Wrapper is included, so a local Gradle install is not required.

## Run

```bash
cd apps/backend
./gradlew bootRun
```

The API runs on `http://localhost:8080` by default.

## Health Checks

```bash
curl http://localhost:8080/health
curl http://localhost:8080/actuator/health
```

Expected `/health` response:

```json
{"status":"ok"}
```

## Local Environment

Copy `.env.example` if you want a local env file for backend API work.

```bash
cp .env.example .env
```

Supabase Auth and `profiles` are used to build the backend workspace context.

Required values:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS`

Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

## Auth Context Check

```bash
curl http://localhost:8080/api/auth/context \
  -H "Authorization: Bearer <supabase-access-token>"
```

## API Checks

```bash
curl "http://localhost:8080/api/reports/summary?range=today" \
  -H "Authorization: Bearer <supabase-access-token>"

curl "http://localhost:8080/api/audit/logs?limit=20" \
  -H "Authorization: Bearer <supabase-access-token>"
```

The response shapes match the existing Next.js API responses so the frontend can
fallback without UI changes.

For local frontend integration, set this only in local env:

```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080
```

Do not set `NEXT_PUBLIC_BACKEND_API_URL` in Production until Railway deployment
is ready.

## Scope

- Existing Next.js API routes remain active.
- This app is deployed separately from the Vercel frontend.
- Railway deployment is prepared but deferred until payment/deployment timing is decided.
- See `docs/architecture/railway-backend-deployment-readiness.md` before connecting Production.
