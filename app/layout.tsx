import type { Metadata } from "next";
import { ArcoReactRootBridge } from "@/components/common/ArcoReactRootBridge";
// Arco CSS 现由 globals.css 以 layer(arco) 引入（低优先级），避免其无-layer reset 压过 Tailwind 工具类
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 人物库",
  description: "探索 · 学习 · 成长",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ArcoReactRootBridge />
        {children}
      </body>
    </html>
  );
}
