import { Paper } from "@/lib/types";

function pct(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function MetricCard({
  label,
  value,
  context,
  detail,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  context: string;
  detail: string;
  emphasis?: boolean;
}) {
  return (
    <div className={`border bg-canvas p-4 md:p-5 ${emphasis ? "border-primary" : "border-hairline"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-mute">{label}</div>
          <div className="mt-2 text-2xl font-bold leading-none text-ink sm:text-4xl lg:text-3xl">{value}</div>
        </div>
        <div className={`h-1.5 w-10 ${emphasis ? "bg-primary" : "bg-hairline-strong"}`} />
      </div>
      <div className="mt-3 flex flex-col gap-1 border-t border-hairline pt-3 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <span className="font-semibold text-body">{context}</span>
        <span className="text-mute">{detail}</span>
      </div>
    </div>
  );
}

export default function StatsCards({ all, filtered }: { all: Paper[]; filtered: Paper[] }) {
  const include = filtered.filter((p) => p.ic_ec_decision === "INCLUDE").length;
  const scored = filtered.filter((p) => p.ai_score != null).length;
  const gapHits = filtered.filter((p) => p.gap_mapped && p.gap_mapped !== "none").length;
  const highScore = filtered.filter((p) => (p.ai_score ?? 0) >= 8).length;

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        label="Corpus đang xem"
        value={filtered.length}
        context={`${pct(filtered.length, all.length)} của corpus`}
        detail={`${all.length} tổng`}
        emphasis
      />
      <MetricCard
        label="Include"
        value={include}
        context={`${pct(include, filtered.length)} được nhận`}
        detail="IC"
      />
      <MetricCard
        label="Gap cốt lõi"
        value={gapHits}
        context={`${pct(gapHits, filtered.length)} khớp G1-G5`}
        detail="Research gaps"
      />
      <MetricCard
        label="AI scoring"
        value={scored}
        context={`${pct(highScore, scored)} điểm từ 8+`}
        detail={`${pct(scored, filtered.length)} đã chấm`}
      />
    </section>
  );
}
