import { NotFoundPage } from "@/presentation/pages/not-found/not-found-page";
import { ROUTES } from "@/framework/routes/routes";

export function NotFoundRoute() {
  return (
    <NotFoundPage
      primaryActionHref={ROUTES.top}
      primaryActionLabel="トップ画面へ戻る"
    />
  );
}
