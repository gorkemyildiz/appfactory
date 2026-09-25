-- Immutable PNG assets, separate from frequently synchronized project documents.
create table if not exists public.factory_design_assets (
  workspace_id uuid not null,
  project_id text not null,
  id uuid not null,
  job jsonb not null,
  png_base64 text not null check (length(png_base64) between 1 and 28000000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, id),
  foreign key (workspace_id, project_id) references public.factory_projects(workspace_id, id) on delete cascade,
  check (job->>'id' = id::text and job->>'projectId' = project_id and job->>'status' = 'succeeded')
);
alter table public.factory_design_assets enable row level security;
revoke all on public.factory_design_assets from anon, authenticated;
grant select, insert on public.factory_design_assets to authenticated;
create policy design_assets_read on public.factory_design_assets for select to authenticated
  using (exists (select 1 from public.factory_workspace_members m where m.workspace_id = factory_design_assets.workspace_id and m.user_id = (select auth.uid())));
create policy design_assets_insert on public.factory_design_assets for insert to authenticated
  with check (exists (select 1 from public.factory_workspace_members m where m.workspace_id = factory_design_assets.workspace_id and m.user_id = (select auth.uid())));
