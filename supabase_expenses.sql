-- ==============================================================================
-- MIGRACIÓN SUPABASE: GASTOS DE FONDEO Y RENTABILIDAD (ROI & PAYOUTS)
-- ==============================================================================

-- 1. Tabla de Gastos de Fondeo (Evaluaciones, Resets, PA Fees, etc.)
create table if not exists public.prop_firm_expenses (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  fecha date not null default current_date,
  empresa text not null default 'Apex Trader Funding',
  tipo text not null default 'evaluacion', -- evaluacion, reset, activacion_pa, suscripcion, plataforma, otro
  cuenta_id text,
  cuenta_alias text,
  monto numeric not null default 0,
  notas text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabla de Cobros / Retiros Reales (Payouts)
create table if not exists public.prop_firm_payouts (
  id text primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  fecha date not null default current_date,
  empresa text not null default 'Apex Trader Funding',
  cuenta_id text,
  cuenta_alias text,
  monto numeric not null default 0,
  metodo text default 'Transferencia Bancaria',
  notas text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Activar RLS
alter table public.prop_firm_expenses enable row level security;
alter table public.prop_firm_payouts enable row level security;

-- Políticas de Seguridad: Los usuarios autenticados pueden ver todos los registros del equipo (para auditar)
create policy "Gastos visibles por usuarios autenticados"
  on public.prop_firm_expenses for select
  to authenticated
  using (true);

create policy "Retiros visibles por usuarios autenticados"
  on public.prop_firm_payouts for select
  to authenticated
  using (true);

-- Solo el dueño del registro puede insertar, actualizar o eliminar sus propios gastos y retiros
create policy "Usuarios gestionan sus propios gastos"
  on public.prop_firm_expenses for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Usuarios gestionan sus propios retiros"
  on public.prop_firm_payouts for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
