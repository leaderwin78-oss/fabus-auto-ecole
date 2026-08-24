-- Salle de cours en visioconférence intégrée, médias dans la communauté,
-- photo de couverture et fond d'écran personnalisable.

-- ==========================================================================
-- Cours en visioconférence
--
-- Jusqu'ici un cours "video_course" se contentait d'un lien Jitsi ouvert dans
-- un autre onglet : aucune trace de qui est venu, aucun contrôle, et l'élève
-- quittait l'application. La salle est désormais dans le produit, et la
-- présence est enregistrée — c'est ce qui distingue un cours d'un simple lien.
-- ==========================================================================
create table if not exists course_attendance (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  -- Une ligne par participant et par session : rejoindre deux fois après une
  -- coupure réseau ne doit pas créer deux présences concurrentes.
  unique (appointment_id, user_id)
);
create index if not exists course_attendance_appointment_idx on course_attendance(appointment_id);

alter table course_attendance enable row level security;

-- Chacun voit sa propre présence ; l'encadrement voit celle de son école.
create policy course_attendance_select on course_attendance for select
  using (user_id = auth.uid() or (same_org(organization_id) and (is_org_staff() or current_role_v() = 'instructor')) or is_super_admin());

-- On ne peut marquer QUE sa propre présence, et seulement à un rendez-vous
-- auquel on est réellement convié.
create policy course_attendance_insert on course_attendance for insert
  with check (
    user_id = auth.uid()
    and same_org(organization_id)
    and exists (
      select 1 from appointments a
      where a.id = appointment_id
        and a.organization_id = course_attendance.organization_id
        and (a.student_id = auth.uid() or a.instructor_id = auth.uid() or is_org_staff())
    )
  );

create policy course_attendance_update on course_attendance for update
  using (user_id = auth.uid());

-- ==========================================================================
-- Médias dans la communauté
--
-- Bucket privé plutôt que public : la communauté est réservée aux membres
-- depuis 0011, un bucket public rouvrirait la porte par une autre voie. Les
-- fichiers sont servis par URL signée, générée à l'affichage.
-- ==========================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-media', 'post-media', false, 52428800,
        array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table if not exists post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  path text not null,
  kind text not null check (kind in ('image', 'video')),
  mime_type text not null,
  size_bytes integer not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists post_media_post_idx on post_media(post_id);

alter table post_media enable row level security;

-- Visible dans les mêmes conditions que la publication qui le porte.
create policy post_media_select on post_media for select
  to authenticated
  using (
    exists (
      select 1 from posts p
      where p.id = post_media.post_id
        and (p.status = 'published' or p.author_id = auth.uid() or is_super_admin())
    )
  );

create policy post_media_insert on post_media for insert
  with check (author_id = auth.uid() and exists (select 1 from posts p where p.id = post_id and p.author_id = auth.uid()));

create policy post_media_delete on post_media for delete
  using (author_id = auth.uid() or is_super_admin());

-- Le fichier lui-même : on n'écrit que dans son propre dossier, et on ne lit
-- que si l'on est authentifié (la communauté est inter-auto-écoles).
drop policy if exists post_media_bucket_insert on storage.objects;
create policy post_media_bucket_insert on storage.objects for insert
  to authenticated
  with check (bucket_id = 'post-media' and (split_part(name, '/', 1))::uuid = auth.uid());

drop policy if exists post_media_bucket_select on storage.objects;
create policy post_media_bucket_select on storage.objects for select
  to authenticated
  using (bucket_id = 'post-media');

drop policy if exists post_media_bucket_delete on storage.objects;
create policy post_media_bucket_delete on storage.objects for delete
  to authenticated
  using (bucket_id = 'post-media' and ((split_part(name, '/', 1))::uuid = auth.uid() or is_super_admin()));

-- ==========================================================================
-- Photo de couverture et fond d'écran personnel
-- ==========================================================================
alter table profiles add column if not exists cover_url text;
-- Clé du fond choisi (voir FONDS dans components/PageBackground.tsx), ou null
-- pour garder celui de la plateforme. On stocke la clé, pas une URL : un fond
-- retiré du catalogue ne laisse pas une image morte derrière lui.
alter table profiles add column if not exists background_key text;

-- Les couvertures partagent le bucket public des avatars : ce sont des images
-- de profil, destinées à être vues.
drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (split_part(name, '/', 1))::uuid = auth.uid());
