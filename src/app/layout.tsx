import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// 👇 1. 引入 Google 组件
import { GoogleAnalytics } from '@next/third-parties/google';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PromptHub",
  description: "AI Prompt Community",
};

// 👇 注意这里：TypeScript 需要告诉代码 children 是什么类型
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        {children}
        {/* 👇 2. 填入您的 Google ID */}
        <GoogleAnalytics gaId="G-9539GDGWV5" />
      </body>
    </html>
  );
}