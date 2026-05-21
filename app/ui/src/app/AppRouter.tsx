import { BrowserRouter } from "react-router-dom";

import { AppRoutes } from "@/app/routes/AppRoutes";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
