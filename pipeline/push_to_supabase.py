"""Đẩy record đã chấm điểm vào Supabase (bảng papers) qua REST upsert.

Upsert theo cột unique (doi ưu tiên, fallback url) với header
Prefer: resolution=merge-duplicates — thêm mới hoặc cập nhật, không nhân bản.

Env cần: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (hoặc SUPABASE_KEY).
"""
import os, sys, json, argparse
import requests

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _url_for(rec):
    """URL định danh: dùng url gốc, hoặc dựng từ doi (papers.url là unique)."""
    if rec.get("url"):
        return rec["url"]
    if rec.get("doi"):
        return f"https://doi.org/{rec['doi']}"
    # fallback: title-based (hiếm) — vẫn cần url unique
    return "urn:title:" + "".join((rec.get("title") or "").lower().split())[:80]


def _row(rec):
    """Map record pipeline -> hàng bảng papers."""
    yr = rec.get("year")
    published = f"{yr}-01-01T00:00:00Z" if isinstance(yr, int) and 1900 < yr < 2100 else None
    src = rec.get("sources_seen") or ([rec["source_db"]] if rec.get("source_db") else [])
    return {
        "title": (rec.get("title") or "").strip()[:1000],
        "authors": rec.get("authors") or None,
        "url": _url_for(rec),
        "doi": rec.get("doi") or None,
        "venue": rec.get("venue") or None,
        "year": yr if isinstance(yr, int) else None,
        "document_type": rec.get("document_type") or None,
        "source": ", ".join(src) if src else None,
        "sources_seen": src or None,
        "occurrences": rec.get("occurrences", 1),
        "dedupe_key": rec.get("dedupe_key") or None,
        "ai_score": rec.get("ai_score"),
        "ai_summary_vi": rec.get("ai_summary_vi") or None,
        "ai_rationale": rec.get("ai_rationale") or None,
        "gap_mapped": rec.get("gap_mapped") or None,
        "energy_type": rec.get("energy_type") or None,
        "uq_method": rec.get("uq_method") or None,
        "ic_ec_decision": rec.get("ic_ec_decision") or None,
        "published_at": published,
    }


def push(records, batch_size=50):
    url = (os.environ.get("SUPABASE_URL")
           or os.environ["NEXT_PUBLIC_SUPABASE_URL"]).rstrip("/")
    key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
           or os.environ["SUPABASE_KEY"])
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }
    endpoint = f"{url}/rest/v1/papers?on_conflict=url"

    rows, seen_urls = [], set()
    for rec in records:
        row = _row(rec)
        if not row["title"] or row["url"] in seen_urls:
            continue
        seen_urls.add(row["url"])
        rows.append(row)

    ok, fail = 0, 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        r = requests.post(endpoint, headers=headers, json=batch, timeout=60)
        if r.status_code in (200, 201, 204):
            ok += len(batch)
            print(f"  [{i + len(batch)}/{len(rows)}] upsert OK")
        else:
            fail += len(batch)
            print(f"  [{i}] HTTP {r.status_code}: {r.text[:200]}")
    print(f"=== Upsert xong: {ok} OK, {fail} lỗi (từ {len(rows)} hàng unique) ===")
    return ok, fail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", default="data/scored_latest.json")
    args = ap.parse_args()
    data = json.load(open(args.inp, encoding="utf-8"))
    records = data["records"] if "records" in data else data
    print(f"=== Đẩy {len(records)} record vào Supabase ===")
    push(records)


if __name__ == "__main__":
    main()
