-- v3 commerce layer: configurable commission/fee rates (never computed
-- client-side — see lib/actions/payments.ts), free-trial automation on
-- school approval, instructor extra services, referrals, social links,
-- and a curated pedagogical resource library (no external search API).

-- ==========================================================================
-- Platform-wide, super_admin-configurable commercial settings (singleton row)
-- ==========================================================================
create table if not exists platform_settings (
  id boolean primary key default true check (id),
  course_platform_commission_percent numeric(5,2) not null default 20,
  registration_platform_fee_percent numeric(5,2) not null default 5,
  extra_service_commission_percent numeric(5,2) not null default 20,
  trial_days integer not null default 90,
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id)
);
insert into platform_settings (id) values (true) on conflict (id) do nothing;

-- Default trial plan every newly approved school starts on (section 6).
insert into plans (code, name, price_fcfa, max_instructors, max_students, storage_limit_mb, is_active)
values ('free', 'Essai gratuit', 0, 3, 50, 512, true)
on conflict (code) do nothing;

alter table platform_settings enable row level security;
create policy platform_settings_select on platform_settings for select using (true);
create policy platform_settings_write on platform_settings for update using (is_super_admin()) with check (is_super_admin());

-- ==========================================================================
-- Payments: typed, with the commission breakdown computed and stored
-- server-side at settlement time (see markPaymentPaid). gross/commission/
-- fee/net are snapshots — changing platform_settings later never rewrites
-- historical transactions.
-- ==========================================================================
create type payment_type as enum ('registration', 'course', 'extra_service', 'subscription', 'other');

alter table payments add column if not exists payment_type payment_type not null default 'registration';
alter table payments add column if not exists gross_amount_fcfa integer;
alter table payments add column if not exists platform_commission_fcfa integer not null default 0;
alter table payments add column if not exists seller_amount_fcfa integer;
alter table payments add column if not exists course_id uuid references courses(id) on delete set null;
alter table payments add column if not exists extra_service_id uuid;

-- ==========================================================================
-- Subscriptions: explicit trial window + richer status lifecycle
-- ==========================================================================
alter type subscription_status add value if not exists 'past_due';
alter table subscriptions add column if not exists trial_start timestamptz;
alter table subscriptions add column if not exists trial_end timestamptz;

-- ==========================================================================
-- Instructor extra services ("1h de conduite supplémentaire", etc.)
-- ==========================================================================
create table if not exists instructor_services (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  instructor_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  description text,
  duration_minutes integer,
  price_fcfa integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists service_bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references instructor_services(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  instructor_id uuid not null references profiles(id) on delete cascade,
  payment_id uuid references payments(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'canceled')),
  created_at timestamptz not null default now()
);

alter table payments add constraint payments_extra_service_id_fkey
  foreign key (extra_service_id) references service_bookings(id) on delete set null;

alter table instructor_services enable row level security;
create policy instructor_services_select on instructor_services for select using (same_org(organization_id) and (is_active or instructor_id = auth.uid() or is_org_staff() or is_super_admin()));
create policy instructor_services_write on instructor_services for all
  using (instructor_id = auth.uid() or (same_org(organization_id) and (is_org_staff() or is_super_admin())))
  with check (instructor_id = auth.uid() or (same_org(organization_id) and (is_org_staff() or is_super_admin())));

alter table service_bookings enable row level security;
create policy service_bookings_select on service_bookings for select using (
  student_id = auth.uid() or instructor_id = auth.uid() or (same_org(organization_id) and (is_org_staff() or is_super_admin()))
);
create policy service_bookings_insert on service_bookings for insert with check (student_id = auth.uid());
create policy service_bookings_update on service_bookings for update using (
  instructor_id = auth.uid() or (same_org(organization_id) and (is_org_staff() or is_super_admin()))
);

-- ==========================================================================
-- Referrals ("Inviter un ami")
-- ==========================================================================
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references profiles(id) on delete cascade,
  code text not null unique,
  invited_email text,
  invited_user_id uuid references profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'joined')),
  created_at timestamptz not null default now(),
  joined_at timestamptz
);

alter table referrals enable row level security;
create policy referrals_select on referrals for select using (inviter_id = auth.uid() or is_super_admin());
create policy referrals_insert on referrals for insert with check (inviter_id = auth.uid());
-- Joining a referral happens server-side via the service-role client during
-- signup (the invitee has no session yet), so no authenticated update policy
-- is needed here.

-- ==========================================================================
-- Social profile links (section 25) — public only when the user opts in
-- ==========================================================================
alter table profiles add column if not exists social_links jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists social_links_public boolean not null default false;

-- ==========================================================================
-- Pedagogical resource library (section 23) — curated by super_admin, no
-- external search API involved; "search" is a filter over this table.
-- ==========================================================================
create table if not exists resource_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  category text not null default 'autre',
  description text,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

alter table resource_links enable row level security;
create policy resource_links_select on resource_links for select using (true);
create policy resource_links_write on resource_links for all using (is_super_admin()) with check (is_super_admin());
