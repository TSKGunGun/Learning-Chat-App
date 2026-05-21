import { Route, Routes } from "react-router-dom";

import { LoginRoute } from "@/framework/routes/LoginRoute";
import { NotFoundRoute } from "@/framework/routes/NotFoundRoute";
import { TopRoute } from "@/framework/routes/TopRoute";
import { ROUTES } from "@/shared/constants/routes";

export function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.top} element={<TopRoute />} />
      <Route path={ROUTES.login} element={<LoginRoute />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  );
}
