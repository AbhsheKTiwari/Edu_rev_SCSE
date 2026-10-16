-- =====================================================================
-- 0004 PRIVATE STORAGE for evidence files
-- Path convention: evidence/<student uid>/<submission id>/<random>.<ext>
-- Students may only upload into their own folder. Nobody downloads
-- directly: the server checks permission, then creates a 60-second
-- signed URL with the service role.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'evidence', 'evidence', false, 10485760,
  array[
    'application/pdf', 'image/png', 'image/jpeg', 'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "evidence: students upload into own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.current_app_role() = 'student'
  );

create policy "evidence: students read own uploads"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- No update/delete policies: uploaded evidence cannot be overwritten or removed by users.
