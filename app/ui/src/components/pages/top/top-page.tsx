import { ChatWorkspacePreview } from "@/components/organisms/chat-workspace-preview";
import { WorkspacePageTemplate } from "@/components/templates/workspace-page-template";
import type { TopPageViewModel } from "@/shared/types/view-models";

interface TopPageProps {
  readonly viewModel: TopPageViewModel;
}

export function TopPage({ viewModel }: TopPageProps) {
  return (
    <WorkspacePageTemplate
      title={viewModel.heading}
      summary={viewModel.supportingText}
    >
      <ChatWorkspacePreview viewModel={viewModel} />
    </WorkspacePageTemplate>
  );
}
