-- Mi Despensa: esquema para Supabase (modo nube / compartido)
-- Ejecutar en Supabase > SQL Editor, o aplicar como migración.
-- No compartas la clave service_role. Mantén RLS habilitado.
--
-- Este archivo ya refleja el esquema que la app espera hoy:
--   * products incluye location, expiry_alert, expiry_days_before, in_shopping_cart, photo_url
--   * stock_movements incluye user_name
--   * existe la función toggle_shopping_cart (lista de compras)
--   * las funciones SECURITY DEFINER solo las puede ejecutar un usuario con sesión

create extension if not exists pgcrypto;

-- ==========================================
-- TABLAS
-- ==========================================

create table if not exists public.pantries (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi Despensa',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.pantry_members (
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  display_name text,
  joined_at timestamptz not null default now(),
  primary key (pantry_id,user_id)
);

alter table public.pantry_members add column if not exists display_name text;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  name text not null,
  brand text,
  format text,
  quantity numeric(12,3) not null default 0 check (quantity >= 0),
  unit text not null default 'unidades',
  min_quantity numeric(12,3) not null default 1 check (min_quantity >= 0),
  location text,
  expiry_date date,
  expiry_alert boolean not null default false,
  expiry_days_before integer not null default 3,
  in_shopping_cart boolean not null default false,
  photo_url text,
  batches jsonb default '[]'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Completar columnas si la tabla ya existía de una versión anterior
alter table public.products
  add column if not exists location text,
  add column if not exists expiry_alert boolean not null default false,
  add column if not exists expiry_days_before integer not null default 3,
  add column if not exists in_shopping_cart boolean not null default false,
  add column if not exists photo_url text;

create table if not exists public.product_barcodes (
  id uuid primary key default gen_random_uuid(),
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  barcode text not null,
  created_at timestamptz not null default now(),
  constraint product_barcodes_pantry_barcode_unique unique (pantry_id,barcode)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  user_name text,
  movement_type text not null check (movement_type in ('in','out','adjustment')),
  quantity numeric(12,3) not null check (quantity >= 0),
  delta numeric(12,3) not null,
  note text,
  created_at timestamptz not null default now()
);

alter table public.stock_movements add column if not exists user_name text;

