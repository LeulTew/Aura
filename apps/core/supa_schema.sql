-- Supabase Schema for Aura Pro
-- Run this in the Supabase SQL Editor

-- Enable Vector extension (pgvector)
create extension if not exists vector;

-- Photos table
create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  embedding vector(512),
  photo_date date,
  created_at timestamptz default now(),
  metadata jsonb
);

-- HNSW Index for fast cosine similarity search (pgvector 0.7+)
create index if not exists photos_embedding_hnsw_idx 
  on public.photos 
  using hnsw (embedding vector_cosine_ops);

-- Search Function (RPC)
create or replace function match_faces (
  query_embedding vector(512),
  match_threshold float default 0.6,
  match_count int default 100
)
returns table (
  id uuid,
  path text,
  photo_date date,
  metadata jsonb,
  similarity double precision
)
language plpgsql
as $$
begin
  return query
  select
    photos.id,
    photos.path,
    photos.photo_date,
    photos.metadata,
    1 - (photos.embedding <=> query_embedding) as similarity
  from photos
  where 1 - (photos.embedding <=> query_embedding) > match_threshold
  order by photos.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Get stats function
create or replace function get_db_stats()
returns table (
  total_faces bigint,
  table_exists boolean
)
language plpgsql
as $$
begin
  return query
  select
    count(*)::bigint as total_faces,
    true as table_exists
  from photos;
end;
$$;
