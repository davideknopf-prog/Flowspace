-- Kuleo schema. Mirrors src/lib/types.ts exactly.
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

-- Teacher subscription (Stripe Billing). Status mirrors Stripe's subscription
-- status string. Dashboard access requires 'active' or 'trialing'.
alter table teachers add column if not exists stripe_customer_id text unique;
alter table teachers add column if not exists subscription_status text not null default 'none';
alter table teachers add column if not exists subscription_plan text not null default '';
alter table teachers add column if not exists subscription_period_end timestamptz;

-- The teacher's reusable "virtual studio room" (Zoom/Meet). Online sessions
-- without their own meeting link fall back to this at booking time.
alter table teachers add column if not exists default_meeting_url text not null default '';

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
  created_at timestamptz not null default now(),
  stripe_checkout_session_id text unique,
  platform_fee_cents integer not null default 0,
  stripe_fee_cents integer not null default 0
);

alter table bookings add column if not exists stripe_checkout_session_id text unique;
alter table bookings add column if not exists platform_fee_cents integer not null default 0;
alter table bookings add column if not exists stripe_fee_cents integer not null default 0;

create index if not exists bookings_teacher_id_idx on bookings(teacher_id);

-- Manual record of a payout the founder sent a teacher (bank transfer, Venmo,
-- Stripe Payout, whatever). No automation yet — see repo.ts / scripts/payout.mjs.
create table if not exists payouts (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  amount_cents integer not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payouts_teacher_id_idx on payouts(teacher_id);

-- Offers: multi-class products a teacher sells (5-class pass, 10-class pass,
-- unlimited month, ...). credit_count null = unlimited within valid_days.
create table if not exists offers (
  id text primary key,
  teacher_id text not null references teachers(id) on delete cascade,
  name text not null,
  description text not null default '',
  price_cents integer not null,
  credit_count integer,
  valid_days integer,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists offers_teacher_id_idx on offers(teacher_id);

-- Passes: a student's purchased offer. Credits are consumed by bookings.
-- payment_status: 'pending' until Stripe confirms, then 'paid'.
create table if not exists passes (
  id text primary key,
  offer_id text not null references offers(id),
  teacher_id text not null references teachers(id) on delete cascade,
  client_name text not null,
  client_email text not null,
  credits_total integer,
  credits_used integer not null default 0,
  price_cents integer not null,
  platform_fee_cents integer not null default 0,
  stripe_fee_cents integer not null default 0,
  payment_status text not null default 'pending',
  stripe_checkout_session_id text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists passes_teacher_id_idx on passes(teacher_id);
create index if not exists passes_client_email_idx on passes(client_email);

-- Bookings paid by redeeming a pass credit reference the pass.
alter table bookings add column if not exists pass_id text references passes(id);
