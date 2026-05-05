# 기술 설계 초안

## 1. 추천 아키텍처

```text
사용자 브라우저
  -> Next.js 웹앱
  -> Supabase Auth / Postgres
  -> Next.js API Route
  -> SOLAPI 문자 발송
```

## 2. 기술 스택

- Frontend: Next.js, TypeScript, Tailwind CSS, shadcn/ui
- Backend: Next.js Route Handlers 또는 Server Actions
- Database: Supabase Postgres
- Auth: Supabase Auth
- Hosting: Vercel
- SMS/LMS: SOLAPI
- Error Tracking: Sentry
- Analytics: PostHog 또는 자체 이벤트 테이블

## 3. 멀티테넌트 원칙

처음 고객이 친구 학원 하나여도, 구조는 여러 학원이 쓰는 SaaS로 설계합니다.

모든 주요 테이블에는 `academy_id`를 둡니다.

```text
academies
users
classes
students
parents
message_templates
followups
message_logs
```

## 4. 권한

초기 권한은 4개로 제한합니다.

- owner: 원장, 전체 관리
- manager: 실장/관리자, 대부분의 운영 관리
- teacher: 담당 반/학생 관리 및 발송
- assistant: 체크/초안 작성 중심, 발송 권한은 학원 설정에 따라 제한 가능

## 5. DB 초안

```sql
academies
- id
- name
- sender_name
- sender_phone
- created_at

profiles
- id
- academy_id
- email
- name
- role
- created_at

classes
- id
- academy_id
- name
- subject
- grade_label
- teacher_id
- created_at

students
- id
- academy_id
- class_id
- name
- school_name
- grade_label
- parent_name
- parent_phone
- status
- created_at

message_templates
- id
- academy_id
- reason
- title
- body
- is_active
- created_at

followups
- id
- academy_id
- student_id
- class_id
- teacher_id
- reason
- message_body
- status
- sent_at
- created_at

message_logs
- id
- academy_id
- followup_id
- provider
- provider_message_id
- recipient_phone
- status
- error_message
- created_at
```

## 6. 문자 발송 프로세스

1. 선생님이 학생과 사유를 선택
2. 서버가 템플릿에 학생명/학원명/선생님명을 반영
3. 미리보기 반환
4. 사용자가 발송 버튼 클릭
5. 서버에서 권한 확인
6. 같은 학생/같은 사유/같은 날짜 중복 발송 여부 확인
7. SOLAPI 발송 요청
8. 발송 결과를 `message_logs`에 저장
9. `followups.status` 갱신

## 7. 안전장치

- 발송 전 미리보기 필수
- 하루 동일 학생/동일 사유 중복 발송 경고
- 모든 발송 로그 저장
- 원장/관리자만 템플릿 수정 가능
- 학부모 전화번호 마스킹 옵션
- 개인정보 접근 권한 최소화

## 8. 초기 배포 위치

- Vercel: 웹앱 및 API
- Supabase: DB/Auth
- SOLAPI: SMS/LMS
- Cloudflare: 도메인/DNS

초기에는 AWS EC2, Kubernetes, 자체 문자 발송 서버를 사용하지 않습니다.

