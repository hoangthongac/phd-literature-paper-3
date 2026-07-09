import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research Radar — CP × Renewable Energy Forecasting",
  description:
    "Dashboard theo dõi văn liệu Conformal Prediction cho dự báo năng lượng tái tạo (PRISMA Paper 3) — Hoàng Trung Thông, NCS HUTECH.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
