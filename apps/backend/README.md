# Academy Follow-up Backend

Spring Boot backend skeleton for the gradual Java migration.

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

T-631 uses Supabase Auth and `profiles` to build the backend workspace context.
T-632 adds the first read-only migrated API, `GET /api/reports/summary`.

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

## Report Summary Check

```bash
curl "http://localhost:8080/api/reports/summary?range=today" \
  -H "Authorization: Bearer <supabase-access-token>"
```

Supported ranges are `today`, `7d`, and `month`. The response shape matches the
existing Next.js `/api/reports/summary` response so the frontend can fallback
without UI changes.

For local frontend integration, set this only in local env:

```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8080
```

Do not set `NEXT_PUBLIC_BACKEND_API_URL` in Production until Railway deployment
is ready.

## Scope

- Existing Next.js API routes remain active.
- This app is not part of the Vercel frontend deployment yet.
- Railway deployment is deferred until payment/deployment timing is decided.
