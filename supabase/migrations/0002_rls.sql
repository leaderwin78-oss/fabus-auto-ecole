-- Row Level Security: strict multi-tenant isolation + RBAC.
-- Helper functions run SECURITY DEFINER so they can read `profiles` without
-- triggering recursive RLS evaluation on that same table.

create or replace function current_role_v()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function current_org_v()
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'super_admin', false);
$$;

create or replace function is_org_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where id = auth.uid()) = 'admin', false);
$$;

create or replace function same_org(target_org uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select is_super_admin() or (target_org is not null and target_org = current_org_v());
$$;

-- ==========================================================================
-- organizations
-- ==========================================================================
alter table organizations enable row level security;

create policy organizations_select on organizations for select
  using (is_super_admin() or id = current_org_v());

-- Public directory: anonymous visitors (landing page, signup flow) can browse
-- active auto-écoles to pick one when registering. No sensitive data on this table.
create policy organizations_select_public on organizations for select
  to anon
  using (status = 'active');

create policy organizations_insert on organizations for insert
  with check (is_super_admin());

create policy organizations_update on organizations for update
  using (is_super_admin() or (id = current_org_v() and is_org_admin()));

create policy organizations_delete on organizations for delete
  using (is_super_admin());

-- ==========================================================================
-- profiles
-- ==========================================================================
alter table profiles enable row level security;

create policy profiles_select on profiles for select
  using (is_super_admin() or organization_id = current_org_v() or id = auth.uid());

-- Self-service signup is only ever allowed to create a 'student' row for
-- yourself. Admin/instructor accounts can only be provisioned by an org
-- admin (or super_admin), never by the signing-up user themselves.
create policy profiles_insert on profiles for insert
  with check (
    is_super_admin()
    or (is_org_admin() and organization_id = current_org_v())
    or (id = auth.uid() and role = 'student')
  );

create policy profiles_update on profiles for update
  using (is_super_admin() or (is_org_admin() and organization_id = current_org_v()) or id = auth.uid());

create policy profiles_delete on profiles for delete
  using (is_super_admin() or (is_org_admin() and organization_id = current_org_v()));

-- ==========================================================================
-- plans (platform-wide, super_admin managed, publicly readable for pricing)
-- ==========================================================================
alter table plans enable row level security;

create policy plans_select on plans for select using (true);
create policy plans_write on plans for all
  using (is_super_admin()) with check (is_super_admin());

-- ==========================================================================
-- subscriptions
-- ==========================================================================
alter table subscriptions enable row level security;

create policy subscriptions_select on subscriptions for select
  using (same_org(organization_id));
create policy subscriptions_write on subscriptions for all
  using (is_super_admin()) with check (is_super_admin());

-- ==========================================================================
-- generic tenant-scoped policy generator (applied per table below)
-- ==========================================================================

-- courses: admins manage; instructors/students read published within own org
alter table courses enable row level security;
create policy courses_select on courses for select
  using (same_org(organization_id) and (status = 'published' or is_super_admin() or is_org_admin() or created_by = auth.uid()));
create policy courses_write on courses for insert with check (same_org(organization_id) and (is_org_admin() or is_super_admin()));
create policy courses_update on courses for update using (same_org(organization_id) and (is_org_admin() or is_super_admin()));
create policy courses_delete on courses for delete using (same_org(organization_id) and (is_org_admin() or is_super_admin()));

alter table chapters enable row level security;
create policy chapters_select on chapters for select using (
  exists (select 1 from courses c where c.id = chapters.course_id and same_org(c.organization_id))
);
create policy chapters_write on chapters for all using (
  exists (select 1 from courses c where c.id = chapters.course_id and same_org(c.organization_id) and (is_org_admin() or is_super_admin()))
) with check (
  exists (select 1 from courses c where c.id = chapters.course_id and same_org(c.organization_id) and (is_org_admin() or is_super_admin()))
);

alter table lessons enable row level security;
create policy lessons_select on lessons for select using (
  exists (select 1 from chapters ch join courses c on c.id = ch.course_id where ch.id = lessons.chapter_id and same_org(c.organization_id))
);
create policy lessons_write on lessons for all using (
  exists (select 1 from chapters ch join courses c on c.id = ch.course_id where ch.id = lessons.chapter_id and same_org(c.organization_id) and (is_org_admin() or is_super_admin()))
) with check (
  exists (select 1 from chapters ch join courses c on c.id = ch.course_id where ch.id = lessons.chapter_id and same_org(c.organization_id) and (is_org_admin() or is_super_admin()))
);

alter table quizzes enable row level security;
create policy quizzes_select on quizzes for select using (same_org(organization_id));
create policy quizzes_write on quizzes for all using (same_org(organization_id) and (is_org_admin() or is_super_admin()))
  with check (same_org(organization_id) and (is_org_admin() or is_super_admin()));

alter table quiz_questions enable row level security;
create policy quiz_questions_select on quiz_questions for select using (
  exists (select 1 from quizzes q where q.id = quiz_questions.quiz_id and same_org(q.organization_id))
);
create policy quiz_questions_write on quiz_questions for all using (
  exists (select 1 from quizzes q where q.id = quiz_questions.quiz_id and same_org(q.organization_id) and (is_org_admin() or is_super_admin()))
) with check (
  exists (select 1 from quizzes q where q.id = quiz_questions.quiz_id and same_org(q.organization_id) and (is_org_admin() or is_super_admin()))
);

alter table quiz_answers enable row level security;
create policy quiz_answers_select on quiz_answers for select using (
  exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
    where qq.id = quiz_answers.question_id and same_org(q.organization_id)
  )
);
create policy quiz_answers_write on quiz_answers for all using (
  exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
    where qq.id = quiz_answers.question_id and same_org(q.organization_id) and (is_org_admin() or is_super_admin())
  )
) with check (
  exists (
    select 1 from quiz_questions qq join quizzes q on q.id = qq.quiz_id
    where qq.id = quiz_answers.question_id and same_org(q.organization_id) and (is_org_admin() or is_super_admin())
  )
);

