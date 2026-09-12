import type { Metadata } from "next";
import { Outfit, Noto_Sans_SC } from "next/font/google";
import "./globals.css";
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});
const noto = Noto_Sans_SC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});
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
    <html lang="zh" className={`${outfit.variable} ${noto.variable}`}>
      <body>{children}</body>
    </html>
  );
}
