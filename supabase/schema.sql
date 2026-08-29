-- ============================================================
-- Vita - Supabase schema
-- Jalankan seluruh file ini di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- ============================================================

-- Perlu untuk gen_random_uuid()
create extension if not exists pgcrypto;

-- ============================================================
-- PROFILES (1 baris per user, id = auth.users.id)
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  diagnosis_date date,
  cd4_at_diagnosis numeric,
  faskes text,
  emergency_contact text,
  onboarding_completed boolean default false,
  pin_enabled boolean default false,
  pin_code text,
  notifications_enabled boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- MEDICINES
-- ============================================================
create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null default 'ARV',
  schedule_time text,
  meal_rule text,
  dose_amount numeric default 1,
  frequency_unit text default 'Hari',
  stock_remaining numeric default 0,
  stock_total numeric default 0,
  is_active boolean default true,
  notes text,
  end_date date,
  created_at timestamptz default now()
);

-- ============================================================
-- MEDICINE LOGS (riwayat minum obat)
-- ============================================================
create table if not exists medicine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  medicine_id uuid references medicines(id) on delete cascade not null,
  date date not null,
  scheduled_time text,
  taken_at_time text not null,
  status text not null,
  bottle_number int,
  created_at timestamptz default now()
);

-- ============================================================
-- STOCK HISTORY (riwayat botol obat)
-- ============================================================
create table if not exists stock_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  medicine_id uuid references medicines(id) on delete cascade not null,
  amount numeric not null,
  start_date date not null,
  end_date_calculated date not null
);

-- ============================================================
-- CONTROL VISITS (jadwal & riwayat kontrol)
-- ============================================================
create table if not exists control_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  visit_date date not null,
  faskes text,
  doctor text,
  notes text,
  is_completed boolean default false,
  completed_at timestamptz,
  cd4 numeric,
  viral_load text,
  blood_pressure_sys numeric,
  blood_pressure_dia numeric,
  weight numeric,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- ============================================================
-- TIMELINE ENTRIES (jurnal, gejala, obat, milestone, kontrol)
-- ============================================================
create table if not exists timeline_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  entry_date date not null,
  entry_type text not null,
  title text,
  description text,
  severity text,
  tags text[] default '{}',
  ref_visit_id uuid references control_visits(id) on delete cascade,
  ref_medicine_id uuid references medicines(id) on delete cascade,
  ref_stock_history_id uuid references stock_history(id) on delete cascade,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY - setiap user HANYA bisa akses datanya sendiri
-- ============================================================
alter table profiles enable row level security;
alter table medicines enable row level security;
alter table medicine_logs enable row level security;
alter table stock_history enable row level security;
alter table control_visits enable row level security;
alter table timeline_entries enable row level security;

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own medicines" on medicines;
create policy "own medicines" on medicines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own medicine_logs" on medicine_logs;
create policy "own medicine_logs" on medicine_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own stock_history" on stock_history;
create policy "own stock_history" on stock_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own control_visits" on control_visits;
create policy "own control_visits" on control_visits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own timeline_entries" on timeline_entries;
create policy "own timeline_entries" on timeline_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- Otomatis buat baris "profiles" begitu user baru mendaftar (sign up)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
