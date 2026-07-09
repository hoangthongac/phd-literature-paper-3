"""Crawler 6 nguồn API cho PRISMA Paper 3.

Tái dùng logic + query từ 06_PRISMA_BAI3/raw_exports/_script_*.py.
Mỗi hàm nguồn trả về list record chuẩn hóa:
  {title, authors, year, venue, doi, url, source_db, document_type}

Chạy độc lập:  python -m pipeline.crawl --hours 0   (0 = không lọc theo ngày)
Kết quả ghi vào data/crawl_latest.json (dedup theo doi/title).
"""
import os, sys, json, time, argparse, datetime as dt
import xml.etree.ElementTree as ET
import requests

# Ép stdout/stderr UTF-8 để in tiếng Việt trên Windows (cp1252) + GitHub Actions
for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

from .config import (
    BLOCK_A, BLOCK_B, BLOCK_C, YEAR_FROM, YEAR_TO, AUTO_SOURCES, scopus_query,
)

TIMEOUT = 40


def _norm(title, authors, year, venue, doi, url, source_db, doctype=""):
    return {
        "title": (title or "").strip().replace("\n", " "),
        "authors": authors or "",
        "year": int(year) if str(year).isdigit() else None,
        "venue": venue or "",
        "doi": (doi or "").lower().replace("https://doi.org/", "").strip(),
        "url": url or "",
        "source_db": source_db,
        "document_type": doctype or "",
    }


# ---------------- Scopus (rank 2) ----------------
def crawl_scopus():
    key = os.environ.get("SCOPUS_API_KEY")
    if not key:
        print("[scopus] SKIP — thiếu SCOPUS_API_KEY"); return []
    url = "https://api.elsevier.com/content/search/scopus"
    hdr = {"X-ELS-APIKey": key, "Accept": "application/json"}
    out, start, total = [], 0, None
    while True:
        params = {"query": scopus_query(), "count": 25, "start": start,
                  "field": "dc:title,dc:creator,prism:publicationName,prism:coverDate,"
                           "prism:doi,subtypeDescription,prism:aggregationType"}
        r = requests.get(url, params=params, headers=hdr, timeout=TIMEOUT)
        if r.status_code != 200:
            print(f"[scopus] HTTP {r.status_code}: {r.text[:150]}"); break
        d = r.json()["search-results"]
        if total is None:
            total = int(d.get("opensearch:totalResults", 0)); print(f"[scopus] total={total}")
        batch = d.get("entry", [])
        if not batch or (len(batch) == 1 and "error" in batch[0]): break
        for e in batch:
            out.append(_norm(e.get("dc:title"), e.get("dc:creator"),
                             (e.get("prism:coverDate") or "")[:4],
                             e.get("prism:publicationName"), e.get("prism:doi"),
                             "", "scopus", e.get("subtypeDescription")))
        start += 25
        if start >= total or start >= 1000: break
        time.sleep(0.4)
    print(f"[scopus] retrieved {len(out)}"); return out


# ---------------- Springer (rank 5) ----------------
def crawl_springer():
    key = os.environ.get("SPRINGER_API_KEY")
    if not key:
        print("[springer] SKIP — thiếu SPRINGER_API_KEY"); return []
    base = "https://api.springernature.com/meta/v2/json"
    queries = {
        "q1": '"conformal prediction" AND ("solar" OR "photovoltaic" OR "wind power" OR "renewable energy")',
        "q2": '"conformalized quantile regression" AND ("energy" OR "power" OR "load")',
        "q3": '"adaptive conformal" AND ("solar" OR "wind" OR "energy" OR "load")',
        "q4": '"conformal prediction" AND ("electricity load" OR "electricity price" OR "power forecasting")',
    }
    out, seen = [], set()
    for k, q in queries.items():
        start = 1; total = None
        while True:
            r = requests.get(base, params={"q": q, "api_key": key, "s": start, "p": 25}, timeout=TIMEOUT)
            if r.status_code != 200:
                print(f"[springer] {k} HTTP {r.status_code}"); break
            j = r.json()
            if total is None:
                total = int(j.get("result", [{}])[0].get("total", 0))
            recs = j.get("records", [])
            if not recs: break
            for rec in recs:
                doi = (rec.get("doi") or "").lower()
                dk = doi or (rec.get("title") or "?")[:40]
                if dk in seen: continue
                seen.add(dk)
                yr = (rec.get("publicationDate") or "")[:4]
                if yr.isdigit() and int(yr) < YEAR_FROM: continue
                out.append(_norm(rec.get("title"), "", yr, rec.get("publicationName"),
                                 doi, "", "springer", rec.get("contentType")))
            start += 25
            if start > total or start > 200: break
            time.sleep(0.5)
        time.sleep(0.5)
    print(f"[springer] retrieved {len(out)}"); return out


