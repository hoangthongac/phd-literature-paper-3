import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Research Radar — CP × Renewable Energy Forecasting",
  description:
    "Dashboard theo dõi văn liệu Conformal Prediction cho dự báo năng lượng tái tạo (PRISMA Paper 3) — Hoàng Trung Thông, NCS HUTECH.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
