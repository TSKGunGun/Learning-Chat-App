import {
  Menu,
  MessageSquareText,
  PenSquare,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

import { Button } from "@/presentation/atoms/button";
import { Card } from "@/presentation/atoms/card";
import { Input } from "@/presentation/atoms/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/atoms/sheet";
import { SidebarChannelItem } from "@/presentation/molecules/sidebar-channel-item";
import type { TopPageViewModel } from "@/interface-adapters/view-models/view-models";

interface ChatWorkspacePreviewProps {
  readonly viewModel: TopPageViewModel;
  readonly isBusy: boolean;
  readonly onStartNewChat: () => void;
  readonly onSelectChat: (channelId: string) => void;
  readonly onDeleteChat: (channelId: string) => void;
  readonly onDrawerOpenChange: (open: boolean) => void;
}

interface SidebarContentProps {
  readonly viewModel: TopPageViewModel;
  readonly isBusy: boolean;
  readonly onStartNewChat: () => void;
  readonly onSelectChat: (channelId: string) => void;
  readonly onDeleteChat: (channelId: string) => void;
}

function SidebarContent({
  viewModel,
  isBusy,
  onStartNewChat,
  onSelectChat,
  onDeleteChat,
}: SidebarContentProps) {
  return (
    <Card className="p-5">
      <div className="mb-5">
        <p className="text-sm font-semibold">{viewModel.sidebar.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {viewModel.sidebar.description}
        </p>
      </div>

      <Button
        className="mb-4 w-full justify-start"
        type="button"
        onClick={onStartNewChat}
        disabled={isBusy}
      >
        <PenSquare className="h-4 w-4" aria-hidden="true" />
        {viewModel.sidebar.primaryActionLabel}
      </Button>

      <div className="grid gap-3">
        {viewModel.sidebar.channels.length > 0 ? (
          viewModel.sidebar.channels.map((channel) => (
            <SidebarChannelItem
              key={channel.channelId}
              channel={channel}
              onSelect={onSelectChat}
              onDelete={onDeleteChat}
              disabled={isBusy}
            />
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-border bg-white/50 px-4 py-6 text-sm text-muted-foreground">
            保存済みチャットはまだありません。
          </p>
        )}
      </div>
    </Card>
  );
}

function MessageComposer({
  inputPlaceholder,
  submitLabel,
  isInputDisabled,
  isSubmitDisabled,
}: {
  readonly inputPlaceholder: string;
  readonly submitLabel: string;
  readonly isInputDisabled: boolean;
  readonly isSubmitDisabled: boolean;
}) {
  return (
    <div className="mt-6 border-t border-border/80 pt-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          aria-label="メッセージ入力"
          placeholder={inputPlaceholder}
          disabled={isInputDisabled}
        />
        <Button type="button" disabled={isSubmitDisabled} className="sm:self-end">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function ChatWorkspacePreview({
  viewModel,
  isBusy,
  onStartNewChat,
  onSelectChat,
  onDeleteChat,
  onDrawerOpenChange,
}: ChatWorkspacePreviewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="hidden lg:sticky lg:top-10 lg:block lg:self-start">
        <SidebarContent
          viewModel={viewModel}
          isBusy={isBusy}
          onStartNewChat={onStartNewChat}
          onSelectChat={onSelectChat}
          onDeleteChat={onDeleteChat}
        />
      </div>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onDrawerOpenChange(true)}
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              {viewModel.mobileDrawer.openLabel}
            </Button>
            <Button type="button" onClick={onStartNewChat} disabled={isBusy}>
              <PenSquare className="h-4 w-4" aria-hidden="true" />
              新規チャット
            </Button>
          </div>
        </div>

        <div className="border-b border-border/80 pb-4">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-secondary">
            {viewModel.activePane.isDraft ? "New Chat" : "Active Chat"}
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            {viewModel.activePane.title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {viewModel.activePane.description}
          </p>
          {viewModel.activePane.isDraft ? (
            <span className="mt-4 inline-flex rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-foreground">
              未保存の新規チャット
            </span>
          ) : (
            <span className="mt-4 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              保存済みの会話
            </span>
          )}
        </div>

        {viewModel.activePane.messages.length > 0 ? (
          <div className="mt-5 grid gap-4">
            {viewModel.activePane.messages.map((message) => (
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
        ) : (
          <div className="mt-6 rounded-3xl border border-dashed border-border/80 bg-white/70 px-6 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary/10 text-secondary">
              <MessageSquareText className="h-6 w-6" aria-hidden="true" />
            </div>
            <p className="mt-4 text-base font-semibold">
              {viewModel.activePane.title}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {viewModel.activePane.emptyStateText}
            </p>
          </div>
        )}

        <MessageComposer
          inputPlaceholder={viewModel.activePane.composer.inputPlaceholder}
          submitLabel={viewModel.activePane.composer.submitLabel}
          isInputDisabled={viewModel.activePane.composer.isInputDisabled || isBusy}
          isSubmitDisabled={viewModel.activePane.composer.isSubmitDisabled || isBusy}
        />
      </Card>

      <Sheet
        open={viewModel.mobileDrawer.isDrawerOpen}
        onOpenChange={onDrawerOpenChange}
      >
        <SheetContent
          side="left"
          className="w-[88vw] max-w-sm border-r border-border/80 bg-background/95 p-4"
        >
          <SheetHeader className="pr-10">
            <SheetTitle>{viewModel.mobileDrawer.title}</SheetTitle>
            <SheetDescription>
              {viewModel.sidebar.description}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4">
            <SidebarContent
              viewModel={viewModel}
              isBusy={isBusy}
              onStartNewChat={onStartNewChat}
              onSelectChat={onSelectChat}
              onDeleteChat={onDeleteChat}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
