-- Phase « encaisser réellement », première pierre.
--
-- Le constat : l'abonnement était affiché dans les paramètres mais vérifié
-- nulle part. Une auto-école dont l'essai gratuit expirait continuait à tout
-- utiliser, indéfiniment. Il n'existait aucun moment où elle avait une raison
-- de payer — c'est la seule raison pour laquelle la plateforme ne rapportait
-- rien.
--
-- Deux auto-écoles n'avaient même aucun abonnement : créées avant la logique
-- d'essai, elles étaient en gratuité permanente sans que rien ne le signale.

-- ==========================================================================
-- Délai de grâce
--
-- On ne coupe pas l'accès à la seconde où la période s'achève : une école qui
-- perd son outil un matin sans préavis se retourne contre le fournisseur, pas
-- contre sa propre négligence. Sept jours pendant lesquels tout fonctionne,
-- avec un bandeau d'avertissement, puis blocage.
-- ==========================================================================
alter table platform_settings add column if not exists grace_days integer not null default 7;

alter table subscriptions add column if not exists grace_until timestamptz;

-- ==========================================================================
-- Qualifier l'état réel d'un abonnement
--
-- Une seule fonction, appelée par l'application ET par la tâche d'expiration :
-- les deux ne peuvent pas diverger. Renvoie :
--   'actif'   — période en cours, rien à signaler
--   'bientot' — moins de 7 jours restants, on prévient
--   'grace'   — période finie, délai de grâce en cours, on avertit fortement
--   'expire'  — délai de grâce dépassé, accès à restreindre
--   'aucun'   — pas d'abonnement du tout (ne devrait plus arriver)
-- ==========================================================================
create or replace function etat_abonnement(p_org uuid)
returns text
language plpgsql stable security definer set search_path = public as $$
declare
  v_sub record;
  v_grace int;
  v_fin timestamptz;
begin
  select * into v_sub from subscriptions
   where organization_id = p_org and status <> 'canceled'
   order by created_at desc limit 1;

  if not found then
    return 'aucun';
  end if;

  select grace_days into v_grace from platform_settings where id = true;
  v_grace := coalesce(v_grace, 7);
  v_fin := coalesce(v_sub.trial_end, v_sub.current_period_end);

  if v_fin is null then
    return 'actif';
  end if;

  if now() <= v_fin then
    if v_fin - now() < interval '7 days' then
      return 'bientot';
    end if;
    return 'actif';
  end if;

  if now() <= v_fin + (v_grace || ' days')::interval then
    return 'grace';
  end if;

  return 'expire';
end;
$$;

-- ==========================================================================
-- Rattrapage : toute auto-école active sans abonnement en reçoit un
--
-- Sans ça, les écoles créées avant la logique d'essai restent invisibles au
-- système de facturation, donc gratuites à vie.
-- ==========================================================================
insert into subscriptions (organization_id, plan_id, status, trial_start, trial_end, current_period_start, current_period_end)
select o.id,
       (select id from plans where code = 'free' limit 1),
       'trialing',
       now(),
       now() + ((select coalesce(trial_days, 90) from platform_settings where id = true) || ' days')::interval,
       now(),
       now() + ((select coalesce(trial_days, 90) from platform_settings where id = true) || ' days')::interval
from organizations o
where o.status = 'active'
  and not exists (select 1 from subscriptions s where s.organization_id = o.id)
  and exists (select 1 from plans where code = 'free');

-- ==========================================================================
-- Bascule automatique des statuts
--
-- Appelée par la tâche planifiée (pg_cron ou appel externe). Idempotente :
-- la relancer deux fois ne change rien de plus.
-- ==========================================================================
create or replace function expirer_abonnements()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_touches int := 0;
begin
  -- Période finie : on passe en past_due et on ouvre le délai de grâce.
  with maj as (
    update subscriptions s
       set status = 'past_due',
           grace_until = coalesce(s.trial_end, s.current_period_end)
                         + ((select coalesce(grace_days, 7) from platform_settings where id = true) || ' days')::interval,
           updated_at = now()
     where s.status in ('trialing', 'active')
       and coalesce(s.trial_end, s.current_period_end) < now()
    returning 1
  )
  select count(*) into v_touches from maj;

  return v_touches;
end;
$$;

revoke all on function expirer_abonnements() from public;
