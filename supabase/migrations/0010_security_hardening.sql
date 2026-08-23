-- Corrections issues de l'audit de sécurité du 23 août 2026.
--
-- Trois failles avaient été confirmées par exploitation réelle contre la base
-- de production. Toutes découlent du même angle mort : une policy UPDATE sans
-- clause WITH CHECK. Postgres réutilise alors la clause USING pour valider la
-- ligne modifiée — ce qui protège tant que la mutation fait sortir la ligne du
-- périmètre USING, mais pas quand l'utilisateur peut changer une colonne de
-- décision tout en y restant conforme.
--
-- WITH CHECK ne peut pas comparer NEW à OLD ; c'est pourquoi les deux premiers
-- correctifs sont des triggers BEFORE UPDATE, sur le modèle de celui déjà posé
-- sur profiles dans 0008_signup.sql.

-- ==========================================================================
-- CONCLUSION #1 (CRITIQUE) — une auto-école pouvait s'auto-valider
--
-- organizations_update autorise l'admin de l'école à modifier sa propre ligne.
-- La colonne `status` porte la décision du super admin : l'école en attente
-- pouvait donc la passer elle-même à 'active', apparaître dans l'annuaire
-- public, recruter des élèves et encaisser — sans validation humaine. Une
-- école rejetée pouvait se réactiver de la même façon.
-- ==========================================================================
create or replace function organizations_guard_status()
returns trigger
language plpgsql set search_path = public as $$
begin
  -- Les actions serveur (approbation par le super admin, création d'école)
  -- passent par la clé service_role : elles contournent le RLS mais pas les
  -- triggers, il faut donc les laisser passer explicitement.
  if current_user in ('service_role', 'supabase_admin', 'postgres')
     or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
     or is_super_admin()
  then
    return new;
  end if;

  -- Tout le reste garde son statut : l'école peut éditer son nom, son adresse,
  -- ses tarifs, ses services — mais jamais sa propre validation.
  new.status := old.status;
  new.rejection_reason := old.rejection_reason;
  return new;
end;
$$;

drop trigger if exists organizations_guard_status_trg on organizations;
create trigger organizations_guard_status_trg
  before update on organizations
  for each row execute function organizations_guard_status();

-- ==========================================================================
-- CONCLUSION #2 (HAUTE) — un élève pouvait valider ses propres documents
--
-- documents_update autorise `owner_id = auth.uid()` pour que l'élève gère ses
-- pièces. Rien n'empêchait de passer `status` de 'submitted' à 'validated' :
-- le dossier de permis apparaissait complet sans qu'aucun responsable ne l'ait
-- examiné. L'action serveur updateDocumentStatus() vérifiait bien le rôle —
-- l'attaquant écrivait simplement en direct via l'API PostgREST.
-- ==========================================================================
create or replace function documents_guard_status()
returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'supabase_admin', 'postgres')
     or coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
     or is_super_admin()
     or is_org_staff()
  then
    return new;
  end if;

  -- L'élève garde la main sur le titre, la catégorie et le fichier ;
  -- la validation reste celle de l'auto-école.
  new.status := old.status;
  return new;
end;
$$;

drop trigger if exists documents_guard_status_trg on documents;
create trigger documents_guard_status_trg
  before update on documents
  for each row execute function documents_guard_status();

-- ==========================================================================
-- CONCLUSION #3 (HAUTE) — notifications forgées vers n'importe qui
--
-- L'ancienne policy vérifiait le rôle de l'ÉMETTEUR sans jamais contraindre le
-- DESTINATAIRE. Tout moniteur ou admin pouvait déposer, dans la cloche de
-- n'importe quel utilisateur de la plateforme — y compris d'une auto-école
-- concurrente — un message au titre, au corps et au LIEN arbitraires. Canal de
-- hameçonnage parfait, servi par l'interface authentique du produit.
-- ==========================================================================
drop policy if exists notifications_insert on notifications;
create policy notifications_insert on notifications for insert
  with check (
    is_super_admin()
    or (
      same_org(organization_id)
      and (is_org_staff() or current_role_v() = 'instructor')
      -- le destinataire doit appartenir à l'auto-école de l'émetteur
      and exists (
        select 1 from profiles p
        where p.id = notifications.user_id
          and p.organization_id = current_org_v()
      )
    )
  );

-- ==========================================================================
-- CONCLUSION #4 (HAUTE) — assistant IA sans limitation de débit
--
-- askAssistant() appelle une API facturée au token, sans plafond. Compteur
-- porté en base plutôt qu'en mémoire : Vercel est sans état, un compteur en
-- mémoire serait remis à zéro à chaque déploiement et différent par instance.
--
-- Aucune policy n'est créée volontairement : RLS actif + zéro policy = table
-- inaccessible à tout rôle client. Seule la clé service_role y écrit.
-- ==========================================================================
create table if not exists ai_usage (
  user_id uuid not null references profiles(id) on delete cascade,
  window_start timestamptz not null,
  calls int not null default 0,
  primary key (user_id, window_start)
);
alter table ai_usage enable row level security;

create index if not exists ai_usage_window_idx on ai_usage(window_start);

-- Incrément et vérification en UNE instruction : lire puis écrire depuis
-- l'application laisserait deux requêtes simultanées lire le même compteur et
-- passer toutes les deux. SECURITY DEFINER parce que la table n'a
-- volontairement aucune policy.
create or replace function consume_ai_quota(p_max int)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_calls int;
begin
  if auth.uid() is null then
    return false;
  end if;

  insert into ai_usage (user_id, window_start, calls)
  values (auth.uid(), v_window, 1)
  on conflict (user_id, window_start)
  do update set calls = ai_usage.calls + 1
  returning calls into v_calls;

  return v_calls <= p_max;
end;
$$;

revoke all on function consume_ai_quota(int) from public;
grant execute on function consume_ai_quota(int) to authenticated;

-- ==========================================================================
-- CONCLUSION #5 (MOYENNE) — bucket course-assets en accès public
--
-- Le bucket héberge les supports de cours, c'est-à-dire le produit que les
-- élèves paient. `public = true` rend chaque fichier lisible par URL sans
-- authentification et met le RLS hors circuit. Le bucket `documents` était
-- déjà correctement privé : on applique ici le même modèle.
--
-- Sans impact fonctionnel : aucun code applicatif ne lit ni n'écrit dans ce
-- bucket aujourd'hui (les leçons pointent vers des URLs externes).
-- ==========================================================================
update storage.buckets set public = false where id = 'course-assets';