# ---------------- CORE (rank 6) ----------------
def crawl_core():
    key = os.environ.get("CORE_API_KEY")
    if not key:
        print("[core] SKIP — thiếu CORE_API_KEY"); return []
    base = "https://api.core.ac.uk/v3/search/works"
    hdr = {"Authorization": f"Bearer {key}"}
    queries = {
        "q1": '"conformal prediction" renewable energy solar wind forecasting',
        "q2": '"adaptive conformal" energy power load forecasting',
        "q3": '"conformalized quantile regression" wind solar energy load',
    }
    out, seen = [], set()
    for k, q in queries.items():
        try:
            r = requests.get(base, params={"q": q, "limit": 80}, headers=hdr, timeout=60)
            if r.status_code != 200:
                print(f"[core] {k} HTTP {r.status_code}"); continue
            for w in r.json().get("results", []):
                blob = ((w.get("title") or "") + " " + (w.get("abstract") or "")).lower()
                if "conformal" not in blob: continue    # precision filter (như script gốc)
                doi = (w.get("doi") or "").lower()
                dk = doi or (w.get("title") or "")[:40].lower()
                if dk in seen: continue
                seen.add(dk)
                yr = w.get("yearPublished")
                if yr and int(yr) < YEAR_FROM: continue
                out.append(_norm(w.get("title"), "", yr, w.get("publisher"),
                                 doi, "", "core"))
        except Exception as e:
            print(f"[core] {k} ERR {e}")
        time.sleep(1)
    print(f"[core] retrieved {len(out)}"); return out


# ---------------- Semantic Scholar (rank 7) ----------------
def crawl_semantic():
    key = os.environ.get("SEMANTIC_SCHOLAR_API_KEY")
    base = "https://api.semanticscholar.org/graph/v1/paper/search"
    hdr = {"x-api-key": key} if key else {}
    queries = {
        "q1": "conformal prediction renewable energy forecasting",
        "q2": "adaptive conformal inference solar photovoltaic wind power",
        "q3": "conformalized quantile regression energy forecasting",
        "q4": "conformal prediction interval electricity load demand",
        "q5": "conformal prediction electricity price forecasting",
        "q6": "split conformal weighted conformal solar wind power forecasting",
        "q7": "distribution-free prediction interval renewable energy forecasting",
    }
    out = []
    for k, q in queries.items():
        params = {"query": q, "limit": 30, "year": f"{YEAR_FROM}-{YEAR_TO}",
                  "fields": "title,year,externalIds,venue,publicationTypes,authors"}
        for attempt in range(4):
            try:
                r = requests.get(base, params=params, headers=hdr, timeout=TIMEOUT)
                if r.status_code == 200:
                    for it in (r.json().get("data") or []):
                        ext = it.get("externalIds") or {}
                        auth = "; ".join(a.get("name", "") for a in (it.get("authors") or [])[:8])
                        out.append(_norm(it.get("title"), auth, it.get("year"),
                                         it.get("venue"), ext.get("DOI"),
                                         f"https://arxiv.org/abs/{ext['ArXiv']}" if ext.get("ArXiv") else "",
                                         "semantic"))
                    break
                elif r.status_code == 429:
                    time.sleep(6)
                else:
                    print(f"[semantic] {k} HTTP {r.status_code}"); break
            except Exception as e:
                print(f"[semantic] {k} ERR {e}"); break
        time.sleep(3)
    print(f"[semantic] retrieved {len(out)}"); return out


# ---------------- CrossRef (rank 8, free) ----------------
def crawl_crossref():
    base = "https://api.crossref.org/works"
    mailto = os.environ.get("CROSSREF_MAILTO", "research@example.com")
    ua = {"User-Agent": f"PRISMA-review/1.0 (mailto:{mailto})"}
    queries = {
        "q1": "conformal prediction renewable energy forecasting uncertainty",
        "q2": "adaptive conformal inference solar wind power forecasting",
        "q3": "conformalized quantile regression energy forecasting",
        "q4": "split conformal weighted conformal wind solar power forecasting",
        "q5": "online conformal PID electricity load price forecasting",
        "q6": "distribution-free prediction interval renewable energy",
    }
    out = []
    for k, q in queries.items():
        params = {"query": q, "rows": 40,
                  "filter": f"from-pub-date:{YEAR_FROM}-01-01,until-pub-date:{YEAR_TO}-12-31",
                  "select": "DOI,title,author,container-title,published,type"}
        try:
            r = requests.get(base, params=params, headers=ua, timeout=TIMEOUT)
            if r.status_code == 200:
                for it in r.json().get("message", {}).get("items", []):
                    title = (it.get("title") or [""])[0]
                    venue = (it.get("container-title") or [""])[0]
                    auth = "; ".join(f"{a.get('given','')} {a.get('family','')}".strip()
                                     for a in (it.get("author") or [])[:8])
                    yr = (it.get("published", {}).get("date-parts", [[None]])[0][0])
                    out.append(_norm(title, auth, yr, venue, it.get("DOI"), "", "crossref", it.get("type")))
            else:
                print(f"[crossref] {k} HTTP {r.status_code}")
        except Exception as e:
            print(f"[crossref] {k} ERR {e}")
        time.sleep(1)
    print(f"[crossref] retrieved {len(out)}"); return out


