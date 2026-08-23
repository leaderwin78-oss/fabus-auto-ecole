-- v2: rebrand-driven platform expansion — refined RBAC, school self-registration
-- with approval workflow, privacy policy versioning, community, official
-- announcements, and password-reset bookkeeping for the bootstrapped
-- super_admin account.
--
-- Naming keeps the project's existing lowercase enum convention (super_admin,
-- admin, instructor, student) rather than introducing the brief's uppercase
-- names — 'admin' already IS the auto-école owner role; this migration only
-- adds 'admin_auto_ecole' as a new subordinate staff role alongside it.

-- ==========================================================================
-- RBAC: subordinate staff role for an auto-école (owner keeps role='admin')
-- ==========================================================================
alter type user_role add value if not exists 'admin_auto_ecole';

-- Staff-of-this-org check used where BOTH the owner and delegated staff may
-- act (courses, students, calendar, payments, quizzes, documents).
create or replace function is_org_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) in ('admin', 'admin_auto_ecole'), false);
$$;

-- Owner-only actions (org settings, subscription, inviting/removing staff)
-- keep using is_org_admin(), which already means role = 'admin' exclusively.

-- Swap the broad staff policies that used is_org_admin() for is_org_staff()
-- so admin_auto_ecole can operate day-to-day without owner privileges.
drop policy if exists courses_write on courses;
create policy courses_write on courses for insert with check (same_org(organization_id) and (is_org_staff() or is_super_admin()));
drop policy if exists courses_update on courses;
create policy courses_update on courses for update using (same_org(organization_id) and (is_org_staff() or is_super_admin()));
drop policy if exists courses_delete on courses;
create policy courses_delete on courses for delete using (same_org(organization_id) and (is_org_admin() or is_super_admin()));
drop policy if exists courses_select on courses;
create policy courses_select on courses for select
  using (same_org(organization_id) and (status = 'published' or is_super_admin() or is_org_staff() or created_by = auth.uid()));

drop policy if exists chapters_write on chapters;
create policy chapters_write on chapters for all using (
  exists (select 1 from courses c where c.id = chapters.course_id and same_org(c.organization_id) and (is_org_staff() or is_super_admin()))
) with check (
  exists (select 1 from courses c where c.id = chapters.course_id and same_org(c.organization_id) and (is_org_staff() or is_super_admin()))
);
drop policy if exists chapters_select on chapters;
create policy chapters_select on chapters for select using (
  exists (
    select 1 from courses c where c.id = chapters.course_id and same_org(c.organization_id)
    and (c.status = 'published' or is_super_admin() or is_org_staff() or c.created_by = auth.uid())
  )
);

drop policy if exists lessons_write on lessons;
create policy lessons_write on lessons for all using (
  exists (select 1 from chapters ch join courses c on c.id = ch.course_id where ch.id = lessons.chapter_id and same_org(c.organization_id) and (is_org_staff() or is_super_admin()))
) with check (
  exists (select 1 from chapters ch join courses c on c.id = ch.course_id where ch.id = lessons.chapter_id and same_org(c.organization_id) and (is_org_staff() or is_super_admin()))
);
drop policy if exists lessons_select on lessons;
create policy lessons_select on lessons for select using (
  exists (
    select 1 from chapters ch join courses c on c.id = ch.course_id
    where ch.id = lessons.chapter_id and same_org(c.organization_id)
    and (c.status = 'published' or is_super_admin() or is_org_staff() or c.created_by = auth.uid())
  )
);

drop policy if exists quizzes_write on quizzes;
create policy quizzes_write on quizzes for all using (same_org(organization_id) and (is_org_staff() or is_super_admin()))
  with check (same_org(organization_id) and (is_org_staff() or is_super_admin()));
drop policy if exists quizzes_select on quizzes;
create policy quizzes_select on quizzes for select using (
  same_org(organization_id) and (status = 'published' or is_super_admin() or is_org_staff())
);

