import { Paper, GAP_LABELS, DECISION_LABELS } from "@/lib/types";

function scoreColor(score: number | null) {
  if (score == null) return "bg-surface-soft text-mute border-hairline";
  if (score >= 8) return "bg-primary text-ink border-primary";
  if (score >= 6) return "bg-surface-soft text-ink border-hairline-strong";
  return "bg-surface-soft text-mute border-hairline";
}

function decisionColor(d: string | null) {
  if (d === "INCLUDE") return "text-ink border-primary";
  if (d === "borderline") return "text-body border-hairline-strong";
  if (d?.startsWith("EC")) return "text-mute border-hairline";
  return "text-mute border-hairline";
}

export default function PaperCard({ p }: { p: Paper }) {
  const link = p.url || (p.doi ? `https://doi.org/${p.doi}` : null);

  return (
    <article className="ds-card border border-hairline bg-canvas p-5 transition hover:border-primary">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 border px-2.5 py-1 text-sm font-bold ${scoreColor(p.ai_score)}`}
          title="Điểm liên quan do AI chấm (0–10)"
        >
          {p.ai_score != null ? p.ai_score.toFixed(1) : "—"}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug text-ink">{p.title}</h3>
          <div className="mt-1 text-sm text-mute">
            {p.authors ? <span>{p.authors.slice(0, 120)}</span> : <span className="italic">không rõ tác giả</span>}
            {p.year && <span> · {p.year}</span>}
            {p.venue && <span> · {p.venue}</span>}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.ic_ec_decision && (
          <span className={`border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${decisionColor(p.ic_ec_decision)}`}>
            {DECISION_LABELS[p.ic_ec_decision] ?? p.ic_ec_decision}
          </span>
        )}
        {p.gap_mapped && p.gap_mapped !== "none" && (
          <span className="border border-primary bg-primary/10 px-2 py-0.5 text-xs font-semibold text-ink">
            {GAP_LABELS[p.gap_mapped] ?? p.gap_mapped}
          </span>
        )}
        {p.energy_type && p.energy_type !== "NA" && (
          <span className="bg-surface-soft px-2 py-0.5 text-xs text-body">{p.energy_type}</span>
        )}
        {p.uq_method && (
          <span className="bg-surface-soft px-2 py-0.5 text-xs text-body">{p.uq_method}</span>
        )}
      </div>

      {/* AI summary (VI) */}
      {p.ai_summary_vi && (
        <p className="mt-3 text-sm text-body">
          <span className="font-semibold text-mute">Tóm tắt AI: </span>
          {p.ai_summary_vi}
        </p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-mute">
        <span>{p.sources_seen?.length ? `Nguồn: ${p.sources_seen.join(", ")}` : ""}</span>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className="font-semibold text-link-blue hover:underline">
            Đọc gốc ↗
          </a>
        )}
      </div>
    </article>
  );
}
