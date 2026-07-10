"use client";

import { Paper, GAP_LABELS, DECISION_LABELS } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList,
  AreaChart, Area, CartesianGrid,
} from "recharts";

const GREEN = "#76b900";
const GREEN_DARK = "#5a8d00";
const INK = "#1a1a1a";
const GRAY = "#cccccc";
const MUTE = "#757575";
const DECISION_COLORS = ["#76b900", "#a7a7a7", "#5e5e5e", "#757575", "#898989", "#a0a0a0", "#b5b5b5", "#d0d0d0", "#1a1a1a"];

type TooltipPayload = {
  value?: number | string;
};

type DsTooltipProps = {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
};

function countBy<T extends string | number>(items: Paper[], key: (p: Paper) => T | null | undefined) {
  const m = new Map<T, number>();
  for (const p of items) {
    const k = key(p);
    if (k == null || k === "") continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

/* Tooltip theo hệ NVIDIA: nền đen, viền xanh, góc vuông */
function DsTooltip({ active, payload, label }: DsTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-primary bg-surface-dark px-3 py-2 text-xs text-on-dark">
      <div className="font-semibold">{label}</div>
      <div className="text-on-dark">
        <span className="font-bold text-primary">{payload[0].value}</span> paper
      </div>
    </div>
  );
}

function ChartBox({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`ds-card border border-hairline bg-canvas p-5 ${className}`}>
      <div className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">{title}</div>
      {subtitle && <div className="mb-3 text-xs text-mute">{subtitle}</div>}
      <div className="h-52">{children}</div>
    </div>
  );
}

export default function Charts({ papers }: { papers: Paper[] }) {
  // 1) Theo năm (area, tăng dần) — chỉ lấy khung 2017+ cho gọn
  const byYear = Array.from(countBy(papers, (p) => p.year))
    .filter(([y]) => typeof y === "number" && (y as number) >= 2017)
    .sort((a, b) => (a[0] as number) - (b[0] as number))
    .map(([year, n]) => ({ name: String(year), n }));

  // 2) Theo nguồn (horizontal bar)
  const srcMap = new Map<string, number>();
  for (const p of papers) for (const s of p.sources_seen ?? []) srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
  const bySource = Array.from(srcMap).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));

  // 3) Theo gap (highlight gap khớp)
  const byGap = Array.from(countBy(papers, (p) => p.gap_mapped))
    .map(([g, n]) => ({
      key: String(g),
      name: (GAP_LABELS[g as string] ?? String(g)).replace(/ · .*/, "").replace("Không khớp gap", "Khác"),
      n,
    }))
    .sort((a, b) => b.n - a.n);

  // 4) Phân bố IC/EC — thanh ngang xếp chồng (stacked bar trực quan)
  const dec = countBy(papers, (p) => p.ic_ec_decision);
  const compactDecisionLabel = (key: string) => {
    if (key === "INCLUDE") return "Nhận";
    if (key === "borderline") return "Cần xét";
    if (key.startsWith("EC")) return key;
    return DECISION_LABELS[key] ?? key;
  };
  const knownDecisionKeys = new Set(Object.keys(DECISION_LABELS));
  const decTotal = papers.filter((p) => p.ic_ec_decision).length;
  const decSegs = Object.keys(DECISION_LABELS)
    .map((key, index) => ({
      key,
      label: compactDecisionLabel(key),
      color: DECISION_COLORS[index % DECISION_COLORS.length],
      n: dec.get(key) ?? 0,
    }))
    .filter((d) => d.n > 0);
  const otherDecisionCount = Array.from(dec)
    .filter(([key]) => !knownDecisionKeys.has(String(key)))
    .reduce((sum, [, n]) => sum + n, 0);
  if (otherDecisionCount > 0) {
    decSegs.push({ key: "other", label: "Khác", color: "#333333", n: otherDecisionCount });
  }

  const empty = <div className="grid h-full place-items-center text-sm text-mute">Chưa có dữ liệu</div>;

  return (
    <div className="space-y-4">
      {/* Hàng trên: năm (rộng) + gap */}
      <div className="grid gap-4 md:grid-cols-5">
        <ChartBox title="Xu hướng theo năm" subtitle="Số công bố mỗi năm (2017–nay)" className="md:col-span-3">
          {byYear.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={byYear} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gYear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GREEN} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GREEN} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={{ stroke: GRAY }} />
                <YAxis fontSize={11} width={34} tickLine={false} axisLine={false} />
                <Tooltip content={<DsTooltip />} cursor={{ stroke: GREEN, strokeWidth: 1 }} />
                <Area type="monotone" dataKey="n" stroke={GREEN} strokeWidth={2} fill="url(#gYear)" dot={{ r: 2, fill: GREEN_DARK }} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : empty}
        </ChartBox>

        <ChartBox title="Theo khoảng trống" subtitle="Gap G1–G5 (xanh = gap cốt lõi)" className="md:col-span-2">
          {byGap.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byGap} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#eee" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} interval={0} axisLine={{ stroke: GRAY }} />
                <YAxis fontSize={11} width={34} tickLine={false} axisLine={false} />
                <Tooltip content={<DsTooltip />} cursor={{ fill: "rgba(118,185,0,0.06)" }} />
                <Bar dataKey="n" radius={[2, 2, 0, 0]}>
                  {byGap.map((d) => (
                    <Cell key={d.key} fill={d.key === "none" ? GRAY : GREEN} />
                  ))}
                  <LabelList dataKey="n" position="top" fontSize={11} fill={INK} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : empty}
        </ChartBox>
      </div>

      {/* Hàng dưới: nguồn (rộng) + phân bố quyết định */}
      <div className="grid gap-4 md:grid-cols-5">
        <ChartBox title="Top nguồn học thuật" subtitle="Số công bố tìm thấy theo từng nguồn" className="md:col-span-3">
          {bySource.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bySource} layout="vertical" margin={{ top: 0, right: 28, left: 12, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" fontSize={11} width={92} tickLine={false} axisLine={false} />
                <Tooltip content={<DsTooltip />} cursor={{ fill: "rgba(118,185,0,0.06)" }} />
                <Bar dataKey="n" fill={GREEN} radius={[0, 2, 2, 0]} barSize={14}>
                  <LabelList dataKey="n" position="right" fontSize={11} fill={MUTE} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : empty}
        </ChartBox>

        {/* Phân bố IC/EC — thanh xếp chồng thủ công (trực quan tỉ lệ sàng lọc) */}
        <ChartBox title="Phân bố sàng lọc IC/EC" subtitle={`${decTotal} paper đã phân loại`} className="md:col-span-2">
          {decSegs.length ? (
            <div className="flex h-full flex-col justify-center gap-4">
              <div className="flex h-8 w-full overflow-hidden border border-hairline">
                {decSegs.map((d) => (
                  <div
                    key={d.key}
                    className="h-full"
                    style={{ width: `${(d.n / decTotal) * 100}%`, background: d.color }}
                    title={`${d.label}: ${d.n}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {decSegs.map((d) => (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 shrink-0" style={{ background: d.color }} />
                    <span className="text-body">{d.label}</span>
                    <span className="ml-auto font-bold text-ink">{d.n}</span>
                    <span className="text-mute">{Math.round((d.n / decTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : empty}
        </ChartBox>
      </div>
    </div>
  );
}