drop policy if exists enrollments_select on enrollments;
create policy enrollments_select on enrollments for select
  using (same_org(organization_id) and (is_org_staff() or is_super_admin() or student_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor' and p.organization_id = enrollments.organization_id)));
drop policy if exists enrollments_write on enrollments;
create policy enrollments_write on enrollments for insert with check (same_org(organization_id) and (is_org_staff() or is_super_admin()));
drop policy if exists enrollments_update on enrollments;
create policy enrollments_update on enrollments for update using (same_org(organization_id) and (is_org_staff() or is_super_admin()));

drop policy if exists appointments_select on appointments;
create policy appointments_select on appointments for select using (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or instructor_id = auth.uid() or student_id = auth.uid())
);
drop policy if exists appointments_write on appointments;
create policy appointments_write on appointments for insert with check (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or instructor_id = auth.uid())
);
drop policy if exists appointments_update on appointments;
create policy appointments_update on appointments for update using (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or instructor_id = auth.uid())
);

drop policy if exists payments_select on payments;
create policy payments_select on payments for select using (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or student_id = auth.uid())
);
drop policy if exists payments_write on payments;
create policy payments_write on payments for all using (same_org(organization_id) and (is_org_staff() or is_super_admin()))
  with check (same_org(organization_id) and (is_org_staff() or is_super_admin()));

drop policy if exists invoices_select on invoices;
create policy invoices_select on invoices for select using (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or student_id = auth.uid())
);
drop policy if exists invoices_write on invoices;
create policy invoices_write on invoices for all using (same_org(organization_id) and (is_org_staff() or is_super_admin()))
  with check (same_org(organization_id) and (is_org_staff() or is_super_admin()));

drop policy if exists documents_select on documents;
create policy documents_select on documents for select using (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or owner_id = auth.uid())
);
drop policy if exists documents_update on documents;
create policy documents_update on documents for update using (
  same_org(organization_id) and (is_org_staff() or is_super_admin() or owner_id = auth.uid())
);

-- ==========================================================================
-- Password bootstrap bookkeeping (super_admin seeded from env vars)
-- ==========================================================================
alter table profiles add column if not exists must_change_password boolean not null default false;

-- ==========================================================================
-- Organization application fields (school self-registration, section 4)
-- ==========================================================================
alter type org_status add value if not exists 'pending';
alter type org_status add value if not exists 'rejected';
-- 'active' continues to mean "approved & live"; 'pending' is the new default
-- for self-registered schools awaiting super_admin review.
alter table organizations alter column status set default 'pending';

alter table organizations add column if not exists responsable_name text;
alter table organizations add column if not exists address text;
alter table organizations add column if not exists quartier text;
alter table organizations add column if not exists region text;
alter table organizations add column if not exists gps_lat double precision;
alter table organizations add column if not exists gps_lng double precision;
alter table organizations add column if not exists cover_photo_url text;
alter table organizations add column if not exists description text;
alter table organizations add column if not exists id_number text;
alter table organizations add column if not exists services jsonb not null default '[]'::jsonb;
alter table organizations add column if not exists pricing jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists equipment jsonb not null default '{}'::jsonb;
alter table organizations add column if not exists application_documents jsonb not null default '[]'::jsonb;
alter table organizations add column if not exists terms_accepted_at timestamptz;
alter table organizations add column if not exists rejection_reason text;

-- Public directory only shows organizations the super_admin approved.
drop policy if exists organizations_select_public on organizations;
create policy organizations_select_public on organizations for select
  to anon, authenticated
  using (status = 'active');

-- A freshly self-registered school has no profiles yet, so the normal
-- "id = current_org_v()" self-select policy can't apply to its own founder
-- during signup. Let a newly created auth user read the org row they were
-- just linked to even before their profile insert completes the loop —
-- handled instead by inserting the profile in the same transaction from a
-- server action using the service-role client (see lib/actions/organizations.ts),
-- so no extra policy is needed here.

