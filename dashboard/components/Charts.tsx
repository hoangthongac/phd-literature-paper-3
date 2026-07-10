"use client";

import { Paper, GAP_LABELS, DECISION_LABELS } from "@/lib/types";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GREEN = "#76b900";
const GREEN_DARK = "#5a8d00";
const GRAY = "#cccccc";
const MUTE = "#757575";
const BLUE = "#0046a4";
const DECISION_COLORS: Record<string, string> = {
  INCLUDE: GREEN,
  borderline: BLUE,
  EC1: "#b5b5b5",
  EC2: "#5e5e5e",
  EC3: "#757575",
  EC4: "#898989",
  EC5: "#a0a0a0",
  EC6: "#d0d0d0",
  EC7: "#1a1a1a",
};
const CORE_GAPS = ["G1", "G2", "G3", "G4", "G5"] as const;

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

function pct(part: number, total: number) {
  if (total === 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function compactGapLabel(key: string) {
  return (GAP_LABELS[key] ?? key).replace(/ · .*/, "");
}

function compactDecisionLabel(key: string) {
  if (key === "INCLUDE") return "Nhận";
  if (key === "borderline") return "Cần xét";
  if (key.startsWith("EC")) return key;
  return DECISION_LABELS[key] ?? key;
}

function DsTooltip({ active, payload, label }: DsTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-primary bg-surface-dark px-3 py-2 text-xs text-on-dark">
      <div className="font-semibold">{label}</div>
      <div>
        <span className="font-bold text-primary">{payload[0].value}</span> paper
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  stat,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  stat?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-hairline bg-canvas ${className}`}>
      <div className="flex min-h-20 items-start justify-between gap-4 border-b border-hairline bg-surface-soft px-5 py-4">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-primary">{title}</h2>
          {subtitle && <p className="mt-1 text-xs leading-relaxed text-mute">{subtitle}</p>}
        </div>
        {stat && <div className="shrink-0 text-right text-2xl font-bold leading-none text-ink">{stat}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function RankedBar({
  name,
  value,
  max,
  meta,
  color = GREEN,
}: {
  name: string;
  value: number;
  max: number;
  meta?: string;
  color?: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0;

  return (
    <div className="grid grid-cols-[88px_1fr_56px] items-center gap-3 text-xs">
      <div className="truncate font-semibold text-body" title={name}>{name}</div>
      <div className="h-5 border border-hairline bg-surface-soft">
        <div className="h-full" style={{ width: `${width}%`, background: color }} />
      </div>
      <div className="text-right">
        <span className="font-bold text-ink">{value}</span>
        {meta && <span className="ml-1 text-mute">{meta}</span>}
      </div>
    </div>
  );
}

export default function Charts({ papers }: { papers: Paper[] }) {
  const currentYear = new Date().getFullYear();
  const byYear = Array.from(countBy(papers, (p) => p.year))
    .filter(([y]) => typeof y === "number" && (y as number) >= 2017 && (y as number) <= currentYear)
    .sort((a, b) => (a[0] as number) - (b[0] as number))
    .map(([year, n]) => ({ name: String(year), n }));

  const srcMap = new Map<string, number>();
  for (const p of papers) {
    for (const s of p.sources_seen ?? []) srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
  }
  const bySource = Array.from(srcMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, n]) => ({ name, n }));
  const sourceMax = Math.max(...bySource.map((d) => d.n), 0);

  const gapCounts = countBy(papers, (p) => p.gap_mapped);
  const coreGapRows = CORE_GAPS.map((key) => ({
    key,
    name: compactGapLabel(key),
    n: gapCounts.get(key) ?? 0,
  })).sort((a, b) => b.n - a.n);
  const coreGapTotal = coreGapRows.reduce((sum, row) => sum + row.n, 0);
  const gapMax = Math.max(...coreGapRows.map((d) => d.n), 0);
  const otherGapTotal = papers.length - coreGapTotal;

  const dec = countBy(papers, (p) => p.ic_ec_decision);
  const knownDecisionKeys = new Set(Object.keys(DECISION_LABELS));
  const decTotal = papers.filter((p) => p.ic_ec_decision).length;
  const decSegs = Object.keys(DECISION_LABELS)
    .map((key) => ({
      key,
      label: compactDecisionLabel(key),
      color: DECISION_COLORS[key] ?? "#333333",
      n: dec.get(key) ?? 0,
    }))
    .filter((d) => d.n > 0);
  const otherDecisionCount = Array.from(dec)
    .filter(([key]) => !knownDecisionKeys.has(String(key)))
    .reduce((sum, [, n]) => sum + n, 0);
  if (otherDecisionCount > 0) {
    decSegs.push({ key: "other", label: "Khác", color: "#333333", n: otherDecisionCount });
  }

  const empty = <div className="grid h-56 place-items-center text-sm text-mute">Chưa có dữ liệu</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          title="Xu hướng theo năm"
          subtitle="Chỉ hiển thị các năm đã hoàn tất hoặc đang diễn ra để tránh nhiễu bởi dữ liệu tương lai."
          stat={byYear.length ? String(byYear.at(-1)?.name) : undefined}
          className="lg:col-span-3"
        >
          <div className="h-64">
            {byYear.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={byYear} margin={{ top: 10, right: 18, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gYear" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GREEN} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={GREEN} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#eeeeee" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={{ stroke: GRAY }} />
                  <YAxis fontSize={11} width={42} tickLine={false} axisLine={false} tick={{ fill: MUTE }} />
                  <Tooltip content={<DsTooltip />} cursor={{ stroke: GREEN, strokeWidth: 1 }} />
                  <Area
                    type="monotone"
                    dataKey="n"
                    stroke={GREEN}
                    strokeWidth={2}
                    fill="url(#gYear)"
                    dot={{ r: 2, fill: GREEN_DARK }}
                    activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : empty}
          </div>
        </Panel>

        <Panel
          title="Gap cốt lõi G1-G5"
          subtitle={`Tách phần "Khác" (${otherGapTotal}) ra khỏi chart để thấy rõ độ thưa của từng khoảng trống nghiên cứu.`}
          stat={String(coreGapTotal)}
          className="lg:col-span-2"
        >
          {coreGapRows.some((row) => row.n > 0) ? (
            <div className="space-y-3">
              {coreGapRows.map((row) => (
                <RankedBar
                  key={row.key}
                  name={row.name}
                  value={row.n}
                  max={gapMax}
                  meta={pct(row.n, papers.length)}
                  color={row.n === gapMax ? GREEN : "#5a8d00"}
                />
              ))}
              <div className="border-t border-hairline pt-3 text-xs leading-relaxed text-mute">
                Gap chart đang ưu tiên câu hỏi nghiên cứu, không để nhóm không khớp gap che khuất tín hiệu G1-G5.
              </div>
            </div>
          ) : empty}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Panel
          title="Nguồn học thuật"
          subtitle="Top nguồn theo số lần xuất hiện sau dedupe; dùng để kiểm tra độ phủ tìm kiếm."
          stat={String(bySource.length)}
          className="lg:col-span-3"
        >
          {bySource.length ? (
            <div className="space-y-2.5">
              {bySource.map((row) => (
                <RankedBar key={row.name} name={row.name} value={row.n} max={sourceMax} />
              ))}
            </div>
          ) : empty}
        </Panel>

        <Panel
          title="Sàng lọc IC/EC"
          subtitle={`${decTotal} paper đã có quyết định; màu xanh là nhóm nhận vào tổng quan.`}
          stat={pct(dec.get("INCLUDE") ?? 0, decTotal)}
          className="lg:col-span-2"
        >
          {decSegs.length ? (
            <div className="space-y-4">
              <div className="flex h-7 w-full overflow-hidden border border-hairline bg-surface-soft">
                {decSegs.map((d) => (
                  <div
                    key={d.key}
                    className="h-full"
                    style={{ width: `${(d.n / decTotal) * 100}%`, background: d.color }}
                    title={`${d.label}: ${d.n}`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {decSegs.map((d) => (
                  <div key={d.key} className="grid grid-cols-[12px_1fr_auto_auto] items-center gap-2">
                    <span className="h-3 w-3" style={{ background: d.color }} />
                    <span className="text-body">{d.label}</span>
                    <span className="font-bold text-ink">{d.n}</span>
                    <span className="w-8 text-right text-mute">{pct(d.n, decTotal)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-hairline pt-3 text-xs text-mute">
                Include rate thấp là tín hiệu bình thường của PRISMA; phần quan trọng là lý do EC có nhất quán không.
              </div>
            </div>
          ) : empty}
        </Panel>
      </div>
    </div>
  );
}
