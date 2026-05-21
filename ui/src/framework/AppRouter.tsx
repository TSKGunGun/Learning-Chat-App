import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/framework/routes/AppRoutes";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
