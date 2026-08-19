-- Storage buckets for uploaded files (student documents, course assets).
-- Object path convention: {organization_id}/{owner_id}/{filename}
-- so RLS can enforce the same tenant isolation as the rest of the schema.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('course-assets', 'course-assets', true)
on conflict (id) do nothing;

create policy documents_bucket_insert on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (
      is_super_admin()
      or (split_part(name, '/', 1))::uuid = current_org_v()
    )
    and (
      is_org_admin() or is_super_admin()
      or (split_part(name, '/', 2))::uuid = auth.uid()
    )
  );

create policy documents_bucket_select on storage.objects for select
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      is_super_admin()
      or (split_part(name, '/', 1))::uuid = current_org_v()
    )
    and (
      is_org_admin() or is_super_admin()
      or (split_part(name, '/', 2))::uuid = auth.uid()
    )
  );

create policy documents_bucket_delete on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (
      is_super_admin()
      or ((split_part(name, '/', 1))::uuid = current_org_v() and (is_org_admin() or is_super_admin()))
    )
  );

-- Course assets (videos/PDFs referenced by lessons) are readable by anyone
-- (simplifies serving to enrolled students without signed URLs) but only
-- writable by org staff of the owning organization.
create policy course_assets_select on storage.objects for select
  to public
  using (bucket_id = 'course-assets');

create policy course_assets_write on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'course-assets'
    and (is_super_admin() or (split_part(name, '/', 1))::uuid = current_org_v())
    and (is_org_admin() or is_super_admin())
  );
