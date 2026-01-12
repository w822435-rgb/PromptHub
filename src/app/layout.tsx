import { Inter } from "next/font/google";
import "./globals.css";
// 🔥 1. 引入 GoogleAnalytics 组件
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PromptHub - AI 提示词社区",
  description: "分享和探索高质量的 AI 提示词",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body className={inter.className}>
        {children}
        {/* 🔥 2. 将组件放在 body 结束标签之前 */}
        {/* 请务必将下面的 'G-XYZ...' 替换为您真实的 Google 衡量 ID */}
        <GoogleAnalytics gaId="G-MMQENXR2PZ" /> 
      </body>
    </html>
  );
}