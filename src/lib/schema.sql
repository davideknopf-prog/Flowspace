-- Flowspace schema. Mirrors src/lib/types.ts exactly.
-- Run once via: npm run db:migrate

create table if not exists teachers (
  id text primary key,
  slug text unique not null,
  email text unique not null,
  name text not null,
  headline text not null default '',
  bio text not null default '',
  location text not null default '',
  specialties jsonb not null default '[]',
  avatar_url text not null default '',
  timezone text not null default 'America/New_York',
  created_at timestamptz not null default now(),
  clerk_user_id text unique
);

alter table teachers add column if not exists clerk_user_id text unique;

create table if not exists session_types (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes integer not null,
  price_cents integer not null default 0,
  active boolean not null default true,
  location_type text not null default 'online',
  meeting_url text not null default '',
  location_note text not null default ''
);

create index if not exists session_types_teacher_id_idx on session_types(teacher_id);

create table if not exists availability (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  weekday integer not null,
  start_minutes integer not null,
  end_minutes integer not null
);

create index if not exists availability_teacher_id_idx on availability(teacher_id);

create table if not exists bookings (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  session_type_id text not null references session_types(id),
  client_name text not null,
  client_email text not null,
  note text not null default '',
  start_iso timestamptz not null,
  duration_minutes integer not null,
  price_cents integer not null default 0,
  location_type text not null default 'online',
  meeting_url text not null default '',
  location_note text not null default '',
  payment_status text not null default 'stubbed',
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create index if not exists bookings_teacher_id_idx on bookings(teacher_id);
