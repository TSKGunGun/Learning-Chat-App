import { MessageSquare } from "lucide-react";

import { Card } from "@/presentation/atoms/card";
import { cn } from "@/shared/lib/utils";
import type { ChatChannelListItemViewModel } from "@/interface-adapters/view-models/view-models";

interface SidebarChannelItemProps {
  readonly channel: ChatChannelListItemViewModel;
  readonly isSelected?: boolean;
}

export function SidebarChannelItem({
  channel,
  isSelected = false,
}: SidebarChannelItemProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border p-4",
        isSelected ? "border-primary/40 bg-primary/5" : "bg-white/70"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-accent/20 p-2 text-accent-foreground">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{channel.channelName}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {channel.lastMessagedAtLabel}
          </p>
        </div>
      </div>
    </Card>
  );
}
