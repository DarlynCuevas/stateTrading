-- ==============================================================================
-- CREDENCIALES TRADOVATE POR USUARIO (Protegido por RLS)
-- ==============================================================================

create table if not exists public.tradovate_credentials (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  username text not null,
  password text not null,
  app_id text default 'StateTrading',
  app_version text default '1.0',
  cid text, -- Customer ID opcional
  sec text, -- API Secret opcional
  is_live boolean default true, -- true = Live / Apex Fondeo, false = Demo
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.tradovate_credentials enable row level security;

-- Solo el dueño de las credenciales puede verlas o editarlas (máxima privacidad)
drop policy if exists "Cada usuario gestiona sus credenciales Tradovate" on public.tradovate_credentials;
create policy "Cada usuario gestiona sus credenciales Tradovate"
  on public.tradovate_credentials for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
