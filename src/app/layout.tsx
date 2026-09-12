import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Arkon · 身体手记",
  description: "从你的身体数据与日常活动出发，了解代谢、能量需求和体重目标。",
};
export function generateViewport() {
  return { themeColor: "#F3F1F8", colorScheme: "light" };
}
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh">
      <body>{children}</body>
    </html>
  );
}
