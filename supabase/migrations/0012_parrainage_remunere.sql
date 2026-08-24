-- Parrainage rémunéré : un élève qui fait inscrire un proche touche un
-- pourcentage de l'inscription payée.
--
-- La question à trancher n'est pas technique mais commerciale : ces 10 % se
-- prélèvent sur quoi ? Ils viennent de la part de l'auto-école, pas de la
-- commission de la plateforme. Sur une inscription de X francs :
--
--     plateforme   5 %  (frais d'inscription, inchangés)
--     parrain     10 %  (nouveau)
--     auto-école  85 %
--
-- C'est écrit ici parce que la répartition doit être lisible quelque part
-- ailleurs que dans une formule : une auto-école qui découvre après coup
-- qu'elle touche 85 % au lieu de 95 % a un motif légitime de litige.
-- Le taux est configurable par le super admin, comme les autres.

alter table platform_settings
  add column if not exists referral_commission_percent numeric(5,2) not null default 10;

-- Trace sur le paiement : combien est parti en parrainage, et vers qui.
alter table payments add column if not exists referral_amount_fcfa integer not null default 0;
alter table payments add column if not exists referrer_id uuid references profiles(id) on delete set null;

-- ==========================================================================
-- Gains de parrainage
--
-- Une ligne par commission acquise. Le montant est figé à l'encaissement :
-- si le super admin change le taux demain, les gains déjà acquis ne bougent
-- pas — comme pour les commissions de la plateforme.
-- ==========================================================================
create table if not exists referral_earnings (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referral_id uuid references referrals(id) on delete set null,
  invited_user_id uuid references profiles(id) on delete set null,
  payment_id uuid not null references payments(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  amount_fcfa integer not null check (amount_fcfa >= 0),
  rate_percent numeric(5,2) not null,
  base_amount_fcfa integer not null,
  status text not null default 'acquis' check (status in ('acquis', 'verse', 'annule')),
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  -- Un paiement ne peut générer qu'une seule commission de parrainage :
  -- sans cette contrainte, marquer deux fois « payé » créditerait deux fois.
  unique (payment_id)
);

create index if not exists referral_earnings_referrer_idx on referral_earnings(referrer_id);

alter table referral_earnings enable row level security;

-- Le parrain voit ses propres gains. L'auto-école concernée les voit aussi,
-- puisqu'ils sont déduits de sa part. Le super admin voit tout.
create policy referral_earnings_select on referral_earnings for select
  using (
    referrer_id = auth.uid()
    or is_super_admin()
    or (organization_id is not null and same_org(organization_id) and is_org_staff())
  );

-- Aucune policy d'écriture : ces lignes ne sont créées que par le serveur
-- au moment de l'encaissement, avec la clé service_role. Un élève ne peut pas
-- se créditer lui-même.
