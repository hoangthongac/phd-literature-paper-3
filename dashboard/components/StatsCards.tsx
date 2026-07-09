import { Paper } from "@/lib/types";

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-2xl font-bold text-navy">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default function StatsCards({ all, filtered }: { all: Paper[]; filtered: Paper[] }) {
  const include = filtered.filter((p) => p.ic_ec_decision === "INCLUDE").length;
  const scored = filtered.filter((p) => p.ai_score != null).length;
  const gapHits = filtered.filter((p) => p.gap_mapped && p.gap_mapped !== "none").length;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card label="Paper hiển thị" value={filtered.length} hint={`/ ${all.length} tổng`} />
      <Card label="Được nhận (INCLUDE)" value={include} />
      <Card label="Khớp gap G1–G5" value={gapHits} />
      <Card label="Đã chấm điểm AI" value={scored} hint={scored === 0 ? "chưa chạy DeepSeek" : undefined} />
    </div>
  );
}