create table if not exists public.pantry_invites (
  id uuid primary key default gen_random_uuid(),
  pantry_id uuid not null references public.pantries(id) on delete cascade,
  code_hash text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ==========================================
-- ÍNDICES
-- ==========================================

create index if not exists products_pantry_name_idx on public.products(pantry_id,name);
create index if not exists movements_pantry_created_idx on public.stock_movements(pantry_id,created_at desc);
create index if not exists barcodes_product_idx on public.product_barcodes(product_id);
create index if not exists pantries_owner_id_idx on public.pantries(owner_id);
create index if not exists pantry_members_user_id_idx on public.pantry_members(user_id);
create index if not exists stock_movements_product_id_idx on public.stock_movements(product_id);
create index if not exists stock_movements_user_id_idx on public.stock_movements(user_id);
create index if not exists pantry_invites_pantry_id_idx on public.pantry_invites(pantry_id);
create index if not exists products_created_by_idx on public.products(created_by);

-- ==========================================
-- FUNCIONES AUXILIARES
-- ==========================================

create or replace function public.is_pantry_member(p_pantry_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.pantry_members pm where pm.pantry_id=p_pantry_id and pm.user_id=auth.uid());
$$;

create or replace function public.is_pantry_owner(p_pantry_id uuid)
returns boolean language sql stable security definer set search_path=public
as $$
  select exists(select 1 from public.pantry_members pm where pm.pantry_id=p_pantry_id and pm.user_id=auth.uid() and pm.role='owner');
$$;

-- Nombre visible del usuario que está conectado (para mostrar "Compartida con ...")
create or replace function public.current_display_name()
returns text language sql stable security definer set search_path=public
as $$
  select coalesce(
    nullif(trim(u.raw_user_meta_data->>'name'),''),
    nullif(trim(u.raw_user_meta_data->>'full_name'),''),
    split_part(u.email,'@',1)
  )
  from auth.users u
  where u.id = auth.uid();
$$;

-- Guarda/actualiza mi nombre en la despensa
create or replace function public.sync_my_membership(p_pantry_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  update public.pantry_members
     set display_name = public.current_display_name()
   where pantry_id = p_pantry_id and user_id = auth.uid();
end;
$$;

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

alter table public.pantries enable row level security;
alter table public.pantry_members enable row level security;
alter table public.products enable row level security;
alter table public.product_barcodes enable row level security;
alter table public.stock_movements enable row level security;
alter table public.pantry_invites enable row level security;

drop policy if exists "members can read pantry" on public.pantries;
drop policy if exists "owners can read own pantry" on public.pantries;
drop policy if exists "read pantries for owner or member" on public.pantries;
create policy "read pantries for owner or member" on public.pantries for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_pantry_member(id));

drop policy if exists "authenticated users can create pantry" on public.pantries;
create policy "authenticated users can create pantry" on public.pantries for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "owners can update pantry" on public.pantries;
create policy "owners can update pantry" on public.pantries for update to authenticated
  using (public.is_pantry_owner(id)) with check (public.is_pantry_owner(id));

drop policy if exists "members can read membership" on public.pantry_members;
create policy "members can read membership" on public.pantry_members for select
  using (user_id = (select auth.uid()) or public.is_pantry_member(pantry_id));

drop policy if exists "users can join pantry via secure function" on public.pantry_members;
create policy "users can join pantry via secure function" on public.pantry_members for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "owners can remove members" on public.pantry_members;
create policy "owners can remove members" on public.pantry_members for delete to authenticated
  using (public.is_pantry_owner(pantry_id));

drop policy if exists "members manage products" on public.products;
create policy "members manage products" on public.products for all to authenticated
  using (public.is_pantry_member(pantry_id)) with check (public.is_pantry_member(pantry_id));

drop policy if exists "members manage barcodes" on public.product_barcodes;
create policy "members manage barcodes" on public.product_barcodes for all to authenticated
  using (public.is_pantry_member(pantry_id)) with check (public.is_pantry_member(pantry_id));

drop policy if exists "members read movements" on public.stock_movements;
create policy "members read movements" on public.stock_movements for select to authenticated
  using (public.is_pantry_member(pantry_id));

drop policy if exists "members insert movements" on public.stock_movements;
create policy "members insert movements" on public.stock_movements for insert to authenticated
  with check (public.is_pantry_member(pantry_id) and user_id = (select auth.uid()));

drop policy if exists "owners can read invites" on public.pantry_invites;
create policy "owners can read invites" on public.pantry_invites for select to authenticated
  using (public.is_pantry_owner(pantry_id));

-- ==========================================
-- FUNCIONES DE NEGOCIO
-- ==========================================

create or replace function public.apply_stock_movement(
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_note text default null
) returns numeric
language plpgsql security definer set search_path=public
as $$
declare
  v_product public.products%rowtype;
  v_delta numeric;
  v_new_quantity numeric;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  if p_quantity < 0 or (p_movement_type <> 'adjustment' and p_quantity = 0) then raise exception 'Cantidad no válida.'; end if;
  if p_movement_type not in ('in','out','adjustment') then raise exception 'Tipo de movimiento no válido.'; end if;

  select * into v_product from public.products where id=p_product_id for update;
  if not found then raise exception 'Producto no encontrado.'; end if;
  if not public.is_pantry_member(v_product.pantry_id) then raise exception 'No eres miembro de esta despensa.'; end if;

  if p_movement_type='in' then v_delta:=p_quantity;
  elsif p_movement_type='out' then v_delta:=-p_quantity;
  else v_delta:=p_quantity-v_product.quantity;
  end if;

  v_new_quantity:=v_product.quantity+v_delta;
  if v_new_quantity < 0 then raise exception 'No hay suficiente stock para descontar esa cantidad.'; end if;

  update public.products set quantity=v_new_quantity,updated_at=now() where id=p_product_id;
  insert into public.stock_movements(pantry_id,product_id,user_id,user_name,movement_type,quantity,delta,note)
  values(v_product.pantry_id,p_product_id,auth.uid(),public.current_display_name(),p_movement_type,p_quantity,v_delta,p_note);
  return v_new_quantity;
end;
$$;

create or replace function public.toggle_shopping_cart(p_product_id uuid)
returns boolean language plpgsql security definer set search_path=public
as $$
declare
  v_product public.products%rowtype;
  v_flag boolean;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_product from public.products where id=p_product_id for update;
  if not found then raise exception 'Producto no encontrado.'; end if;
  if not public.is_pantry_member(v_product.pantry_id) then raise exception 'No eres miembro de esta despensa.'; end if;
  update public.products set in_shopping_cart = not coalesce(in_shopping_cart,false), updated_at=now()
    where id=p_product_id returning in_shopping_cart into v_flag;
  return v_flag;
end;
$$;

create or replace function public.create_pantry_invite(p_pantry_id uuid)
returns text language plpgsql security definer set search_path=public
as $$
declare
  v_code text;
  v_hash text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempts int := 0;
begin
  if not public.is_pantry_owner(p_pantry_id) then raise exception 'Solo el propietario puede invitar.'; end if;

  -- Un solo código vigente por despensa: borramos los no usados anteriores
  delete from public.pantry_invites where pantry_id = p_pantry_id and accepted_at is null;

  loop
    v_attempts := v_attempts + 1;
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random()*length(v_alphabet))::int, 1);
    end loop;
    v_hash := encode(digest(v_code,'sha256'),'hex');
    exit when not exists (select 1 from public.pantry_invites where code_hash = v_hash);
    if v_attempts > 20 then raise exception 'No se pudo generar el código, intenta de nuevo.'; end if;
  end loop;

  insert into public.pantry_invites(pantry_id,code_hash,created_by) values(p_pantry_id,v_hash,auth.uid());
  return v_code;
