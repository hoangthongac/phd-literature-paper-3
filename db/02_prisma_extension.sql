-- ============================================================
-- Mở rộng bảng papers cho PRISMA Paper 3 (CP-family × RE forecasting)
-- Chạy SAU db/schema.sql. Idempotent (add column if not exists).
-- ============================================================

-- Trường bibliographic bổ sung
alter table papers add column if not exists doi           text;
alter table papers add column if not exists venue         text;   -- tạp chí / hội nghị
alter table papers add column if not exists year          int;
alter table papers add column if not exists document_type text;

-- Trường phân loại PRISMA (do DeepSeek chấm + map)
alter table papers add column if not exists gap_mapped     text;  -- G1..G5 | none
alter table papers add column if not exists energy_type    text;  -- Solar|Wind|Load|Price|Multi|NA
alter table papers add column if not exists uq_method      text;  -- CP|CQR|ACI|PINN+CP|...
alter table papers add column if not exists ic_ec_decision text;  -- INCLUDE|EC1..EC7|borderline
alter table papers add column if not exists ai_rationale   text;  -- lý do chấm điểm (VI)

-- Trường truy vết nguồn (nguồn nào tìm ra, xuất hiện mấy lần)
alter table papers add column if not exists sources_seen text[];  -- {wos, scopus, ...}
alter table papers add column if not exists occurrences  int default 1;
alter table papers add column if not exists dedupe_key   text;    -- doi:.. hoặc title-hash

-- DOI nên unique để chống trùng (bổ sung cho url unique sẵn có)
create unique index if not exists idx_papers_doi on papers (lower(doi)) where doi is not null and doi <> '';

-- Index cho lọc dashboard theo gap / loại năng lượng / năm
create index if not exists idx_papers_gap    on papers (gap_mapped);
create index if not exists idx_papers_etype  on papers (energy_type);
create index if not exists idx_papers_year   on papers (year desc);
create index if not exists idx_papers_icec   on papers (ic_ec_decision);

-- View: đếm paper theo gap (cho biểu đồ dashboard)
create or replace view papers_per_gap as
  select coalesce(nullif(gap_mapped,''),'chưa phân loại') as gap, count(*) as n
  from papers group by 1 order by n desc;

-- View: đếm theo loại năng lượng
create or replace view papers_per_energy as
  select coalesce(nullif(energy_type,''),'NA') as energy_type, count(*) as n
  from papers group by 1 order by n desc;
