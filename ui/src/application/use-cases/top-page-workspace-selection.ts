import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";

export type ChatSelection =
  | { readonly type: "new" }
  | { readonly type: "existing"; readonly channelId: string };

export const NEW_CHAT_SELECTION: ChatSelection = {
  type: "new",
};

const toTimestamp = (lastMessagedAt: string) => {
  const timestamp = Date.parse(lastMessagedAt);

  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
};

export const sortChatChannelsByRecency = (
  channels: ReadonlyArray<ChatChannelSummary>
): ReadonlyArray<ChatChannelSummary> =>
  [...channels].sort(
    (left, right) => toTimestamp(right.lastMessagedAt) - toTimestamp(left.lastMessagedAt)
  );

export const resolveInitialChatSelection = (
  channels: ReadonlyArray<ChatChannelSummary>
): ChatSelection => {
  const [firstChannel] = sortChatChannelsByRecency(channels);

  if (firstChannel === undefined) {
    return NEW_CHAT_SELECTION;
  }

  return {
    type: "existing",
    channelId: firstChannel.id,
  };
};

export const resolveChatSelectionAfterDelete = (
  channels: ReadonlyArray<ChatChannelSummary>,
  currentSelection: ChatSelection,
  deletedChannelId: string
): ChatSelection => {
  if (
    currentSelection.type === "existing" &&
    currentSelection.channelId !== deletedChannelId
  ) {
    return currentSelection;
  }

  return resolveInitialChatSelection(channels);
};
