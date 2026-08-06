import type { Metadata } from "next";
import { Sheet1Matrix } from "../Sheet1Matrix";

export const metadata: Metadata = {
  title: "2026年6月电池出口更新表｜东吴电新",
  description: "2026年6月电池出口交互式汇总表。",
};

export default function Sheet1Page() { return <Sheet1Matrix />; }
