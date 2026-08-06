import React from "react";
import { createRoot } from "react-dom/client";
import { BatteryDashboard } from "../../app/BatteryDashboard";
import { Workbench } from "../../app/Workbench";
import { Sheet1Matrix } from "../../app/Sheet1Matrix";
import "../../app/globals.css";

const isSheet1 = window.location.pathname.replace(/\/+$/, "").endsWith("/sheet1");

const isExports = window.location.pathname.replace(/\/+$/, "").endsWith("/exports");
createRoot(document.getElementById("root")!).render(<React.StrictMode>{isSheet1 ? <Sheet1Matrix /> : isExports ? <BatteryDashboard /> : <Workbench />}</React.StrictMode>);
