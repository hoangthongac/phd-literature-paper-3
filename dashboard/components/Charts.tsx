"use client";

import { Paper, GAP_LABELS } from "@/lib/types";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

function countBy<T extends string | number>(items: Paper[], key: (p: Paper) => T | null | undefined) {
  const m = new Map<T, number>();
  for (const p of items) {
    const k = key(p);
    if (k == null || k === "") continue;
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-navy">{title}</h3>
      <div className="h-48">{children}</div>
    </div>
  );
}

export default function Charts({ papers }: { papers: Paper[] }) {
  // Theo năm (tăng dần)
  const byYear = Array.from(countBy(papers, (p) => p.year))
    .filter(([y]) => typeof y === "number")
    .sort((a, b) => (a[0] as number) - (b[0] as number))
    .map(([year, n]) => ({ name: String(year), n }));

  // Theo nguồn (unnest sources_seen)
  const srcMap = new Map<string, number>();
  for (const p of papers) for (const s of p.sources_seen ?? []) srcMap.set(s, (srcMap.get(s) ?? 0) + 1);
  const bySource = Array.from(srcMap).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, n }));

  // Theo gap
  const byGap = Array.from(countBy(papers, (p) => p.gap_mapped))
    .map(([g, n]) => ({ name: (GAP_LABELS[g as string] ?? String(g)).replace(/ · .*/, ""), n }))
    .sort((a, b) => b.n - a.n);

  const empty = <div className="grid h-full place-items-center text-sm text-slate-400">Chưa có dữ liệu</div>;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <ChartBox title="Paper theo năm">
        {byYear.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byYear}>
              <XAxis dataKey="name" fontSize={11} tickLine={false} />
              <YAxis fontSize={11} width={28} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="n" fill="#2f6db3" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : empty}
      </ChartBox>

      <ChartBox title="Top nguồn">
        {bySource.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bySource} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" fontSize={10} width={80} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="n" fill="#1c4270" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : empty}
      </ChartBox>

      <ChartBox title="Paper theo Gap">
        {byGap.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byGap}>
              <XAxis dataKey="name" fontSize={10} tickLine={false} interval={0} />
              <YAxis fontSize={11} width={28} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="n" radius={[3, 3, 0, 0]}>
                {byGap.map((d, i) => (
                  <Cell key={i} fill={d.name.startsWith("Không") ? "#cbd5e1" : "#2f6db3"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : empty}
      </ChartBox>
    </div>
  );
}
