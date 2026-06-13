import type { Metadata } from "next";
import "@arco-design/web-react/dist/css/arco.css";
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
        {children}
      </body>
    </html>
  );
}
