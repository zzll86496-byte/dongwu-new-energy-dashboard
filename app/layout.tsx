import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "国内电池出口数据观察站｜东吴电新";
const description = "面向日常研究的电池、光伏、风电与产业链数据看板。";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost";
  const protocol = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const image = `${protocol}://${host}/og.png`;
  return { title, description, openGraph: { title, description, type: "website", locale: "zh_CN", images: [{ url: image, width: 1672, height: 943 }] }, twitter: { card: "summary_large_image", title, description, images: [image] } };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
