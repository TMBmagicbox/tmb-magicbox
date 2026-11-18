-- Visitas propias de tmbmagicbox.studio (sin IPs).
-- Proyecto: magicbox-crm (sykmmqnevygujsdsyynw). Aplicada como migración "create_page_views".
-- /assets/track.js inserta como anon; solo Diego (is_diego()) puede leer desde /admin/.

create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  page text not null,
  referrer_host text,
  source text not null default 'directo',
  device text not null default 'compu',
  country text,
  city text,
  lang text,
  session_id text not null,
  constraint page_views_page_shape check (char_length(page) between 1 and 120 and left(page, 1) = '/'),
  constraint page_views_referrer_len check (referrer_host is null or char_length(referrer_host) between 1 and 120),
  constraint page_views_source_value check (source in ('google','instagram','facebook','whatsapp','tiktok','directo','otro')),
  constraint page_views_device_value check (device in ('movil','tablet','compu')),
  constraint page_views_country_len check (country is null or char_length(country) between 1 and 60),
  constraint page_views_city_len check (city is null or char_length(city) between 1 and 80),
  constraint page_views_lang_len check (lang is null or char_length(lang) between 1 and 20),
  constraint page_views_session_len check (char_length(session_id) between 8 and 64)
);

comment on table public.page_views is
  'Visitas del sitio (track.js). Sin IPs. anon solo inserta; solo is_diego() lee.';

create index page_views_created_idx on public.page_views (created_at desc);
create index page_views_page_created_idx on public.page_views (page, created_at desc);

alter table public.page_views enable row level security;

revoke all on table public.page_views from public, anon, authenticated;

-- anon solo puede mandar estas columnas (created_at e id los pone la base).
grant insert (page, referrer_host, source, device, country, city, lang, session_id)
  on table public.page_views to anon;
grant select on table public.page_views to authenticated;

create policy page_views_anon_insert
  on public.page_views
  for insert
  to anon
  with check (
    char_length(page) <= 120
    and char_length(session_id) <= 64
    and coalesce(char_length(referrer_host), 0) <= 120
    and coalesce(char_length(city), 0) <= 80
  );

create policy page_views_diego_read
  on public.page_views
  for select
  to authenticated
  using ((select public.is_diego()));
