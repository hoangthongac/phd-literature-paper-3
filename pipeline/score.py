"""Chấm điểm + tóm tắt paper bằng DeepSeek theo tiêu chí PRISMA Paper 3.

Mỗi record (title/authors/venue/year/doi) được gửi tới DeepSeek để:
  - ai_score      : 0-10 độ liên quan với Paper 3 (CP-family × RE forecasting × UQ)
  - ic_ec_decision: INCLUDE | EC1..EC7 | borderline
  - gap_mapped    : G1..G5 | none
  - energy_type   : Solar|Wind|Load|Price|Multi|NA
  - uq_method     : CP|CQR|ACI|PINN+CP|... (ngắn gọn)
  - ai_summary_vi : tóm tắt tiếng Việt 2-3 câu
  - ai_rationale  : lý do chấm điểm (tiếng Việt, 1 câu)

DeepSeek dùng OpenAI-compatible API + JSON mode. Gọi tuần tự, có retry.
"""
import os, sys, json, time
import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

# --- Tiêu chí PRISMA nhúng vào system prompt (rút gọn từ 03_Screening_Criteria) ---
SYSTEM_PROMPT = """Bạn là trợ lý sàng lọc tài liệu cho một bài tổng quan hệ thống (PRISMA) tên "Paper 3".

CHỦ ĐỀ PAPER 3: Conformal Prediction (CP) và họ phương pháp CP áp dụng cho DỰ BÁO NĂNG LƯỢNG TÁI TẠO có định lượng bất định.

TIÊU CHÍ CHỌN (Inclusion — INCLUDE nếu thỏa CẢ 3):
- IC1: Dùng phương pháp họ CP (Conformal Prediction, CQR, Adaptive Conformal/ACI, Conformal PID, Split/Weighted/Online Conformal, distribution-free prediction interval).
- IC2: Áp dụng cho dự báo năng lượng tái tạo (solar/PV, wind power, electricity load/demand, electricity price, power/energy forecasting).
- IC3: Xuất bản 2017-2026.

TIÊU CHÍ LOẠI (Exclusion):
- EC1: Không phải tiếng Anh / không truy cập được.
- EC2: Dùng CP nhưng KHÔNG phải miền năng lượng (y tế, tài chính, robotics...).
- EC3: Miền năng lượng nhưng KHÔNG dùng CP-family (ví dụ ANFIS-MPPT, LUBE thuần, Bayesian thuần, quantile regression không conformal).
- EC4: CP lý thuyết thuần, không áp dụng dự báo thực tế.
- EC5: Trùng lặp.
- EC6: Chỉ là abstract/poster/không đủ nội dung.
- EC7: Ngoài khung thời gian.
Nếu không chắc chắn giữa INCLUDE và một EC → dùng "borderline".

BẢN ĐỒ GAP (gap_mapped):
- G1: ACI + PINN (physics-informed) cho RE — đặc biệt nhiệt đới. (gap cốt lõi, gần như trống)
- G2: Benchmark probabilistic cho vùng nhiệt đới / Việt Nam / Đông Nam Á.
- G3: Phân tách bất định aleatoric/epistemic cho Solar PV.
- G4: PINN + Conformal/ACI cho Solar PV.
- G5: CP + Transformer/KAN + tính giải thích.
- none: không khớp gap nào ở trên.

Chỉ dựa trên metadata được cung cấp (title, venue, authors, year). Nếu metadata không đủ để chắc chắn, hạ điểm và nêu rõ trong rationale. TUYỆT ĐỐI KHÔNG bịa thông tin ngoài metadata.

Trả về DUY NHẤT một object JSON với các khóa:
ai_score (số 0-10), ic_ec_decision (INCLUDE|EC1|EC2|EC3|EC4|EC5|EC6|EC7|borderline), gap_mapped (G1|G2|G3|G4|G5|none), energy_type (Solar|Wind|Load|Price|Multi|NA), uq_method (chuỗi ngắn), ai_summary_vi (2-3 câu tiếng Việt), ai_rationale (1 câu tiếng Việt)."""


