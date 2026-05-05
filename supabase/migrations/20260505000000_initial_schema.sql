-- Academy Follow-up initial schema
-- 한국 학원용 멀티테넌트 SaaS 구조를 전제로 합니다.

create extension if not exists pgcrypto;

create type public.academy_plan as enum ('free', 'starter', 'standard', 'pro', 'pilot');
create type public.academy_status as enum ('active', 'trialing', 'paused', 'cancelled');
create type public.academy_role as enum ('owner', 'manager', 'teacher', 'assistant');
create type public.followup_reason as enum (
  'absence',
  'late',
  'homework_missing',
  'retest',
  'materials_missing',
  'class_attitude',
  'consultation'
);
create type public.followup_status as enum ('draft', 'sent', 'failed');

-- 플랫폼 운영자 권한입니다.
-- 특정 학원 소속 권한이 아니라, 전체 SaaS 운영/지원 용도로만 사용합니다.
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'super_admin',
  created_at timestamptz not null default now()
);

-- 학원 워크스페이스입니다.
-- 여러 학원이 같은 서비스를 쓰는 구조이므로 모든 운영 데이터는 academy_id로 분리됩니다.
create table public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  plan public.academy_plan not null default 'pilot',
  status public.academy_status not null default 'active',
  category text,
  logo_url text,
  brand_color text not null default '#047857',
  naver_place_id text,
  sender_name text,
  sender_phone text,
  created_at timestamptz not null default now()
);

-- 학원별 운영 설정입니다.
-- academies에는 식별/브랜딩 필드를 두고, 변경 가능성이 큰 운영 옵션은 이 테이블로 분리합니다.
create table public.academy_settings (
  academy_id uuid primary key references public.academies(id) on delete cascade,
  sms_dry_run boolean not null default true,
  allow_assistant_send boolean not null default false,
  duplicate_guard_minutes integer not null default 1440,
  parent_phone_masking boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Supabase Auth 사용자와 학원 내부 권한을 연결합니다.
-- 플랫폼 관리자 여부는 platform_admins에서 별도로 판단합니다.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  academy_id uuid not null references public.academies(id) on delete cascade,
  email text not null,
  name text not null,
  role public.academy_role not null default 'teacher',
  created_at timestamptz not null default now()
);

-- 반 정보입니다. teacher_id는 담당 선생님을 의미하며, 초기에는 단일 담당자만 둡니다.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  name text not null,
  subject text,
  grade_label text,
  teacher_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 학생과 학부모 연락처입니다.
-- MVP에서는 개인정보를 최소화하기 위해 이름, 반, 학부모 전화번호 중심으로 시작합니다.
create table public.students (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  name text not null,
  school_name text,
  grade_label text,
  parent_name text,
  parent_phone text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- 학원별 문자 템플릿입니다.
-- 같은 사유라도 학원마다 말투가 다르므로 academy_id 기준으로 관리합니다.
create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  reason public.followup_reason not null,
  title text not null,
  body text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 학생별 팔로업 업무 단위입니다.
-- 실제 발송 성공/실패와 별개로 선생님이 어떤 후속 조치를 만들었는지 남깁니다.
create table public.followups (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  teacher_id uuid references public.profiles(id) on delete set null,
  reason public.followup_reason not null,
  message_body text not null,
  status public.followup_status not null default 'draft',
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- 문자 provider 응답 로그입니다.
-- 운영 중 장애/비용/오발송 확인을 위해 followups와 분리해 원본 발송 결과를 남깁니다.
create table public.message_logs (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references public.academies(id) on delete cascade,
  followup_id uuid references public.followups(id) on delete set null,
  provider text not null default 'solapi',
  provider_message_id text,
  recipient_phone text not null,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index platform_admins_role_idx on public.platform_admins(role);
create index academies_owner_user_id_idx on public.academies(owner_user_id);
create index academies_status_idx on public.academies(status);
create index classes_academy_id_idx on public.classes(academy_id);
create index students_academy_id_idx on public.students(academy_id);
create index students_class_id_idx on public.students(class_id);
create index followups_academy_id_idx on public.followups(academy_id);
create index followups_student_id_idx on public.followups(student_id);
create index message_logs_academy_id_idx on public.message_logs(academy_id);
create unique index message_templates_academy_reason_idx
  on public.message_templates(academy_id, reason);

alter table public.platform_admins enable row level security;
alter table public.academies enable row level security;
alter table public.academy_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.students enable row level security;
alter table public.message_templates enable row level security;
alter table public.followups enable row level security;
alter table public.message_logs enable row level security;

-- RLS policies는 인증/초대 플로우를 구현하면서 academy_id 기준으로 추가합니다.
