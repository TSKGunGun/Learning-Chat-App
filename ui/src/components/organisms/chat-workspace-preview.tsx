import { Menu, PenSquare, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/atoms/button";
import { Card } from "@/components/atoms/card";
import { SidebarChannelItem } from "@/components/molecules/sidebar-channel-item";
import type { TopPageViewModel } from "@/shared/types/view-models";

interface ChatWorkspacePreviewProps {
  readonly viewModel: TopPageViewModel;
}

export function ChatWorkspacePreview({
  viewModel,
}: ChatWorkspacePreviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="p-5">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">{viewModel.heading}</p>
            <p className="text-xs text-muted-foreground">チャット一覧の雛形</p>
          </div>
          {viewModel.isMobileDrawerEnabled ? (
            <span
              className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
              aria-label="モバイルドロワー対応"
            >
              <Menu className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
              Mobile
            </span>
          ) : null}
        </div>

        <Button className="mb-4 w-full justify-start">
          <PenSquare className="h-4 w-4" aria-hidden="true" />
          {viewModel.primaryActionLabel}
        </Button>

        <div className="grid gap-3">
          {viewModel.channels.map((channel) => (
            <SidebarChannelItem
              key={channel.channelId}
              channel={channel}
              isSelected={channel.channelId === viewModel.selectedChannelId}
            />
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="border-b border-border/80 pb-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-secondary">
            Active Channel
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {viewModel.selectedChannelName}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {viewModel.supportingText}
          </p>
        </div>

        <div className="mt-5 grid gap-4">
          {viewModel.messages.map((message) => (
            <article
              key={message.id}
              className="rounded-2xl border border-border/80 bg-white/80 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">{message.authorLabel}</p>
                <span className="text-xs text-muted-foreground">
                  {message.statusLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6">{message.body}</p>
              {message.feedbackAvailable ? (
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" type="button">
                    <ThumbsUp className="h-4 w-4" aria-hidden="true" />
                    Good
                  </Button>
                  <Button variant="outline" size="sm" type="button">
                    <ThumbsDown className="h-4 w-4" aria-hidden="true" />
                    Bad
                  </Button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
