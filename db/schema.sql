-- Song and Scripture: licensing schema (Postgres / Neon)
-- Safe to run more than once.

create table if not exists churches (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_name  text,
  contact_email text,
  contact_phone text,
  town          text,
  country       text not null default 'KE',
  created_at    timestamptz not null default now()
);

create table if not exists licenses (
  id               uuid primary key default gen_random_uuid(),
  church_id        uuid not null references churches (id) on delete cascade,
  license_key      text not null unique,
  plan             text not null default 'standard',
  max_activations  integer not null default 1 check (max_activations > 0),
  status           text not null default 'active'
                   check (status in ('active', 'suspended', 'revoked', 'expired')),
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz,
  notes            text
);

create table if not exists activations (
  id            uuid primary key default gen_random_uuid(),
  license_id    uuid not null references licenses (id) on delete cascade,
  machine_id    text not null,
  machine_name  text,
  app_version   text,
  activated_at  timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  unique (license_id, machine_id)
);

create index if not exists licenses_church_id_idx on licenses (church_id);
create index if not exists activations_license_id_idx on activations (license_id);
