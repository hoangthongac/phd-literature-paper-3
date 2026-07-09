-- ============================================================
-- Schema Supabase cho Radar nghiên cứu (Buổi 2 & 3)
-- Chạy toàn bộ file này trong: Supabase → SQL Editor → New query → Run
-- Gồm 3 bảng: topics, papers, notes + full-text search + charts view + RLS
-- ============================================================

-- ------------------------------------------------------------
-- 1) BẢNG topics — chủ đề nghiên cứu của bạn
-- ------------------------------------------------------------
create table if not exists topics (
  id         bigint generated always as identity primary key,
  name       text not null,             -- vd "GNN cho drug discovery"
  keywords   text,                      -- từ khóa liên quan, cách nhau dấu phẩy
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2) BẢNG papers — mỗi paper/tin một dòng (Horizon đổ vào)
-- ------------------------------------------------------------
create table if not exists papers (
  id            bigint generated always as identity primary key,
  title         text not null,
  authors       text,
  abstract      text,
  url           text unique,            -- unique -> chống trùng khi upsert
  source        text,                   -- "arXiv cs.LG", "PubMed"...
  ai_score      numeric,                -- điểm 0-10 do Horizon chấm
  ai_summary_vi text,                   -- tóm tắt tiếng Việt (AI sinh)
  topic_id      bigint references topics(id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz default now()
);

create index if not exists idx_papers_published on papers (published_at desc);
create index if not exists idx_papers_score     on papers (ai_score desc);
create index if not exists idx_papers_source    on papers (source);

-- Full-text search trên title + abstract (cột sinh tự động + index GIN)
alter table papers
  add column if not exists fts tsvector
  generated always as (
    to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(abstract,''))
  ) stored;
create index if not exists idx_papers_fts on papers using gin (fts);

-- ------------------------------------------------------------
-- 3) BẢNG notes — ghi chú cá nhân (Buổi 3, cần đăng nhập)
-- ------------------------------------------------------------
create table if not exists notes (
  id         bigint generated always as identity primary key,
  paper_id   bigint references papers(id) on delete cascade,
  user_id    uuid default auth.uid(),   -- người tạo (Supabase Auth)
  content    text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_notes_user on notes (user_id);

-- ------------------------------------------------------------
-- 4) VIEW cho charts (Buổi 3)
-- ------------------------------------------------------------
create or replace view papers_per_week as
  select date_trunc('week', published_at) as week, count(*) as n
  from papers
  where published_at is not null
  group by 1 order by 1;

create or replace view papers_per_source as
  select source, count(*) as n
  from papers group by source order by n desc;

-- ============================================================
-- 5) ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
-- papers/topics: cho phép AI ĐỌC công khai (anon key ở frontend).
-- Việc GHI papers dùng service_role key (bỏ qua RLS) từ GitHub Actions.
-- notes: mỗi user chỉ thao tác ghi chú của chính mình.
-- ============================================================

alter table papers enable row level security;
alter table topics enable row level security;
alter table notes  enable row level security;

-- Đọc công khai
drop policy if exists "public read papers" on papers;
create policy "public read papers" on papers for select using (true);

drop policy if exists "public read topics" on topics;
create policy "public read topics" on topics for select using (true);

-- notes: chỉ chủ sở hữu
drop policy if exists "own notes select" on notes;
create policy "own notes select" on notes for select using (auth.uid() = user_id);

drop policy if exists "own notes insert" on notes;
create policy "own notes insert" on notes for insert with check (auth.uid() = user_id);

drop policy if exists "own notes update" on notes;
create policy "own notes update" on notes for update using (auth.uid() = user_id);

drop policy if exists "own notes delete" on notes;
create policy "own notes delete" on notes for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 6) Dữ liệu mẫu (tùy chọn — sửa theo đề tài của bạn rồi chạy)
-- ------------------------------------------------------------
insert into topics (name, keywords) values
  ('Chủ đề chính của tôi', 'từ khóa 1, từ khóa 2, từ khóa 3')
on conflict do nothing;
