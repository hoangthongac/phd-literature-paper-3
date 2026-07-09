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
    <>
      {/* Utility bar + nav (đen, hệ NVIDIA) */}
      <div className="bg-surface-dark text-on-dark">
        <div className="mx-auto flex h-8 max-w-6xl items-center justify-between px-4 text-xs text-white/70">
          <span>Research Radar · PRISMA Paper 3</span>
          <span>HUTECH — Viện Kỹ thuật</span>
        </div>
      </div>
      <nav className="border-b border-hairline-strong bg-surface-dark text-on-dark">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2.5 text-[17px] font-bold">
            <span className="h-3.5 w-3.5 bg-primary" /> Research Radar
          </span>
          <a
            href="https://demo-hoangthongacs-projects.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-white hover:text-primary"
          >
            Trang giới thiệu ↗
          </a>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
            Conformal Prediction × Renewable Energy Forecasting
          </div>
          <h1 className="text-3xl font-bold leading-tight text-ink">
            Dashboard theo dõi văn liệu
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-body">
            Theo dõi văn liệu cho PRISMA Paper 3 · Hoàng Trung Thông, NCS HUTECH · dữ liệu từ 10 nguồn học thuật.
            Tóm tắt & điểm liên quan do AI (DeepSeek) sinh — nên đọc bản gốc.
          </p>
        </header>

        {loading && (
          <div className="grid place-items-center border border-hairline bg-canvas py-20 text-mute">
            Đang tải dữ liệu từ Supabase…
          </div>
        )}

        {error && (
          <div className="border border-hairline border-l-2 border-l-red-600 bg-surface-soft p-4 text-sm text-body">
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
              <div className="grid place-items-center border border-hairline bg-canvas py-16 text-mute">
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
                      type="button"
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="border border-primary bg-primary px-6 py-2.5 text-sm font-bold text-ink hover:bg-primary-dark"
                    >
                      Xem thêm ({filtered.length - visible} paper)
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-hairline-strong bg-surface-dark py-10 text-white/70">
        <div className="mx-auto max-w-6xl px-4 text-[13px] leading-relaxed">
          Dữ liệu: WoS · Scopus · ScienceDirect · IEEE · Springer · CORE · Semantic Scholar · CrossRef · arXiv · Google Scholar.
          <div className="mt-2 text-[10px] uppercase tracking-wide text-mute">
            Tóm tắt & điểm liên quan do AI sinh — kiểm chứng với bản gốc trước khi trích dẫn.
          </div>
        </div>
      </footer>
    </>
  );
}
