-- Fixes a latent RLS bug that made the whole messaging feature unusable for
-- every role since 0002_rls.sql.
--
-- conversation_participants_select referenced conversation_participants inside
-- its own USING clause. Postgres re-applies the policy when evaluating that
-- subquery, so the check recurses forever and the query aborts with
-- "infinite recursion detected in policy for relation
-- conversation_participants". Because conversations_select, messages_select
-- and messages_insert all reach conversation_participants through a subquery
-- too, they inherited the same failure — SELECTs on conversations and messages
-- returned an error rather than rows, so no conversation ever loaded.
--
-- The fix is the pattern already used elsewhere in this schema (current_org_v,
-- is_org_staff): read the table from a SECURITY DEFINER function, which is not
-- subject to RLS and therefore cannot recurse. Access semantics are unchanged
-- — participants of a conversation, and nobody else.

create or replace function is_conversation_participant(target_conversation uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = target_conversation
      and user_id = auth.uid()
  );
$$;

-- Reading conversations.organization_id from a participant-insert check would
-- itself trigger conversations_select (and recurse back here), so that lookup
-- gets a definer function as well.
create or replace function conversation_org(target_conversation uuid)
returns uuid
language sql stable security definer set search_path = public as $$
  select organization_id from conversations where id = target_conversation;
$$;

drop policy if exists conversations_select on conversations;
create policy conversations_select on conversations for select
  using (is_conversation_participant(id));

drop policy if exists conversation_participants_select on conversation_participants;
create policy conversation_participants_select on conversation_participants for select
  using (user_id = auth.uid() or is_conversation_participant(conversation_id));

-- Unchanged intent: you may add participants to a conversation belonging to
-- your own auto-école. same_org() now also requires an active account, so a
-- moniteur awaiting approval cannot open conversations.
drop policy if exists conversation_participants_insert on conversation_participants;
create policy conversation_participants_insert on conversation_participants for insert
  with check (same_org(conversation_org(conversation_id)));

drop policy if exists messages_select on messages;
create policy messages_select on messages for select
  using (is_conversation_participant(conversation_id));

drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert
  with check (sender_id = auth.uid() and is_conversation_participant(conversation_id));
