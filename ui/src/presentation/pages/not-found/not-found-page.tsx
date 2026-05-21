import { Button } from "@/presentation/atoms/button";
import { RouteErrorState } from "@/presentation/organisms/route-error-state";
import { WorkspacePageTemplate } from "@/presentation/templates/workspace-page-template";

interface NotFoundPageProps {
  readonly primaryActionHref: string;
  readonly primaryActionLabel: string;
}

export function NotFoundPage({
  primaryActionHref,
  primaryActionLabel,
}: NotFoundPageProps) {
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
            <a href={primaryActionHref}>{primaryActionLabel}</a>
          </Button>
        </div>
      </div>
    </WorkspacePageTemplate>
  );
}
