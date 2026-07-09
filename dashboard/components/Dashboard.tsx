"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Paper } from "@/lib/types";
import FilterBar, { Filters, DEFAULT_FILTERS } from "./FilterBar";
import StatsCards from "./StatsCards";
import Charts from "./Charts";
import PaperCard from "./PaperCard";

const PAGE_SIZE = 30;

export default function Dashboard() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [visible, setVisible] = useState(PAGE_SIZE);

  // Fetch toàn bộ papers (client-side filter cho mượt; corpus ~1k dòng nên OK)
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("papers")
        .select(
          "id,title,authors,abstract,url,doi,venue,year,document_type,source,sources_seen,occurrences,ai_score,ai_summary_vi,ai_rationale,gap_mapped,energy_type,uq_method,ic_ec_decision,published_at,created_at"
        )
        .order("year", { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) setError(error.message);
      else setPapers((data as Paper[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const sources = useMemo(() => {
    const s = new Set<string>();
    papers.forEach((p) => p.sources_seen?.forEach((x) => s.add(x)));
    return Array.from(s).sort();
  }, [papers]);

  const years = useMemo(
    () => Array.from(new Set(papers.map((p) => p.year).filter(Boolean) as number[])).sort((a, b) => b - a),
    [papers]
  );

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    let out = papers.filter((p) => {
      if (q) {
        const hay = `${p.title} ${p.authors ?? ""} ${p.ai_summary_vi ?? ""} ${p.venue ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.gap && p.gap_mapped !== filters.gap) return false;
      if (filters.energy && p.energy_type !== filters.energy) return false;
      if (filters.decision && p.ic_ec_decision !== filters.decision) return false;
      if (filters.source && !(p.sources_seen ?? []).includes(filters.source)) return false;
      if (filters.minScore > 0 && (p.ai_score ?? -1) < filters.minScore) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (filters.sort === "score_desc") return (b.ai_score ?? -1) - (a.ai_score ?? -1);
      if (filters.sort === "year_asc") return (a.year ?? 0) - (b.year ?? 0);
      return (b.year ?? 0) - (a.year ?? 0); // year_desc
    });
    return out;
  }, [papers, filters]);

  // Reset trang khi đổi filter
  useEffect(() => setVisible(PAGE_SIZE), [filters]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-navy">
          🔬 Research Radar — Conformal Prediction × Renewable Energy
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi văn liệu cho PRISMA Paper 3 · Hoàng Trung Thông, NCS HUTECH · dữ liệu từ 10 nguồn học thuật, tóm tắt do AI (DeepSeek) sinh — nên đọc bản gốc.
        </p>
      </header>

      {loading && (
        <div className="grid place-items-center rounded-xl border border-slate-200 bg-white py-20 text-slate-400">
          Đang tải dữ liệu từ Supabase…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Lỗi tải dữ liệu: {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          <StatsCards all={papers} filtered={filtered} />
          <Charts papers={filtered} />
          <FilterBar filters={filters} onChange={setFilters} sources={sources} years={years} />

          {/* Danh sách paper */}
          {filtered.length === 0 ? (
            <div className="grid place-items-center rounded-xl border border-slate-200 bg-white py-16 text-slate-400">
              Không có paper nào khớp bộ lọc.
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filtered.slice(0, visible).map((p) => (
                  <PaperCard key={p.id} p={p} />
                ))}
              </div>
              {visible < filtered.length && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                    className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Xem thêm ({filtered.length - visible} paper)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <footer className="mt-10 border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
        Dữ liệu: WoS · Scopus · ScienceDirect · IEEE · Springer · CORE · Semantic Scholar · CrossRef · arXiv · Google Scholar.
        Tóm tắt & điểm liên quan do AI sinh — kiểm chứng với bản gốc trước khi trích dẫn.
      </footer>
    </main>
  );
}
