import { sitePath } from "../site-path";

export const dynamic = "force-static";

export default function VehicleSupplyPage() {
  return <iframe title="动力电池车企配套数据库" src={sitePath("/vehicle-supply-frame/")} style={{ display: "block", width: "100vw", height: "100vh", border: 0 }} />;
}
