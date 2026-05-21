import { Link } from "react-router-dom";

import { Button } from "@/components/atoms/button";
import { RouteErrorState } from "@/components/organisms/route-error-state";
import { WorkspacePageTemplate } from "@/components/templates/workspace-page-template";
import { ROUTES } from "@/shared/constants/routes";

export function NotFoundPage() {
  return (
    <WorkspacePageTemplate
      title="ページが見つかりません"
      summary="UI ワークスペースでは `/` と `/login` が最小ルートです。"
    >
      <div className="grid gap-4">
        <RouteErrorState
          title="404 Not Found"
          description="アクセスしたルートはまだ定義されていません。プレースホルダー画面から構成を確認できます。"
        />
        <div>
          <Button asChild>
            <Link to={ROUTES.top}>トップ画面へ戻る</Link>
          </Button>
        </div>
      </div>
    </WorkspacePageTemplate>
  );
}
