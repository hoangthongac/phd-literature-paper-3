"use client";

import { GAP_LABELS, DECISION_LABELS } from "@/lib/types";

export type Filters = {
  q: string;
  gap: string;
  energy: string;
  decision: string;
  source: string;
  year: string;
  minScore: number;
  sort: string;
};

export const DEFAULT_FILTERS: Filters = {
  q: "", gap: "", energy: "", decision: "", source: "", year: "", minScore: 0, sort: "year_desc",
};

type Props = {
  filters: Filters;
  onChange: (f: Filters) => void;
  sources: string[];
  years: number[];
};

function Select({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-mute">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-sm border border-hairline bg-canvas px-2.5 py-2 text-sm font-normal normal-case text-ink focus:border-primary focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export default function FilterBar({ filters, onChange, sources, years }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="border border-hairline bg-canvas p-5">
      {/* Search */}
      <input
        type="search"
        value={filters.q}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Tìm trong tiêu đề, tác giả, tóm tắt..."
        className="w-full rounded-sm border border-hairline px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-3">
        <Select label="Gap" value={filters.gap} onChange={(v) => set({ gap: v })}>
          <option value="">Tất cả gap</option>
          {Object.entries(GAP_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>

        <Select label="Loại năng lượng" value={filters.energy} onChange={(v) => set({ energy: v })}>
          <option value="">Tất cả</option>
          {["Solar", "Wind", "Load", "Price", "Multi", "NA"].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </Select>

        <Select label="Quyết định" value={filters.decision} onChange={(v) => set({ decision: v })}>
          <option value="">Tất cả</option>
          {Object.entries(DECISION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </Select>

        <Select label="Nguồn" value={filters.source} onChange={(v) => set({ source: v })}>
          <option value="">Tất cả nguồn</option>
          {sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>

        <Select label="Năm" value={filters.year} onChange={(v) => set({ year: v })}>
          <option value="">Tất cả năm</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </Select>

        <Select label={`Điểm AI ≥ ${filters.minScore}`} value={String(filters.minScore)} onChange={(v) => set({ minScore: Number(v) })}>
          {[0, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>{n === 0 ? "Mọi điểm" : `≥ ${n}`}</option>
          ))}
        </Select>

        <Select label="Sắp xếp" value={filters.sort} onChange={(v) => set({ sort: v })}>
          <option value="year_desc">Năm mới nhất</option>
          <option value="year_asc">Năm cũ nhất</option>
          <option value="score_desc">Điểm AI cao nhất</option>
        </Select>

        <button
          type="button"
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="self-end rounded-sm border border-hairline px-3 py-2 text-sm font-semibold text-body hover:border-primary hover:text-ink"
        >
          Xóa lọc
        </button>
      </div>
    </div>
  );
}