-- ==========================================================================
-- Privacy policy versioning + acceptance (section 5)
-- ==========================================================================
create table if not exists privacy_policies (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  title text not null,
  content text not null,
  status content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists privacy_policy_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  policy_id uuid not null references privacy_policies(id),
  accepted_at timestamptz not null default now(),
  ip_address text,
  unique (user_id, policy_id)
);

alter table privacy_policies enable row level security;
create policy privacy_policies_select on privacy_policies for select using (status = 'published' or is_super_admin());
create policy privacy_policies_write on privacy_policies for all using (is_super_admin()) with check (is_super_admin());

alter table privacy_policy_acceptances enable row level security;
create policy privacy_policy_acceptances_select on privacy_policy_acceptances for select using (user_id = auth.uid() or is_super_admin());
create policy privacy_policy_acceptances_insert on privacy_policy_acceptances for insert with check (user_id = auth.uid());

-- ==========================================================================
-- Official announcements (section 18) — super_admin only content
-- ==========================================================================
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  image_url text,
  file_url text,
  category text not null default 'annonce',
  status content_status not null default 'draft',
  published_at timestamptz,
  author_id uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table announcements enable row level security;
create policy announcements_select on announcements for select using (status = 'published' or is_super_admin());
create policy announcements_write on announcements for all using (is_super_admin()) with check (is_super_admin());

-- ==========================================================================
-- Community: cross-tenant social space (section 16) — deliberately not
-- organization-scoped, unlike every other table in this schema. Business
-- and academic data stay strictly isolated per-tenant (see 0002_rls.sql);
-- this is the one intentional shared space, same as a public social feed.
-- ==========================================================================
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  body text,
  image_url text,
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create table if not exists post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

create table if not exists post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists post_reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  reporter_id uuid not null references profiles(id),
  reason text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table posts enable row level security;
create policy posts_select on posts for select using (status = 'published' or author_id = auth.uid() or is_super_admin());
create policy posts_insert on posts for insert with check (author_id = auth.uid());
create policy posts_update on posts for update using (author_id = auth.uid() or is_super_admin());
create policy posts_delete on posts for delete using (author_id = auth.uid() or is_super_admin());

alter table post_likes enable row level security;
create policy post_likes_select on post_likes for select using (true);
create policy post_likes_insert on post_likes for insert with check (user_id = auth.uid());
create policy post_likes_delete on post_likes for delete using (user_id = auth.uid());

alter table post_comments enable row level security;
create policy post_comments_select on post_comments for select using (true);
create policy post_comments_insert on post_comments for insert with check (author_id = auth.uid());
create policy post_comments_delete on post_comments for delete using (author_id = auth.uid() or is_super_admin());

alter table post_reports enable row level security;
create policy post_reports_select on post_reports for select using (is_super_admin());
create policy post_reports_insert on post_reports for insert with check (reporter_id = auth.uid());
create policy post_reports_update on post_reports for update using (is_super_admin());

create index if not exists posts_created_at_idx on posts(created_at desc);
create index if not exists post_comments_post_id_idx on post_comments(post_id);

-- ==========================================================================
-- Avatar storage (public read, owner-only write) — path: {user_id}/{file}
-- ==========================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects for select to public using (bucket_id = 'avatars');
create policy avatars_owner_write on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (split_part(name, '/', 1))::uuid = auth.uid());
create policy avatars_owner_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (split_part(name, '/', 1))::uuid = auth.uid());

-- ==========================================================================
-- Marketplace (section 15): published courses are discoverable platform-wide,
-- not just within the viewer's own auto-école — deliberately looser than the
-- rest of courses_select (which still gates drafts to same-org staff).
-- Enrollment itself stays same-org only (see lib/actions/courses.ts);
-- cross-org discovery does not imply cross-org purchase.
-- ==========================================================================
create policy courses_select_marketplace on courses for select
  to authenticated
  using (status = 'published');
