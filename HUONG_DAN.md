# Hướng dẫn vận hành — phd-literature-paper-3

> Tài liệu để bạn (hoặc phiên Claude Code sau) tự chỉnh sửa và deploy lại các sản phẩm.
> Repo: https://github.com/hoangthongac/phd-literature-paper-3 · Chủ: Hoàng Trung Thông (NCS HUTECH).

## 1. Tổng quan — repo chứa 4 sản phẩm

| Thư mục | Sản phẩm | Live |
|---------|----------|------|
| [`website/`](website/) | Website cá nhân học thuật (HTML tĩnh) | https://website-hoangthongacs-projects.vercel.app |
| [`dashboard/`](dashboard/) | Dashboard Next.js đọc Supabase | https://dashboard-hoangthongacs-projects.vercel.app |
| [`demo/`](demo/) | Landing giới thiệu Paper 3 + QR (HTML tĩnh) | https://demo-hoangthongacs-projects.vercel.app |
| [`pipeline/`](pipeline/) + [`.github/workflows/`](.github/workflows/) | Crawl 6 nguồn → DeepSeek chấm điểm → Supabase | chạy cron / thủ công |

Phong cách thiết kế cả 3 trang: **hệ NVIDIA** (spec ở [`DESIGN.md`](DESIGN.md)) — xanh `#76b900`, nền đen hero/footer, thân trắng, góc 2px, corner-square xanh.

## 2. Chuẩn bị mỗi phiên làm việc

```powershell
cd "C:\D\OneDrive\HOC TAP\NGHIEN CUU SINH\phd-literature-paper-3"
```

- Bí mật nằm ở `.env.local` (KHÔNG commit). Nếu mất, xem `.env.example` để biết cần key gì.
- 3 CLI đã cài + đăng nhập sẵn: `gh` (GitHub), `vercel`, `supabase`.

## 3. Sửa + deploy WEBSITE hoặc DEMO (HTML tĩnh)

Đây là 2 file HTML đơn: [`website/index.html`](website/index.html), [`demo/index.html`](demo/index.html).

```powershell
# 1. Sửa file HTML (mở bằng editor, xem thử bằng cách mở trực tiếp trong trình duyệt)

# 2. Deploy lại
cd website        # hoặc: cd demo
vercel deploy --prod --yes

# 3. Commit
cd ..
git add website/  ;  git commit -m "cập nhật website"  ;  git push
```

- Ảnh đại diện website: [`website/avatar.jpg`](website/avatar.jpg) (thay ảnh khác thì ghi đè file này).
- QR của demo tự sinh trỏ tới URL hiện tại — không cần chỉnh tay.

## 4. Sửa + deploy DASHBOARD (Next.js)

```powershell
cd dashboard
npm install            # lần đầu / sau khi đổi dependency
npm run dev            # xem thử ở http://localhost:3000
npm run build          # BẮT BUỘC chạy trước khi deploy để bắt lỗi
vercel deploy --prod --yes
```

- **Component chính:** [`dashboard/components/`](dashboard/components/) — `Dashboard.tsx` (ghép mọi thứ), `FilterBar.tsx`, `StatsCards.tsx`, `Charts.tsx` (biểu đồ), `PaperCard.tsx`.
- **Màu/theme:** [`dashboard/tailwind.config.ts`](dashboard/tailwind.config.ts) (palette NVIDIA).
- **Kết nối Supabase:** [`dashboard/lib/supabase.ts`](dashboard/lib/supabase.ts) — chỉ dùng `anon` key (an toàn cho frontend).
- ⚠️ **Bẫy Vercel:** biến `NEXT_PUBLIC_*` phải được set TRÊN Vercel trước khi build. Đã set sẵn; nếu tạo project mới phải chạy `vercel env add NEXT_PUBLIC_SUPABASE_URL production` (và `..._ANON_KEY`) cho cả production/preview/development.

## 5. Pipeline crawl + chấm điểm (Buổi 2)

Chạy local (nạp env từ `.env.local` trước):

```bash
# Bash (git-bash). PYTHONUTF8=1 để in tiếng Việt không lỗi trên Windows.
export PYTHONUTF8=1
set -a; source <(grep -v '^#' .env.local | grep '=' | sed 's/\r$//'); set +a

python -m pipeline.crawl --out data/crawl_latest.json          # crawl 6 nguồn API
python -m pipeline.score --in data/crawl_latest.json --out data/scored_latest.json
python -m pipeline.push_to_supabase --in data/scored_latest.json
```

- **Query tìm kiếm** (12-term Block A×B×C): [`pipeline/config.py`](pipeline/config.py).
- **Tiêu chí chấm điểm** (IC/EC + Gap G1–G5): sửa `SYSTEM_PROMPT` trong [`pipeline/score.py`](pipeline/score.py).
- **Chấm điểm lại toàn bộ bài chưa có điểm** (song song, an toàn chạy lại):
  ```
  python -m pipeline.backfill_scores --workers 8
  ```
- **Import lại 950 bài gốc:** `python -m pipeline.import_raw --in <đường-dẫn>/all_sources_2026-07-08.json`

### Bật cron tự động (CHƯA làm — cần bạn thêm 5 secret)

```powershell
gh secret set SCOPUS_API_KEY --body "<key>"
gh secret set SEMANTIC_SCHOLAR_API_KEY --body "<key>"
gh secret set SPRINGER_API_KEY --body "<key>"
gh secret set CORE_API_KEY --body "<key>"
gh secret set CROSSREF_MAILTO --body "thong2542833002@hutech.edu.vn"
```
(giá trị các key có trong `.env.local`). Sau đó vào GitHub → Actions → "Daily Crawl" → Run workflow để test. Lịch cron: 05:00 sáng giờ VN.

## 6. Cơ sở dữ liệu Supabase

- Project: `nreftkdiacgbofqospog` · Dashboard: https://supabase.com/dashboard/project/nreftkdiacgbofqospog
- Bảng chính `papers` (~1043 dòng) + `topics`, `notes`. Schema: [`db/schema.sql`](db/schema.sql) + [`db/02_prisma_extension.sql`](db/02_prisma_extension.sql).
- Nạp lại schema: chạy nội dung 2 file `.sql` trong Supabase → SQL Editor, hoặc qua `psql`/psycopg2.

## 7. Việc còn tồn

1. **Bật cron Buổi 2** — thêm 5 GitHub Secrets ở mục 5.
2. **⚠️ Bảo mật:** các key sau đã bị lộ công khai (chat) → nên tạo lại: DeepSeek API key, mật khẩu Supabase DB, 4 API key crawl (Scopus/Semantic/Springer/CORE). Sau khi rotate, cập nhật `.env.local` + GitHub Secrets tương ứng.

## 8. Đổi Deployment Protection (nếu trang bị chặn sau login Vercel)

Project Vercel mới mặc định bật bảo vệ → khách bị chuyển sang trang đăng nhập. Tắt: Vercel Dashboard → project → Settings → Deployment Protection → Vercel Authentication → **Disabled** → Save. (Cả 3 project hiện đã tắt.)
