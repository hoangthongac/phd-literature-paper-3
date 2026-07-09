"""Import 950 unique records đã crawl sẵn (all_sources_2026-07-08.json) vào Supabase.

Các record này đã dedup + có sources_seen/occurrences/dedupe_key.
Mặc định import KHÔNG chấm điểm (nhanh, không tốn DeepSeek) — dashboard có
dữ liệu nền ngay. Dùng --score để chấm bằng DeepSeek trước khi đẩy (tốn phí).

  python -m pipeline.import_raw --in <path all_sources.json>
  python -m pipeline.import_raw --in <path> --score --limit 50   # chấm 50 bài đầu
"""
import os, sys, json, argparse
from . import push_to_supabase as pusher

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Map tên nguồn dài trong sources_seen -> slug ngắn
SRC_MAP = {
    "web of science": "wos", "scopus": "scopus", "sciencedirect": "sciencedirect",
    "ieee": "ieee", "springer": "springer", "core": "core",
    "semantic scholar": "semantic", "crossref": "crossref", "arxiv": "arxiv",
    "google scholar": "google_scholar",
}


def _slug_sources(sources_seen):
    slugs = []
    for s in sources_seen or []:
        name = s.split(":")[0].strip().lower()   # "Web of Science:items" -> "web of science"
        slug = SRC_MAP.get(name, name.replace(" ", "_"))
        if slug not in slugs:
            slugs.append(slug)
    return slugs


def load_unique(path):
    d = json.load(open(path, encoding="utf-8"))
    raw = d["unique_records"] if isinstance(d, dict) and "unique_records" in d else d
    recs = []
    for r in raw:
        doi = (r.get("doi") or "").lower().replace("https://doi.org/", "").strip()
        recs.append({
            "title": r.get("title", ""),
            "authors": r.get("authors", ""),
            "year": r.get("year"),
            "venue": r.get("venue", ""),
            "doi": doi,
            "url": f"https://doi.org/{doi}" if doi else "",
            "document_type": r.get("document_type", ""),
            "source_db": "",
            "sources_seen": _slug_sources(r.get("sources_seen")),
            "occurrences": r.get("occurrences", 1),
            "dedupe_key": r.get("dedupe_key", ""),
        })
    return recs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="inp", required=True, help="đường dẫn all_sources_*.json")
    ap.add_argument("--score", action="store_true", help="chấm DeepSeek trước khi đẩy (tốn phí)")
    ap.add_argument("--limit", type=int, default=None, help="giới hạn số bài (test)")
    args = ap.parse_args()

    recs = load_unique(args.inp)
    if args.limit:
        recs = recs[:args.limit]
    print(f"=== Đã nạp {len(recs)} unique records từ {args.inp} ===")

    if args.score:
        from .score import score_records
        score_records(recs)
    else:
        print("(bỏ qua chấm điểm — import raw; dùng --score để chấm bằng DeepSeek)")

    pusher.push(recs)


if __name__ == "__main__":
    main()