# ---------------- arXiv (rank 9, free) ----------------
def crawl_arxiv():
    base = "http://export.arxiv.org/api/query"
    queries = {
        "q1": 'all:"conformal prediction" AND (all:solar OR all:"wind power" OR all:"renewable energy") AND all:forecasting',
        "q2": 'all:"adaptive conformal" AND (all:energy OR all:power OR all:renewable OR all:load)',
        "q3": 'all:"conformalized quantile regression" AND (all:solar OR all:wind OR all:energy OR all:load)',
        "q4": 'all:"physics-informed" AND all:conformal AND (all:solar OR all:wind OR all:energy)',
        "q5": 'all:"split conformal" OR all:"weighted conformal" AND (all:photovoltaic OR all:"wind power")',
    }
    ns = {"a": "http://www.w3.org/2005/Atom"}
    out = []
    for k, q in queries.items():
        try:
            r = requests.get(base, params={"search_query": q, "start": 0,
                                           "max_results": 40, "sortBy": "relevance"}, timeout=TIMEOUT)
            root = ET.fromstring(r.text)
            for e in root.findall("a:entry", ns):
                arxiv_url = e.find("a:id", ns).text
                doi_el = e.find("a:{http://arxiv.org/schemas/atom}doi")
                pub = e.find("a:published", ns).text[:4]
                auth = "; ".join(a.find("a:name", ns).text for a in e.findall("a:author", ns)[:8])
                out.append(_norm(e.find("a:title", ns).text, auth, pub, "arXiv (preprint)",
                                 doi_el.text if doi_el is not None else "",
                                 arxiv_url, "arxiv", "preprint"))
        except Exception as e:
            print(f"[arxiv] {k} ERR {e}")
        time.sleep(3)
    print(f"[arxiv] retrieved {len(out)}"); return out


CRAWLERS = {
    "scopus": crawl_scopus, "springer": crawl_springer, "core": crawl_core,
    "semantic": crawl_semantic, "crossref": crawl_crossref, "arxiv": crawl_arxiv,
}


def dedupe(records):
    """Gộp trùng theo doi (ưu tiên) hoặc title chuẩn hóa; gộp sources_seen."""
    merged = {}
    for r in records:
        key = f"doi:{r['doi']}" if r["doi"] else "title:" + "".join(r["title"].lower().split())[:60]
        if key in merged:
            m = merged[key]
            if r["source_db"] not in m["sources_seen"]:
                m["sources_seen"].append(r["source_db"])
            m["occurrences"] += 1
            # ưu tiên bản có nhiều thông tin hơn
            for f in ("authors", "venue", "url", "doi"):
                if not m[f] and r[f]:
                    m[f] = r[f]
        else:
            r = dict(r)
            r["dedupe_key"] = key
            r["sources_seen"] = [r["source_db"]]
            r["occurrences"] = 1
            merged[key] = r
    return list(merged.values())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sources", default=",".join(AUTO_SOURCES),
                    help="danh sách nguồn cách nhau dấu phẩy")
    ap.add_argument("--out", default="data/crawl_latest.json")
    args = ap.parse_args()

    srcs = [s.strip() for s in args.sources.split(",") if s.strip() in CRAWLERS]
    print(f"=== Crawl {len(srcs)} nguồn: {srcs} ===")
    all_recs = []
    for s in srcs:
        all_recs.extend(CRAWLERS[s]())
    unique = dedupe(all_recs)
    print(f"\n=== TỔNG: {len(all_recs)} raw → {len(unique)} unique ===")

    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    payload = {
        "crawled_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "sources": srcs, "raw_count": len(all_recs), "unique_count": len(unique),
        "records": unique,
    }
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=1)
    print(f"Saved: {args.out}")


if __name__ == "__main__":
    main()
