import React from "react";
import ReactDOM from "react-dom/client";

import { AppRouter } from "@/app/AppRouter";
import "@/styles/globals.css";

const rootElement = document.getElementById("root");

if (rootElement === null) {
  throw new Error("Root element '#root' was not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
);
