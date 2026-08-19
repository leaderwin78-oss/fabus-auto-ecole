-- Automated notifications (section 16): "cours demain" / "cours dans 1 heure".
-- Runs on a schedule via pg_cron rather than app code, so reminders still
-- fire even if nobody has the app open.

alter table appointments add column if not exists reminder_24h_sent boolean not null default false;
alter table appointments add column if not exists reminder_1h_sent boolean not null default false;

create or replace function send_appointment_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- 24h-ahead reminders
  for r in
    select * from appointments
    where status in ('scheduled', 'confirmed')
      and not reminder_24h_sent
      and start_time between now() and now() + interval '24 hours'
  loop
    if r.student_id is not null then
      insert into notifications (organization_id, user_id, type, title, body, link)
      values (r.organization_id, r.student_id, 'session_reminder_24h', 'Cours demain', r.title || ' — ' || to_char(r.start_time, 'DD/MM à HH24:MI'), '/student/calendar');
    end if;
    if r.instructor_id is not null then
      insert into notifications (organization_id, user_id, type, title, body, link)
      values (r.organization_id, r.instructor_id, 'session_reminder_24h', 'Séance demain', r.title || ' — ' || to_char(r.start_time, 'DD/MM à HH24:MI'), '/instructor/calendar');
    end if;
    update appointments set reminder_24h_sent = true where id = r.id;
  end loop;

  -- 1h-ahead reminders
  for r in
    select * from appointments
    where status in ('scheduled', 'confirmed')
      and not reminder_1h_sent
      and start_time between now() and now() + interval '1 hour'
  loop
    if r.student_id is not null then
      insert into notifications (organization_id, user_id, type, title, body, link)
      values (r.organization_id, r.student_id, 'session_reminder_1h', 'Cours dans 1 heure', r.title, case when r.type = 'video_course' then '/student' else '/student/calendar' end);
    end if;
    if r.instructor_id is not null then
      insert into notifications (organization_id, user_id, type, title, body, link)
      values (r.organization_id, r.instructor_id, 'session_reminder_1h', 'Séance dans 1 heure', r.title, '/instructor/calendar');
    end if;
    update appointments set reminder_1h_sent = true where id = r.id;
  end loop;
end;
$$;

-- Requires the pg_cron extension (Database → Extensions in the Supabase
-- dashboard, or the line below if your role has permission to create it).
create extension if not exists pg_cron;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'fabus-appointment-reminders') then
    perform cron.schedule(
      'fabus-appointment-reminders',
      '*/15 * * * *',
      $cron$select send_appointment_reminders();$cron$
    );
  end if;
end;
$$;

-- "Paiement reçu" / "paiement échoué" notifications (section 16), fired the
-- instant a payment's status changes — no polling needed for this one.
create or replace function notify_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'success' and old.status is distinct from 'success' then
    insert into notifications (organization_id, user_id, type, title, body, link)
    values (new.organization_id, new.student_id, 'payment_success', 'Paiement reçu', new.amount_fcfa || ' F CFA', '/student/payments');
  elsif new.status = 'failed' and old.status is distinct from 'failed' then
    insert into notifications (organization_id, user_id, type, title, body, link)
    values (new.organization_id, new.student_id, 'payment_failed', 'Paiement échoué', new.amount_fcfa || ' F CFA — réessayez ou contactez votre auto-école', '/student/payments');
  end if;
  return new;
end;
$$;

drop trigger if exists payments_notify_status_change on payments;
create trigger payments_notify_status_change
  after update on payments
  for each row execute function notify_payment_status_change();
