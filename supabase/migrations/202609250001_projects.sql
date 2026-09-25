-- Shared project documents for explicitly enrolled teammates.
create table public.factory_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 100)
);
create table public.factory_workspace_members (
  workspace_id uuid not null references public.factory_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (workspace_id, user_id)
);
alter table public.factory_workspaces enable row level security;
alter table public.factory_workspace_members enable row level security;
revoke all on public.factory_workspaces, public.factory_workspace_members from anon, authenticated;
grant select on public.factory_workspaces, public.factory_workspace_members to authenticated;
create policy members_read_self on public.factory_workspace_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy workspaces_read_member on public.factory_workspaces for select to authenticated
  using (exists (select 1 from public.factory_workspace_members m where m.workspace_id = id and m.user_id = (select auth.uid())));

create table public.factory_projects (
  workspace_id uuid not null references public.factory_workspaces(id) on delete cascade,
  id text not null check (id ~ '^[a-zA-Z0-9][a-zA-Z0-9-]{0,79}$'),
  document jsonb not null check (jsonb_typeof(document) = 'object' and document->>'id' = id),
  version bigint not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);
alter table public.factory_projects enable row level security;
revoke all on public.factory_projects from anon;
grant select, insert, update on public.factory_projects to authenticated;
create policy projects_read on public.factory_projects for select to authenticated
  using (exists (select 1 from public.factory_workspace_members m where m.workspace_id = factory_projects.workspace_id and m.user_id = (select auth.uid())));
create policy projects_insert on public.factory_projects for insert to authenticated
  with check (exists (select 1 from public.factory_workspace_members m where m.workspace_id = factory_projects.workspace_id and m.user_id = (select auth.uid())));
create policy projects_update on public.factory_projects for update to authenticated
  using (exists (select 1 from public.factory_workspace_members m where m.workspace_id = factory_projects.workspace_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.factory_workspace_members m where m.workspace_id = factory_projects.workspace_id and m.user_id = (select auth.uid())));

-- Compare-and-swap prevents stale tabs/devices from silently overwriting a save.
create function public.save_factory_project(target_workspace uuid, project_document jsonb, expected_version bigint)
returns setof public.factory_projects
language plpgsql security invoker set search_path = '' as $$
declare saved public.factory_projects;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if expected_version = 0 then
    insert into public.factory_projects(workspace_id, id, document)
    values (target_workspace, project_document->>'id', project_document)
    on conflict (workspace_id, id) do nothing returning * into saved;
  elsif expected_version > 0 then
    update public.factory_projects
      set document = project_document, version = version + 1, updated_at = now()
      where workspace_id = target_workspace and id = project_document->>'id' and version = expected_version
      returning * into saved;
  end if;
  -- A response may have been lost after a successful write. Accept an exact
  -- replay without increasing the version or overwriting a newer document.
  if saved.id is null then
    select * into saved from public.factory_projects
    where workspace_id = target_workspace and id = project_document->>'id'
      and document = project_document and version = expected_version + 1;
  end if;
  if saved.id is null then raise exception 'PROJECT_CONFLICT' using errcode = '40001'; end if;
  return next saved;
end;
$$;
revoke all on function public.save_factory_project(uuid, jsonb, bigint) from public, anon;
grant execute on function public.save_factory_project(uuid, jsonb, bigint) to authenticated;
