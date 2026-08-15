import { sitePath } from "../site-path";

export const dynamic = "force-static";

export default function InstallationPage() {
  return (
    <iframe
      title="东吴电新电动车装机数据库"
      src={sitePath("/installation-frame/")}
      style={{ display: "block", width: "100vw", height: "100vh", border: 0 }}
    />
  );
}
