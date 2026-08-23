-- Second passage d'audit (checklist « audit-securite-saas », contrôles 4 et 17).
--
-- Le test de la clé anon — interroger chaque table sans être connecté — a
-- révélé trois tables dont la policy SELECT est `using (true)`. C'est la
-- « policy fourre-tout » : le RLS est activé, donc tout semble en ordre dans
-- le tableau de bord, mais la condition ne filtre rien. Résultat identique à
-- une absence de RLS.

-- ==========================================================================
-- platform_settings — les taux de commission étaient publics
--
-- N'importe qui pouvait lire les conditions commerciales de la plateforme
-- (commission sur les cours, frais d'inscription, commission sur prestations,
-- durée d'essai) avec une simple requête HTTP, sans compte.
--
-- Restreint au super admin. computeCommission() lit désormais cette table avec
-- la clé service_role : sans ce changement, la lecture échouerait en silence et
-- le calcul retomberait sur les valeurs par défaut codées en dur — des
-- montants faux, sans erreur visible.
-- ==========================================================================
drop policy if exists platform_settings_select on platform_settings;
create policy platform_settings_select on platform_settings for select
  to authenticated
  using (is_super_admin());

-- ==========================================================================
-- Communauté — posts, commentaires et « j'aime » étaient lisibles sans compte
--
-- L'espace communautaire est volontairement inter-auto-écoles, mais il reste
-- réservé aux membres de la plateforme : il n'a jamais été prévu qu'un
-- visiteur anonyme puisse aspirer les publications, les commentaires et la
-- liste de qui aime quoi. `posts` filtrait au moins sur le statut publié ;
-- post_comments et post_likes ne filtraient rien du tout.
-- ==========================================================================
drop policy if exists posts_select on posts;
create policy posts_select on posts for select
  to authenticated
  using (status = 'published' or author_id = auth.uid() or is_super_admin());

drop policy if exists post_comments_select on post_comments;
create policy post_comments_select on post_comments for select
  to authenticated
  using (true);

drop policy if exists post_likes_select on post_likes;
create policy post_likes_select on post_likes for select
  to authenticated
  using (true);

-- ==========================================================================
-- Bornes de longueur (contrôle 14)
--
-- Un post de 10 000 caractères passait sans broncher. Rien d'exploitable au
-- sens strict, mais c'est la porte ouverte au remplissage de la base par un
-- compte gratuit. La contrainte vit en base pour couvrir aussi les écritures
-- qui ne passeraient pas par l'action serveur.
-- ==========================================================================
alter table posts drop constraint if exists posts_body_length;
alter table posts add constraint posts_body_length check (char_length(body) <= 5000);

alter table post_comments drop constraint if exists post_comments_body_length;
alter table post_comments add constraint post_comments_body_length check (char_length(body) <= 2000);

alter table messages drop constraint if exists messages_body_length;
alter table messages add constraint messages_body_length check (body is null or char_length(body) <= 5000);