end;
$$;

create or replace function public.accept_pantry_invite(p_code text)
returns uuid language plpgsql security definer set search_path=public
as $$
declare v_invite public.pantry_invites%rowtype;
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_invite from public.pantry_invites
  where code_hash=encode(digest(p_code,'sha256'),'hex')
    and accepted_at is null and expires_at>now()
  for update;
  if not found then raise exception 'Invitación inválida, vencida o ya utilizada.'; end if;
  insert into public.pantry_members(pantry_id,user_id,role,display_name)
  values(v_invite.pantry_id,auth.uid(),'member',public.current_display_name())
  on conflict(pantry_id,user_id) do update set display_name = public.current_display_name();
  update public.pantry_invites set accepted_by=auth.uid(),accepted_at=now() where id=v_invite.id;
  return v_invite.pantry_id;
end;
$$;

-- Solo usuarios con sesión pueden ejecutar las funciones (nada de acceso anónimo)
revoke all on function public.is_pantry_member(uuid) from public;
revoke all on function public.is_pantry_owner(uuid) from public;
revoke all on function public.current_display_name() from public;
revoke all on function public.sync_my_membership(uuid) from public;
revoke all on function public.apply_stock_movement(uuid,text,numeric,text) from public;
revoke all on function public.toggle_shopping_cart(uuid) from public;
revoke all on function public.create_pantry_invite(uuid) from public;
revoke all on function public.accept_pantry_invite(text) from public;

revoke execute on function public.is_pantry_member(uuid) from anon;
revoke execute on function public.is_pantry_owner(uuid) from anon;
revoke execute on function public.current_display_name() from anon;
revoke execute on function public.sync_my_membership(uuid) from anon;
revoke execute on function public.apply_stock_movement(uuid,text,numeric,text) from anon;
revoke execute on function public.toggle_shopping_cart(uuid) from anon;
revoke execute on function public.create_pantry_invite(uuid) from anon;
revoke execute on function public.accept_pantry_invite(text) from anon;

grant execute on function public.is_pantry_member(uuid) to authenticated;
grant execute on function public.is_pantry_owner(uuid) to authenticated;
grant execute on function public.current_display_name() to authenticated;
grant execute on function public.sync_my_membership(uuid) to authenticated;
grant execute on function public.apply_stock_movement(uuid,text,numeric,text) to authenticated;
grant execute on function public.toggle_shopping_cart(uuid) to authenticated;
grant execute on function public.create_pantry_invite(uuid) to authenticated;
grant execute on function public.accept_pantry_invite(text) to authenticated;

-- ==========================================
-- REALTIME (para que los cambios se vean al instante en el otro teléfono)
-- ==========================================

alter table public.products replica identity full;
alter table public.stock_movements replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.products;
exception when duplicate_object then null;
when others then
  if sqlstate <> '42710' then raise; end if;
end $$;
do $$ begin
  alter publication supabase_realtime add table public.stock_movements;
exception when duplicate_object then null;
when others then
  if sqlstate <> '42710' then raise; end if;
end $$;
