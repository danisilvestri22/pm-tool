create table task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index on task_comments (task_id);
alter table task_comments enable row level security;
create policy "authenticated full access" on task_comments
  for all to authenticated using (true) with check (true);
