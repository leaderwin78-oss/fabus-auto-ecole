-- FABUS platform schema
-- Multi-tenant SaaS for driving schools (auto-écoles) in Senegal.
-- One tenant = one "organization" (auto-école). super_admin rows have organization_id = NULL.

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ==========================================================================
-- Enums
-- ==========================================================================
create type user_role as enum ('super_admin', 'admin', 'instructor', 'student');
create type org_status as enum ('active', 'suspended', 'archived');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');
create type content_status as enum ('draft', 'published', 'archived');
create type lesson_content_type as enum ('text', 'video', 'pdf', 'audio', 'quiz', 'exercise', 'link');
create type quiz_kind as enum ('quiz', 'mock_exam');
create type enrollment_status as enum ('active', 'completed', 'canceled');
create type appointment_type as enum ('driving_session', 'video_course', 'exam', 'other');
create type appointment_status as enum ('scheduled', 'confirmed', 'canceled', 'completed', 'no_show');
create type payment_status as enum ('pending', 'success', 'failed', 'refunded');
create type payment_provider as enum ('wave', 'orange_money', 'manual', 'other');
create type document_status as enum ('pending', 'submitted', 'validated', 'rejected');

-- ==========================================================================
-- Core tenancy & identity
-- ==========================================================================
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text,
  phone text,
  email text,
  logo_url text,
  status org_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1:1 with auth.users. Holds app-level identity, role and tenant binding.
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  role user_role not null default 'student',
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint super_admin_has_no_org check (
    (role = 'super_admin' and organization_id is null) or (role <> 'super_admin' and organization_id is not null)
  )
);
create index profiles_organization_id_idx on profiles(organization_id);
create index profiles_role_idx on profiles(role);

-- ==========================================================================
-- SaaS plans & subscriptions (super_admin managed)
-- ==========================================================================
create table plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- free | starter | pro | enterprise
  name text not null,
  price_fcfa integer not null default 0,
  max_instructors integer,
  max_students integer,
  storage_limit_mb integer,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  plan_id uuid not null references plans(id),
  status subscription_status not null default 'trialing',
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_organization_id_idx on subscriptions(organization_id);

-- ==========================================================================
-- Courses (formations) — Formation > Chapitres > Leçons > Quiz
-- ==========================================================================
create table courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'code', -- code | conduite | perfectionnement (admin-editable, not hardcoded elsewhere)
  cover_image_url text,
  price_fcfa integer not null default 0,
  status content_status not null default 'draft',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_organization_id_idx on courses(organization_id);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  position integer not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index chapters_course_id_idx on chapters(course_id);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters(id) on delete cascade,
  title text not null,
  content_type lesson_content_type not null default 'text',
  content_body text, -- rich text / html for 'text'
  content_url text,  -- video/pdf/audio/link asset url
  position integer not null default 0,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index lessons_chapter_id_idx on lessons(chapter_id);

create table quizzes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  kind quiz_kind not null default 'quiz',
  title text not null,
  pass_score_percent integer not null default 80,
  status content_status not null default 'draft',
  created_at timestamptz not null default now()
);
create index quizzes_course_id_idx on quizzes(course_id);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references quizzes(id) on delete cascade,
  question_text text not null,
  image_url text,
  position integer not null default 0
);
create index quiz_questions_quiz_id_idx on quiz_questions(quiz_id);

create table quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references quiz_questions(id) on delete cascade,
  answer_text text not null,
  is_correct boolean not null default false,
  position integer not null default 0
);
create index quiz_answers_question_id_idx on quiz_answers(question_id);

-- ==========================================================================
-- Enrollment & progress
-- ==========================================================================
create table enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  status enrollment_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, course_id)
);
create index enrollments_student_id_idx on enrollments(student_id);
create index enrollments_course_id_idx on enrollments(course_id);

create table lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create index lesson_progress_student_id_idx on lesson_progress(student_id);

create table quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id) on delete cascade,
  quiz_id uuid not null references quizzes(id) on delete cascade,
  score_percent integer not null,
  answers jsonb not null default '{}'::jsonb,
  attempted_at timestamptz not null default now()
);
create index quiz_attempts_student_id_idx on quiz_attempts(student_id);
create index quiz_attempts_quiz_id_idx on quiz_attempts(quiz_id);

-- ==========================================================================
-- Calendar: driving sessions, video courses, exams, appointments
-- ==========================================================================
create table appointments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  type appointment_type not null,
  title text not null,
  description text,
  instructor_id uuid references profiles(id),
  student_id uuid references profiles(id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  status appointment_status not null default 'scheduled',
  location text,
  meeting_provider text,
  meeting_room_id text,
  meeting_url text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_time_valid check (end_time > start_time)
);
create index appointments_organization_id_idx on appointments(organization_id);
create index appointments_instructor_id_idx on appointments(instructor_id);
create index appointments_student_id_idx on appointments(student_id);

-- Prevent a given instructor from being double-booked on overlapping time ranges.
alter table appointments add constraint appointments_no_instructor_overlap
  exclude using gist (
    instructor_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status not in ('canceled') and instructor_id is not null);

-- Prevent a given student from being double-booked on overlapping time ranges.
alter table appointments add constraint appointments_no_student_overlap
  exclude using gist (
    student_id with =,
    tstzrange(start_time, end_time) with &&
  ) where (status not in ('canceled') and student_id is not null);

create table session_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  instructor_id uuid not null references profiles(id),
  observations text,
  skills_rating jsonb not null default '{}'::jsonb, -- { "creneaux": 4, "priorites": 3, ... }
  created_at timestamptz not null default now()
);
create index session_notes_appointment_id_idx on session_notes(appointment_id);

-- ==========================================================================
-- Payments, invoices
-- ==========================================================================
create table payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  enrollment_id uuid references enrollments(id) on delete set null,
  amount_fcfa integer not null,
  currency text not null default 'XOF',
  status payment_status not null default 'pending',
  provider payment_provider not null default 'manual',
  provider_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index payments_organization_id_idx on payments(organization_id);
create index payments_student_id_idx on payments(student_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  number text not null,
  amount_fcfa integer not null,
  status payment_status not null default 'pending',
  issued_at timestamptz not null default now(),
  due_at timestamptz,
  unique (organization_id, number)
);
create index invoices_organization_id_idx on invoices(organization_id);
create index invoices_student_id_idx on invoices(student_id);

-- ==========================================================================
-- Notifications & messaging
-- ==========================================================================
create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on notifications(user_id);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table conversation_participants (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz,
  primary key (conversation_id, user_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  body text,
  attachment_url text,
  created_at timestamptz not null default now()
);
create index messages_conversation_id_idx on messages(conversation_id);

-- ==========================================================================
-- Documents (dossier administratif élève)
-- ==========================================================================
create table documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  owner_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  category text not null, -- cni | certificat_medical | timbre_fiscal | photo | autre
  file_url text,
  status document_status not null default 'pending',
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);
create index documents_owner_id_idx on documents(owner_id);

-- ==========================================================================
-- Activity log (audit trail)
-- ==========================================================================
create table activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_logs_organization_id_idx on activity_logs(organization_id);

-- ==========================================================================
-- updated_at triggers
-- ==========================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organizations_set_updated_at before update on organizations
  for each row execute function set_updated_at();
create trigger profiles_set_updated_at before update on profiles
  for each row execute function set_updated_at();
create trigger subscriptions_set_updated_at before update on subscriptions
  for each row execute function set_updated_at();
create trigger courses_set_updated_at before update on courses
  for each row execute function set_updated_at();
create trigger appointments_set_updated_at before update on appointments
  for each row execute function set_updated_at();
