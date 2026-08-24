-- Troisième passage d'audit : deux tables restaient lisibles sans compte.
--
-- `plans` porte votre grille tarifaire SaaS — prix des formules Starter et Pro,
-- nombre de moniteurs et d'élèves inclus, quota de stockage. C'est ce que vous
-- facturez aux auto-écoles, et aucune page publique ne l'affiche : seules les
-- pages super admin la lisent. Elle n'a donc rien à faire en accès libre.
--
-- `resource_links` est la bibliothèque pédagogique constituée pour les
-- moniteurs. Vide aujourd'hui, donc la fuite était théorique — mais elle se
-- serait ouverte au premier lien ajouté.
--
-- Les deux passent en lecture authentifiée. Le jour où une page tarifs publique
-- verra le jour, il suffira de rouvrir `plans` en connaissance de cause.

drop policy if exists plans_select on plans;
create policy plans_select on plans for select
  to authenticated
  using (true);

drop policy if exists resource_links_select on resource_links;
create policy resource_links_select on resource_links for select
  to authenticated
  using (true);
