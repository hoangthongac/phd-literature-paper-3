# CLAUDE.md — phd-literature-paper-3

> Dashboard theo dõi văn liệu + web demo cho đề tài NCS. Claude Code đọc file này mỗi phiên để giữ phong cách & quy tắc nhất quán.

## Bối cảnh dự án

- Chủ dự án: **Hoàng Trung Thông** — NCS HUTECH, ngành Kỹ thuật điện.
- Hướng nghiên cứu: **Deep Learning-based Renewable Energy Forecasting with Uncertainty Quantification** (dự báo năng lượng tái tạo + định lượng bất định).
- Đây là "Research Radar": tự kéo paper mới → AI chấm điểm + tóm tắt tiếng Việt → dashboard Next.js đọc Supabase.
- Chủ dự án **không phải lập trình viên** — mô tả yêu cầu bằng tiếng Việt. Giải thích ngắn gọn, plain language khi cần.
- Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase. Deploy trên Vercel. Crawl bằng Horizon (Python + GitHub Actions).

## Quy tắc code

- Ưu tiên **đơn giản, dễ đọc** (KISS). Không thêm tính năng chưa được yêu cầu (YAGNI).
- Mỗi lần chỉ sửa **một thành phần** rõ ràng, để dễ xem preview và quay lui nếu hỏng.
- Giữ file < 200 dòng; tách component khi dài.
- Component: PascalCase. Biến/hàm: camelCase. File tiện ích: kebab-case.
- Luôn có loading state và empty state cho phần đọc dữ liệu.

## An toàn & bí mật (QUAN TRỌNG)

- **Không bao giờ** đưa `service_role` key hay `DEEPSEEK_API_KEY` vào frontend. Frontend chỉ dùng `anon` key.
- API key model ngoài (DeepSeek) → gọi qua **route phía server** (Next.js Route Handler), không lộ ra client.
- Không commit `.env.local`. Mọi secret khai báo trong Vercel Environment Variables + GitHub Secrets.

## Dữ liệu & đạo đức học thuật

- Chỉ hiển thị **số liệu / kết quả có thật** từ nguồn dữ liệu. **Tuyệt đối không bịa số, không hardcode kết quả đẹp**.
- Phần "AI summary" ghi rõ do AI (DeepSeek) sinh, khuyến nghị đọc bản gốc.
- Ghi rõ nguồn dataset + license ở footer.

## Kết nối Supabase

- Project: `nreftkdiacgbofqospog` (https://nreftkdiacgbofqospog.supabase.co).
- Client đọc: `lib/supabase.ts` dùng `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Bảng chính: `papers`, `topics`, `notes` (schema đã nạp; xem `db/schema.sql`).
- RLS đã bật: đọc `papers`/`topics` công khai; `notes` chỉ chủ sở hữu.

## AI provider — DeepSeek (thay Gemini)

- OpenAI-compatible. `base_url = https://api.deepseek.com`, model `deepseek-chat`.
- Biến môi trường: `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, `DEEPSEEK_MODEL`.
- Dùng cho: chấm điểm liên quan (0–10) + tóm tắt tiếng Việt cho từng paper Horizon kéo về.

## Khi tôi báo lỗi

- Hỏi lại thông báo lỗi cụ thể nếu tôi mô tả mơ hồ.
- Sửa **nguyên nhân gốc**, không chắp vá. Nếu nghi ngờ, nêu giả định trước khi sửa.
