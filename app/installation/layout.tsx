import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "电动车装机数据库 · 东吴电新",
  description: "动力电池装机汇总、材料结构、国内厂商及全球市场研究数据库",
};

export default function InstallationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
