import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const siteTitle = "东吴电新｜新能源产业链数据库研究索引";
const siteDescription = "面向东吴电新行业研究人员的新能源产业链数据库总站，快速查找数据库、确认更新状态并进入数据查询。";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host") || "127.0.0.1:4180";
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og.png", origin).toString();

  return {
    title: siteTitle,
    description: siteDescription,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      type: "website",
      url: origin,
      images: [{ url: socialImage, width: 1659, height: 948, alt: "东吴电新新能源产业链数据库研究索引" }],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