def _user_prompt(rec):
    return (
        f"Title: {rec.get('title','')}\n"
        f"Authors: {rec.get('authors','') or '(không rõ)'}\n"
        f"Venue: {rec.get('venue','') or '(không rõ)'}\n"
        f"Year: {rec.get('year','') or '(không rõ)'}\n"
        f"DOI: {rec.get('doi','') or '(không rõ)'}\n"
        f"Nguồn tìm thấy: {', '.join(rec.get('sources_seen', []))}"
    )


def score_one(rec, session, base_url, model, key):
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _user_prompt(rec)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
        "max_tokens": 500,
    }
    for attempt in range(4):
        try:
            r = session.post(f"{base_url}/chat/completions",
                             headers={"Authorization": f"Bearer {key}",
                                      "Content-Type": "application/json"},
                             json=body, timeout=60)
            if r.status_code == 200:
                content = r.json()["choices"][0]["message"]["content"]
                return json.loads(content)
            elif r.status_code in (429, 503):
                time.sleep(4 * (attempt + 1)); continue
            else:
                print(f"  [score] HTTP {r.status_code}: {r.text[:120]}"); return None
        except Exception as e:
            print(f"  [score] ERR {e} (retry {attempt})"); time.sleep(3)
    return None


def _clean(v):
    """Ép kết quả DeepSeek về đúng miền giá trị + fallback an toàn."""
    try:
        v["ai_score"] = max(0.0, min(10.0, float(v.get("ai_score", 0))))
    except Exception:
        v["ai_score"] = 0.0
    if v.get("ic_ec_decision") not in {
        "INCLUDE", "EC1", "EC2", "EC3", "EC4", "EC5", "EC6", "EC7", "borderline"}:
        v["ic_ec_decision"] = "borderline"
    if v.get("gap_mapped") not in {"G1", "G2", "G3", "G4", "G5", "none"}:
        v["gap_mapped"] = "none"
    if v.get("energy_type") not in {"Solar", "Wind", "Load", "Price", "Multi", "NA"}:
        v["energy_type"] = "NA"
    v["uq_method"] = str(v.get("uq_method", ""))[:120]
    v["ai_summary_vi"] = str(v.get("ai_summary_vi", ""))[:1000]
    v["ai_rationale"] = str(v.get("ai_rationale", ""))[:500]
    return v


def score_records(records, limit=None):
    key = os.environ["DEEPSEEK_API_KEY"]
    base_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    session = requests.Session()

    recs = records[:limit] if limit else records
    print(f"=== DeepSeek chấm {len(recs)} paper (model={model}) ===")
    scored = 0
    for i, rec in enumerate(recs, 1):
        res = score_one(rec, session, base_url, model, key)
        if res:
            rec.update(_clean(res))
            scored += 1
            if i <= 5 or i % 20 == 0:
                print(f"  [{i}/{len(recs)}] score={rec['ai_score']} "
                      f"{rec['ic_ec_decision']}/{rec['gap_mapped']} — {rec['title'][:50]}")
        else:
            rec.update({"ai_score": 0.0, "ic_ec_decision": "borderline",
                        "gap_mapped": "none", "energy_type": "NA", "uq_method": "",
                        "ai_summary_vi": "", "ai_rationale": "Không chấm được (lỗi API)."})
        time.sleep(0.5)
    print(f"=== Đã chấm {scored}/{len(recs)} ===")
    return recs


def main():
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="data/crawl_latest.json")
    ap.add_argument("--out", default="data/scored_latest.json")
    ap.add_argument("--limit", type=int, default=None, help="chỉ chấm N bài đầu (test)")
    args = ap.parse_args()

    data = json.load(open(args.inp, encoding="utf-8"))
    records = data["records"] if "records" in data else data
    scored = score_records(records, limit=args.limit)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump({"records": scored}, f, ensure_ascii=False, indent=1)
    print(f"Saved: {args.out}")


if __name__ == "__main__":
    main()
