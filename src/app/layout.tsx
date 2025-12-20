import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "PromptHub", // 这里修改浏览器标签页显示的文字
  description: "PromptHub",
  icons: {
    icon: "/icon.png", // 这里告诉浏览器去 public 文件夹找这个图片
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} font-sans antialiased bg-slate-50`}
      >
        {children}
      </body>
    </html>
  );
}
