create table emails (
  id uuid primary key default gen_random_uuid(),
  from_email text,
  subject text,
  body text,
  created_at timestamp default now()
);


create table briefings (
  id uuid primary key default gen_random_uuid(),
  email_subject text,
  summary text,
  tasks jsonb,
  priority text,
  created_at timestamp default now()
);

-- This allows anyone with your Public Key to SEE the data (READ ONLY)
alter table briefings enable row level security;
create policy "Allow public read access" on briefings for select using (true);

alter table emails enable row level security;
create policy "Allow public read access" on emails for select using (true);

ALTER TABLE emails ADD COLUMN IF NOT EXISTS ai_reply text;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS reply_status text DEFAULT 'pending';

ALTER TABLE emails DISABLE ROW LEVEL SECURITY;
ALTER TABLE briefings DISABLE ROW LEVEL SECURITY