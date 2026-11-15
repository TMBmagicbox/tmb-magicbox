-- Reseñas de clientes para tmbmagicbox.studio
-- Proyecto: magicbox-crm (sykmmqnevygujsdsyynw)
--
-- NO está aplicada. Pegarla una sola vez en el SQL editor de ese proyecto.
-- La página /resena/ inserta como anon; el inicio solo lee status = approved;
-- el CRM (/admin/) aprueba o rechaza con la misma llave is_diego() que el resto.

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  business text not null,
  role text,
  rating smallint not null,
  body text not null,
  consent boolean not null,
  slug text,
  status text not null default 'pending',
  constraint reviews_name_len check (
    char_length(btrim(name)) between 2 and 80
    and char_length(name) <= 80
  ),
  constraint reviews_business_len check (
    char_length(btrim(business)) between 2 and 120
    and char_length(business) <= 120
  ),
  constraint reviews_role_len check (
    role is null
    or (
      char_length(btrim(role)) between 1 and 80
      and char_length(role) <= 80
    )
  ),
  constraint reviews_rating_range check (rating between 1 and 5),
  constraint reviews_body_len check (
    char_length(btrim(body)) between 20 and 800
    and char_length(body) <= 800
  ),
  constraint reviews_consent_true check (consent),
  constraint reviews_slug_shape check (
    slug is null
    or (
      char_length(slug) between 1 and 40
      and slug ~ '^[abcdefghijklmnopqrstuvwxyz0123456789]+(-[abcdefghijklmnopqrstuvwxyz0123456789]+)*$'
    )
  ),
  constraint reviews_status_value check (status in ('pending', 'approved', 'rejected'))
);

comment on table public.reviews is
  'Reseñas enviadas desde /resena/. Públicas solo cuando status = approved.';

create index reviews_status_created_idx
  on public.reviews (status, created_at desc);

alter table public.reviews enable row level security;

-- El default de Supabase da ALL a anon y authenticated al crear la tabla.
-- Aquí se recorta: anon solo inserta y lee; authenticated queda detrás de is_diego().
revoke all on table public.reviews from public, anon, authenticated;

grant select, insert on table public.reviews to anon;
grant select, insert, update, delete on table public.reviews to authenticated;

create policy reviews_anon_insert
  on public.reviews
  for insert
  to anon
  with check (
    status = 'pending'
    and consent is true
  );

create policy reviews_public_read
  on public.reviews
  for select
  to anon
  using (status = 'approved');

-- Misma puerta que contacts, activities, projects, settings y social_posts.
create policy diego_all
  on public.reviews
  for all
  to authenticated
  using ((select public.is_diego()))
  with check ((select public.is_diego()));
