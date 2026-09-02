import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";

const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Access 转 MySQL",
  description: "把 Microsoft Access 数据库转换成可导入的 MySQL SQL 脚本",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${notoSansSC.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
