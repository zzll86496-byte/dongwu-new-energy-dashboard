"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import VehicleSupplyDashboard from "./VehicleSupplyDashboard";
import dashboardCss from "./vehicle-supply.css?raw";
import templateCss from "./research-template.css?raw";

const hostCss = `
  :host {
    display: block;
    min-height: 100vh;
    background: #edf1f3;
    color: #182735;
    font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif;
    font-size: 14px;
  }
`;

export default function VehicleSupplyFramePage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadowRoot.replaceChildren();

    const style = document.createElement("style");
    style.textContent = hostCss + dashboardCss + templateCss;

    const mount = document.createElement("div");
    shadowRoot.append(style, mount);
    setMountNode(mount);

    return () => {
      shadowRoot.replaceChildren();
    };
  }, []);

  return (
    <div ref={hostRef} style={{ display: "block", minHeight: "100vh" }}>
      {mountNode ? createPortal(<VehicleSupplyDashboard />, mountNode) : null}
    </div>
  );
}
