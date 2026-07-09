import { Paper, GAP_LABELS, DECISION_LABELS } from "@/lib/types";

function scoreColor(score: number | null) {
  if (score == null) return "bg-slate-100 text-slate-400";
  if (score >= 8) return "bg-emerald-100 text-emerald-700";
  if (score >= 6) return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-500";
}

function decisionColor(d: string | null) {
  if (d === "INCLUDE") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (d === "borderline") return "bg-amber-50 text-amber-700 border-amber-200";
  if (d?.startsWith("EC")) return "bg-rose-50 text-rose-600 border-rose-200";
  return "bg-slate-50 text-slate-500 border-slate-200";
}

export default function PaperCard({ p }: { p: Paper }) {
  const link = p.url || (p.doi ? `https://doi.org/${p.doi}` : null);

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-accent/40 hover:shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold ${scoreColor(p.ai_score)}`}
          title="Điểm liên quan do AI chấm (0–10)"
        >
          {p.ai_score != null ? `⭐ ${p.ai_score}` : "—"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold leading-snug text-slate-900">{p.title}</h3>
          <div className="mt-1 text-sm text-slate-500">
            {p.authors ? <span>{p.authors.slice(0, 120)}</span> : <span className="italic">không rõ tác giả</span>}
            {p.year && <span> · {p.year}</span>}
            {p.venue && <span> · {p.venue}</span>}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {p.ic_ec_decision && (
          <span className={`rounded-md border px-2 py-0.5 text-xs ${decisionColor(p.ic_ec_decision)}`}>
            {DECISION_LABELS[p.ic_ec_decision] ?? p.ic_ec_decision}
          </span>
        )}
        {p.gap_mapped && p.gap_mapped !== "none" && (
          <span className="rounded-md border border-accent/30 bg-accent/5 px-2 py-0.5 text-xs text-accent">
            {GAP_LABELS[p.gap_mapped] ?? p.gap_mapped}
          </span>
        )}
        {p.energy_type && p.energy_type !== "NA" && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{p.energy_type}</span>
        )}
        {p.uq_method && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{p.uq_method}</span>
        )}
      </div>

      {/* AI summary (VI) */}
      {p.ai_summary_vi && (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-medium text-slate-500">Tóm tắt AI: </span>
          {p.ai_summary_vi}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <span>{p.sources_seen?.length ? `Nguồn: ${p.sources_seen.join(", ")}` : ""}</span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="font-medium text-accent hover:underline">
            Đọc gốc ↗
          </a>
        )}
      </div>
    </article>
  );
}
