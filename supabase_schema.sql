-- ==============================================================================
-- MIGRACIÓN SUPABASE: SISTEMA MULTI-USUARIO STATE TRADING
-- ==============================================================================

-- 1. Tabla de Perfiles Públicos (vinculada a auth.users de Supabase)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  nombre text not null,
  alias text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Poblar perfiles para cualquier usuario que ya se haya registrado antes del trigger
insert into public.profiles (id, nombre, alias, email)
select 
  id, 
  coalesce(raw_user_meta_data->>'nombre', split_part(email, '@', 1)), 
  split_part(email, '@', 1), 
  email
from auth.users
on conflict (id) do update set email = excluded.email;

-- Trigger para crear automáticamente el perfil al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nombre, alias, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    split_part(new.email, '@', 1),
    new.email
  )
  on conflict (id) do update
  set email = excluded.email;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Tabla de Cuentas de Trading (por cada usuario)
create table if not exists public.trading_accounts (
  id text primary key, -- ej: 'APEX6339420000008' o 'PAAPEX6339420000001'
  user_id uuid references public.profiles(id) on delete cascade not null,
  alias text not null, -- ej: 'Evaluación 25k (08)'
  broker text default 'Apex / Tradovate',
  tipo text default 'evaluacion', -- 'evaluacion', 'fondeada'
  tamano numeric default 50000,
  saldo_inicial numeric default 50000,
  saldo_actual numeric not null,
  pnl_dia numeric default 0,
  nivel_liquidacion numeric,
  distancia_drawdown numeric,
  drawdown_tipo text default 'trailing',
  drawdown_max numeric default 2500,
  activa boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabla de Operaciones (Trades)
create table if not exists public.trades (
  id text not null, -- ej: 'R1', 'R2', 'R3'
  account_id text references public.trading_accounts(id) on delete set null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  real boolean default true,
  symbol text not null, -- 'MGC', 'MNQ', etc.
  type text not null, -- 'COMPRA', 'VENTA'
  open_time timestamp with time zone not null,
  close_time timestamp with time zone,
  entry_price numeric,
  exit_price numeric,
  quantity numeric default 1,
  pnl numeric default 0,
  commission numeric default 0,
  net_pnl numeric default 0,
  sl numeric,
  tp numeric,
  valor_punto numeric default 1,
  riesgo_usd numeric,
  r_multiple numeric,
  resultado text, -- 'TP', 'SL', 'BE'
  sesion text, -- 'Asia', 'Londres', 'Apertura NY'
  setup text,
  auditor text,
  errores jsonb default '[]'::jsonb,
  aciertos jsonb default '[]'::jsonb,
  leccion text,
  captura text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (id, user_id)
);

-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS - Row Level Security)
-- Permite que TODOS los miembros vean las métricas de los demás (comunidad),
-- pero solo el dueño puede crear o modificar sus propias cuentas y operaciones.
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.trading_accounts enable row level security;
alter table public.trades enable row level security;

-- PROFILES:
drop policy if exists "Cualquiera autenticado puede ver perfiles" on public.profiles;
create policy "Cualquiera autenticado puede ver perfiles"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "Cada usuario actualiza su propio perfil" on public.profiles;
create policy "Cada usuario actualiza su propio perfil"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Cada usuario inserta su propio perfil" on public.profiles;
create policy "Cada usuario inserta su propio perfil"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- TRADING_ACCOUNTS:
create policy "Cualquiera autenticado puede ver las cuentas del equipo"
  on public.trading_accounts for select
  to authenticated
  using (true);

create policy "Solo el dueño puede insertar o actualizar sus cuentas"
  on public.trading_accounts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- TRADES:
create policy "Cualquiera autenticado puede auditar y ver los trades del equipo"
  on public.trades for select
  to authenticated
  using (true);

create policy "Solo el dueño puede insertar o modificar sus trades"
  on public.trades for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
