import { Paper } from "@/lib/types";

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="ds-card border border-hairline bg-canvas p-5">
      <div className="text-3xl font-bold text-ink leading-none">{value}</div>
      <div className="mt-2 text-sm text-mute">{label}</div>
      {hint && <div className="mt-1 text-xs text-mute">{hint}</div>}
    </div>
  );
}

export default function StatsCards({ all, filtered }: { all: Paper[]; filtered: Paper[] }) {
  const include = filtered.filter((p) => p.ic_ec_decision === "INCLUDE").length;
  const scored = filtered.filter((p) => p.ai_score != null).length;
  const gapHits = filtered.filter((p) => p.gap_mapped && p.gap_mapped !== "none").length;

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Card label="Paper hiển thị" value={filtered.length} hint={`/ ${all.length} tổng`} />
      <Card label="Được nhận (INCLUDE)" value={include} />
      <Card label="Khớp gap G1–G5" value={gapHits} />
      <Card label="Đã chấm điểm AI" value={scored} hint={scored === 0 ? "chưa chạy DeepSeek" : undefined} />
    </div>
  );
}
