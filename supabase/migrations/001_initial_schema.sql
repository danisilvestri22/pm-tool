-- Companies (Oracle, Limetec, MoGo, etc.)
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- Tasks
create table tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  parent_task_id uuid references tasks(id) on delete cascade,
  name text not null,
  responsible text,
  status text not null default 'on_track' check (status in ('on_track', 'at_risk', 'completed')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  due_date date,
  followup_date date,
  waiting_on text,
  notes text,
  board_column text not null default 'todo' check (board_column in ('todo', 'in_progress', 'done')),
  deleted_at timestamptz,
  asana_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shared view links (per company or all-companies)
create table share_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(24), 'base64url'),
  company_id uuid references companies(id) on delete cascade,
  label text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Push notification subscriptions
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  unique(user_id, (subscription->>'endpoint'))
);

-- Trigger: update tasks.updated_at automatically
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- Indexes for common query patterns
create index on tasks (company_id);
create index on tasks (parent_task_id) where parent_task_id is not null;
create index on tasks (deleted_at) where deleted_at is not null;
create index on tasks (followup_date) where followup_date is not null;

-- Row Level Security
alter table companies enable row level security;
alter table tasks enable row level security;
alter table share_links enable row level security;
alter table push_subscriptions enable row level security;

-- Authenticated users (Dani, Mike) can do everything
create policy "authenticated full access" on companies
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on tasks
  for all to authenticated using (true) with check (true);

create policy "authenticated full access" on share_links
  for all to authenticated using (true) with check (true);

create policy "own push subscriptions" on push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Note: share page reads are handled server-side via the admin/service-role client,
-- which bypasses RLS securely. No anon policies are needed.
