import type { Metadata } from "next";
import "./globals.css";
import "./research-page-header.css";

const siteTitle = "东吴电新｜新能源产业链数据库研究索引";
const siteDescription = "面向东吴电新行业研究人员的新能源产业链数据库总站，快速查找数据库、确认更新状态并进入数据查询。";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const siteOrigin = basePath
  ? "https://zzll86496-byte.github.io"
  : "https://dongwu-new-energy-dashboard.zzll86496.chatgpt.site";
const canonicalUrl = `${siteOrigin}${basePath}/`;
const socialImage = `${siteOrigin}${basePath}/og.png`;

export const dynamic = "force-static";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: siteTitle,
  description: siteDescription,
  alternates: { canonical: canonicalUrl },
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    type: "website",
    url: canonicalUrl,
    images: [{ url: socialImage, width: 1659, height: 948, alt: "东吴电新新能源产业链数据库研究索引" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [socialImage],
  },
};

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
