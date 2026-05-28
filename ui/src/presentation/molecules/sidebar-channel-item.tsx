import type { MouseEvent } from "react";
import { MessageSquare, Trash2 } from "lucide-react";

import { Button } from "@/presentation/atoms/button";
import { Card } from "@/presentation/atoms/card";
import type { ChatChannelListItemViewModel } from "@/interface-adapters/view-models/view-models";
import { cn } from "@/shared/lib/utils";

interface SidebarChannelItemProps {
  readonly channel: ChatChannelListItemViewModel;
  readonly disabled?: boolean;
  readonly onSelect: (channelId: string) => void;
  readonly onDelete: (channelId: string) => void;
}

export function SidebarChannelItem({
  channel,
  disabled = false,
  onSelect,
  onDelete,
}: SidebarChannelItemProps) {
  const handleDeleteClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onDelete(channel.channelId);
  };

  return (
    <Card
      className={cn(
        "rounded-2xl border p-2",
        channel.isSelected ? "border-primary/40 bg-primary/5" : "bg-white/70"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-3 rounded-[1.15rem] px-3 py-2 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          onClick={() => onSelect(channel.channelId)}
          disabled={disabled}
        >
          <span className="rounded-xl bg-accent/20 p-2 text-accent-foreground">
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {channel.channelName}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">
              {channel.lastMessagedAtLabel}
            </span>
          </span>
        </button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-1 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label={channel.deleteLabel}
          disabled={disabled}
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
