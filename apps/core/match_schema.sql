-- Phase 3: Matching & Row Level Security
-- Run this in your Supabase SQL Editor

-- 1. Junction Table to link Photos to Users
create table if not exists public.photo_matches (
  photo_id uuid references public.photos(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  similarity float,
  created_at timestamptz default now(),
  primary key (photo_id, user_id)
);

-- 2. Performance Index for RLS Lookups
-- This ensures that checking "Does this user have a match for this photo?" is nearly instant
create index if not exists idx_photo_matches_user_id on public.photo_matches(user_id);

-- 3. Enable RLS on Photos Table
alter table public.photos enable row level security;

-- 4. RLS Policy: Users can only see photos they are tagged in
-- This is the "Magic" policy that secures the guest experience
create policy "Users can only see photos they are tagged in"
on public.photos for select
using (
  exists (
    select 1 from public.photo_matches
    where photo_matches.photo_id = photos.id
    and photo_matches.user_id = auth.uid()
  )
);

-- 5. Helper Function to get match count for a user (Optional/UX)
create or replace function get_user_match_count(target_user_id uuid)
returns bigint
language sql
security definer
as $$
  select count(*) from public.photo_matches where user_id = target_user_id;
$$;
