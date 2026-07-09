"""Backfill điểm DeepSeek cho các paper CHƯA chấm trong Supabase.

- Resume-safe: chỉ lấy paper có ai_score IS NULL (chạy lại được nếu gián đoạn).
- Song song: nhiều luồng gọi DeepSeek cùng lúc (nhanh hơn tuần tự nhiều lần).
- Update theo id qua REST PATCH — không đụng dữ liệu bibliographic đã có.

  python -m pipeline.backfill_scores --limit 10      # test 10 bài
  python -m pipeline.backfill_scores                 # chấm hết bài chưa có điểm
  python -m pipeline.backfill_scores --workers 8     # chỉnh số luồng
"""
import os, sys, json, argparse, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

from .score import score_one, _clean

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _supabase_cfg():
    url = (os.environ.get("SUPABASE_URL")
           or os.environ["NEXT_PUBLIC_SUPABASE_URL"]).rstrip("/")
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
           or os.environ["SUPABASE_KEY"])
    return url, key


def fetch_unscored(url, key, limit=None):
    """Lấy các paper chưa có ai_score (phân trang REST)."""
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    cols = "id,title,authors,venue,year,doi,sources_seen"
    out, offset, page = [], 0, 1000
    while True:
        rng_end = offset + page - 1
        r = requests.get(
            f"{url}/rest/v1/papers",
            headers={**headers, "Range-Unit": "items", "Range": f"{offset}-{rng_end}"},
            params={"select": cols, "ai_score": "is.null", "order": "id.asc"},
            timeout=60,
        )
        if r.status_code not in (200, 206):
            print(f"[fetch] HTTP {r.status_code}: {r.text[:200]}"); break
        batch = r.json()
        out.extend(batch)
        if len(batch) < page:
            break
        offset += page
        if limit and len(out) >= limit:
            break
    return out[:limit] if limit else out


def patch_score(url, key, pid, scored):
    headers = {
        "apikey": key, "Authorization": f"Bearer {key}",
        "Content-Type": "application/json", "Prefer": "return=minimal",
    }
    body = {
        "ai_score": scored["ai_score"],
        "ai_summary_vi": scored["ai_summary_vi"],
        "ai_rationale": scored["ai_rationale"],
        "gap_mapped": scored["gap_mapped"],
        "energy_type": scored["energy_type"],
        "uq_method": scored["uq_method"],
        "ic_ec_decision": scored["ic_ec_decision"],
    }
    r = requests.patch(f"{url}/rest/v1/papers?id=eq.{pid}",
                       headers=headers, json=body, timeout=30)
    return r.status_code in (200, 204)


def score_and_patch(rec, sb_url, sb_key, ds_url, ds_model, ds_key, session):
    res = score_one(rec, session, ds_url, ds_model, ds_key)
    if not res:
        return rec["id"], False, None
    scored = _clean(res)
    ok = patch_score(sb_url, sb_key, rec["id"], scored)
    return rec["id"], ok, scored


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None, help="chỉ chấm N bài đầu (test)")
    ap.add_argument("--workers", type=int, default=6, help="số luồng gọi DeepSeek song song")
    args = ap.parse_args()

    sb_url, sb_key = _supabase_cfg()
    ds_url = os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    ds_model = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
    ds_key = os.environ["DEEPSEEK_API_KEY"]

    recs = fetch_unscored(sb_url, sb_key, limit=args.limit)
    print(f"=== {len(recs)} paper chưa có điểm — chấm với {args.workers} luồng ===")
    if not recs:
        print("Không còn bài nào cần chấm."); return

    session = requests.Session()
    done, ok, fail = 0, 0, 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(score_and_patch, r, sb_url, sb_key, ds_url, ds_model, ds_key, session): r
                for r in recs}
        for fut in as_completed(futs):
            pid, patched, scored = fut.result()
            done += 1
            if patched:
                ok += 1
                if done <= 5 or done % 25 == 0:
                    rate = done / max(1, time.time() - t0)
                    eta = (len(recs) - done) / max(rate, 0.01)
                    print(f"  [{done}/{len(recs)}] id={pid} "
                          f"score={scored['ai_score']} {scored['ic_ec_decision']}/{scored['gap_mapped']} "
                          f"| ~{eta:.0f}s còn lại")
            else:
                fail += 1
                print(f"  [{done}/{len(recs)}] id={pid} LỖI")
    print(f"=== Xong: {ok} OK, {fail} lỗi trong {time.time()-t0:.0f}s ===")
    if fail:
        print("Chạy lại lệnh này để chấm nốt các bài lỗi (resume-safe).")


if __name__ == "__main__":
    main()
