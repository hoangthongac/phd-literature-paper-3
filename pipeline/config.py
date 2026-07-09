"""Cấu hình dùng chung cho pipeline crawl PRISMA Paper 3.

Query 12-term Block A×B×C lấy đúng từ 06_PRISMA_BAI3/01_Search_Strategy.md §2.
Thứ tự ưu tiên nguồn (§3): WoS(1) Scopus(2) SD(3) IEEE(4) Springer(5) CORE(6)
Semantic(7) CrossRef(8) arXiv(9) GoogleScholar(10).
Pipeline tự động chỉ chạy 6 nguồn thuần-API (2,5,6,7,8,9); 4 nguồn browser
(WoS/SD/IEEE/GS) chạy thủ công bằng skill rồi nạp sau.
"""

# --- Block A: họ Conformal Prediction (12 term) ---
BLOCK_A = [
    "conformal prediction", "conformal inference", "conformalized quantile regression",
    "CQR", "adaptive conformal", "ACI", "conformal PID",
    "split conformal", "weighted conformal", "online conformal",
    "distribution-free prediction interval", "distribution-free uncertainty",
]

# --- Block B: miền dự báo năng lượng tái tạo ---
BLOCK_B = [
    "renewable energy", "solar", "photovoltaic", "PV power", "wind power",
    "wind speed forecasting", "electricity load", "electricity demand",
    "electricity price", "power forecasting", "energy forecasting",
]

# --- Block C: ngữ cảnh dự báo ---
BLOCK_C = [
    "forecasting", "prediction interval", "time series", "uncertainty quantification",
]

YEAR_FROM, YEAR_TO = 2017, 2026

# Rank nguồn (để ghi source_rank + sources_seen)
SOURCE_RANK = {
    "wos": 1, "scopus": 2, "sciencedirect": 3, "ieee": 4, "springer": 5,
    "core": 6, "semantic": 7, "crossref": 8, "arxiv": 9, "google_scholar": 10,
}

# Nguồn chạy tự động trong pipeline hằng đêm (thuần API, headless-safe)
AUTO_SOURCES = ["scopus", "springer", "core", "semantic", "crossref", "arxiv"]


def _or(terms):
    return " OR ".join(f'"{t}"' for t in terms)


def scopus_query():
    return (
        f"TITLE-ABS-KEY(({_or(BLOCK_A)}) AND ({_or(BLOCK_B)}) AND ({_or(BLOCK_C)})) "
        f"AND PUBYEAR > {YEAR_FROM - 1} AND PUBYEAR < {YEAR_TO + 1}"
    )
