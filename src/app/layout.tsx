import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "일정 관리",
  description: "매장 방문 일정 관리",
  appleWebApp: {
    capable: true,
    title: "일정 관리",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
  // 사용자 핀치 줌은 허용 (접근성). input 자동 줌은 globals.css에서 16px 강제로 해결.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-neutral-50 pb-[calc(env(safe-area-inset-bottom)+64px)] text-neutral-900 antialiased sm:pb-0`}
      >
        {children}
        <MobileBottomNav />
      </body>
    </html>
  );
}