-- enrollments: student sees own; admin/instructor sees org
alter table enrollments enable row level security;
create policy enrollments_select on enrollments for select
  using (same_org(organization_id) and (is_org_admin() or is_super_admin() or student_id = auth.uid()
    or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor' and p.organization_id = enrollments.organization_id)));
create policy enrollments_write on enrollments for insert with check (same_org(organization_id) and (is_org_admin() or is_super_admin()));
create policy enrollments_update on enrollments for update using (same_org(organization_id) and (is_org_admin() or is_super_admin()));
create policy enrollments_delete on enrollments for delete using (same_org(organization_id) and (is_org_admin() or is_super_admin()));

-- lesson_progress: student owns their rows; org staff can read
alter table lesson_progress enable row level security;
create policy lesson_progress_select on lesson_progress for select using (
  student_id = auth.uid() or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','instructor','super_admin')
    and p.organization_id = (select organization_id from profiles where id = lesson_progress.student_id)
  ) or is_super_admin()
);
create policy lesson_progress_write on lesson_progress for all using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- quiz_attempts: same pattern as lesson_progress
alter table quiz_attempts enable row level security;
create policy quiz_attempts_select on quiz_attempts for select using (
  student_id = auth.uid() or exists (
    select 1 from profiles p where p.id = auth.uid() and p.role in ('admin','instructor','super_admin')
    and p.organization_id = (select organization_id from profiles where id = quiz_attempts.student_id)
  ) or is_super_admin()
);
create policy quiz_attempts_write on quiz_attempts for insert with check (student_id = auth.uid());

-- appointments: visible to org staff, and to the instructor/student directly involved
alter table appointments enable row level security;
create policy appointments_select on appointments for select using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or instructor_id = auth.uid() or student_id = auth.uid())
);
create policy appointments_write on appointments for insert with check (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or instructor_id = auth.uid())
);
create policy appointments_update on appointments for update using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or instructor_id = auth.uid())
);
create policy appointments_delete on appointments for delete using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or instructor_id = auth.uid())
);

alter table session_notes enable row level security;
create policy session_notes_select on session_notes for select using (
  exists (select 1 from appointments a where a.id = session_notes.appointment_id
    and (same_org(a.organization_id) and (is_org_admin() or is_super_admin() or a.instructor_id = auth.uid() or a.student_id = auth.uid())))
);
create policy session_notes_write on session_notes for all using (
  exists (select 1 from appointments a where a.id = session_notes.appointment_id and (a.instructor_id = auth.uid() or is_org_admin() or is_super_admin()))
) with check (
  exists (select 1 from appointments a where a.id = session_notes.appointment_id and (a.instructor_id = auth.uid() or is_org_admin() or is_super_admin()))
);

-- payments & invoices: student sees own; org staff sees org
alter table payments enable row level security;
create policy payments_select on payments for select using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or student_id = auth.uid())
);
create policy payments_write on payments for all using (same_org(organization_id) and (is_org_admin() or is_super_admin()))
  with check (same_org(organization_id) and (is_org_admin() or is_super_admin()));

alter table invoices enable row level security;
create policy invoices_select on invoices for select using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or student_id = auth.uid())
);
create policy invoices_write on invoices for all using (same_org(organization_id) and (is_org_admin() or is_super_admin()))
  with check (same_org(organization_id) and (is_org_admin() or is_super_admin()));

-- notifications: strictly own
alter table notifications enable row level security;
create policy notifications_select on notifications for select using (user_id = auth.uid());
create policy notifications_update on notifications for update using (user_id = auth.uid());
create policy notifications_insert on notifications for insert with check (
  is_super_admin() or is_org_admin() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'instructor')
);

-- messaging: only participants
alter table conversations enable row level security;
create policy conversations_select on conversations for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = conversations.id and cp.user_id = auth.uid())
);
create policy conversations_insert on conversations for insert with check (same_org(organization_id));

alter table conversation_participants enable row level security;
create policy conversation_participants_select on conversation_participants for select using (
  user_id = auth.uid() or exists (select 1 from conversation_participants cp2 where cp2.conversation_id = conversation_participants.conversation_id and cp2.user_id = auth.uid())
);
create policy conversation_participants_insert on conversation_participants for insert with check (
  exists (select 1 from conversations c where c.id = conversation_id and same_org(c.organization_id))
);
create policy conversation_participants_update on conversation_participants for update using (user_id = auth.uid());

alter table messages enable row level security;
create policy messages_select on messages for select using (
  exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);
create policy messages_insert on messages for insert with check (
  sender_id = auth.uid() and exists (select 1 from conversation_participants cp where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid())
);

-- documents: student owns; org staff manages
alter table documents enable row level security;
create policy documents_select on documents for select using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or owner_id = auth.uid())
);
create policy documents_insert on documents for insert with check (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or owner_id = auth.uid())
);
create policy documents_update on documents for update using (
  same_org(organization_id) and (is_org_admin() or is_super_admin() or owner_id = auth.uid())
);
create policy documents_delete on documents for delete using (
  same_org(organization_id) and (is_org_admin() or is_super_admin())
);

-- activity_logs: staff of the org can read; system inserts via service role
alter table activity_logs enable row level security;
create policy activity_logs_select on activity_logs for select using (
  is_super_admin() or (organization_id is not null and same_org(organization_id) and (is_org_admin()))
);
create policy activity_logs_insert on activity_logs for insert with check (true);
