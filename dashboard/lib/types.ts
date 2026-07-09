// Kiểu dữ liệu hàng bảng `papers` (khớp db/schema.sql + db/02_prisma_extension.sql)
export type Paper = {
  id: number;
  title: string;
  authors: string | null;
  abstract: string | null;
  url: string | null;
  doi: string | null;
  venue: string | null;
  year: number | null;
  document_type: string | null;
  source: string | null;
  sources_seen: string[] | null;
  occurrences: number | null;
  ai_score: number | null;
  ai_summary_vi: string | null;
  ai_rationale: string | null;
  gap_mapped: string | null;
  energy_type: string | null;
  uq_method: string | null;
  ic_ec_decision: string | null;
  published_at: string | null;
  created_at: string;
};

// Nhãn hiển thị cho gap (khớp Annex A — 01_Search_Strategy.md)
export const GAP_LABELS: Record<string, string> = {
  G1: "G1 · ACI+PINN cho RE",
  G2: "G2 · Nhiệt đới / Việt Nam",
  G3: "G3 · Aleatoric/Epistemic Solar",
  G4: "G4 · PINN+CP Solar",
  G5: "G5 · CP+Transformer/KAN",
  none: "Không khớp gap",
};

export const ENERGY_TYPES = ["Solar", "Wind", "Load", "Price", "Multi", "NA"] as const;

// Nhãn quyết định IC/EC
export const DECISION_LABELS: Record<string, string> = {
  INCLUDE: "Nhận (INCLUDE)",
  borderline: "Cần xét (borderline)",
  EC1: "Loại EC1 · ngôn ngữ/không truy cập",
  EC2: "Loại EC2 · không phải năng lượng",
  EC3: "Loại EC3 · không dùng CP",
  EC4: "Loại EC4 · CP lý thuyết thuần",
  EC5: "Loại EC5 · trùng lặp",
  EC6: "Loại EC6 · abstract/poster",
  EC7: "Loại EC7 · ngoài khung thời gian",
};
