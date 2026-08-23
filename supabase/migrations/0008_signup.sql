-- v4: role-aware self-registration.
--
-- Until now only two doors existed: students self-registered into an existing
-- school, and schools applied for approval. Moniteurs could ONLY be created by
-- an org admin via inviteStaffMember(). The signup flow now offers all three
-- doors from a single role chooser, which means a moniteur can apply on their
-- own — and an instructor account that lets anyone read a school's students is
-- exactly the kind of account you must not hand out on a self-service form.
-- So a self-registered moniteur lands in status='pending' and stays walled off
-- from every tenant table until the school's owner approves them.

-- ==========================================================================
-- Account approval status
-- ==========================================================================
do $$ begin
  create type profile_status as enum ('pending', 'active', 'rejected');
exception when duplicate_object then null;
end $$;

-- Default 'active' so every pre-existing account (and every admin-provisioned
-- or student self-registration path) keeps behaving exactly as before.
alter table profiles add column if not exists status profile_status not null default 'active';
alter table profiles add column if not exists rejection_reason text;

-- Signup questionnaire fields, mirroring the step-by-step flow.
alter table profiles add column if not exists birth_date date;
alter table profiles add column if not exists gender text;
alter table profiles add column if not exists license_number text;
alter table profiles add column if not exists years_experience int;
alter table profiles add column if not exists teaching_categories text[] not null default '{}';
alter table profiles add column if not exists bio text;

create index if not exists profiles_status_idx on profiles(status);

-- ==========================================================================
-- Helpers
-- ==========================================================================
create or replace function current_status_v()
returns profile_status
language sql stable security definer set search_path = public as $$
  select status from profiles where id = auth.uid();
$$;

create or replace function is_active_member()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status from profiles where id = auth.uid()) = 'active', false);
$$;

-- ==========================================================================
-- Wall pending/rejected accounts off from tenant data
--
-- same_org() is the single predicate behind every tenant-scoped policy
-- (courses, enrollments, payments, appointments, documents, messages...), so
-- adding the status check here covers all of them at once rather than
-- rewriting thirty policies.
-- ==========================================================================
create or replace function same_org(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_super_admin()
      or (target_org is not null and target_org = current_org_v() and is_active_member());
$$;

-- profiles_select reads current_org_v() directly rather than same_org(), so it
-- needs the status check applied explicitly — otherwise a pending moniteur
-- could still list every student's name and phone number.
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (
    is_super_admin()
    or id = auth.uid()
    or (organization_id = current_org_v() and is_active_member())
  );

-- organizations_select is deliberately NOT tightened: a pending moniteur must
-- still be able to read the name of the school they applied to, so the
-- "waiting for approval" screen can say who is reviewing their file. The row
-- holds no sensitive data (it is already public for active schools).

-- ==========================================================================
-- Privilege-escalation guard on profiles
--
-- profiles_update allows `id = auth.uid()` so users can edit their own name,
-- phone, avatar and social links. With no WITH CHECK clause Postgres reuses
-- the USING expression, which stays true after the row changes — meaning any
-- user could previously UPDATE their own role to 'admin', move themselves to
-- another organization, or (once this migration lands) self-approve a pending
-- application. A BEFORE UPDATE trigger is the only place that can compare NEW
-- against OLD, so the freeze happens here rather than in a policy.
--
-- must_change_password is intentionally NOT frozen: changeOwnPassword() clears
-- it through the user's own RLS client, and it is a UX flag, not a boundary.
-- ==========================================================================
-- Deliberately SECURITY INVOKER (the default): inside a SECURITY DEFINER
-- function current_user reports the function's OWNER, not the caller, which
-- would make the service-role check below always true and turn this whole
-- guard into a no-op. Running as the invoker keeps current_user meaningful.
-- The helpers it calls (is_super_admin, is_org_admin, current_org_v) are
-- themselves SECURITY DEFINER, so reading profiles still works.
create or replace function profiles_guard_privileged_columns()
returns trigger
language plpgsql set search_path = public as $$
begin
  -- Server actions using the service-role key (applyAsSchool, applyAsInstructor,
  -- inviteStaffMember) bypass RLS but NOT triggers, so they must be let through.
  -- PostgREST issues SET LOCAL ROLE service_role for those requests; the JWT
  -- claim is checked too in case the role name ever changes.
  if current_user in ('service_role', 'supabase_admin', 'postgres')
     or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
  then
    return new;
  end if;

  if is_super_admin() or (is_org_admin() and old.organization_id = current_org_v()) then
    return new;
  end if;

  new.role := old.role;
  new.organization_id := old.organization_id;
  new.status := old.status;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns_trg on profiles;
create trigger profiles_guard_privileged_columns_trg
  before update on profiles
  for each row execute function profiles_guard_privileged_columns();
