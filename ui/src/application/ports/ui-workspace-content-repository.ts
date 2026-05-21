import type { ChatChannelSummary } from "@/entities/chat/chat-channel-summary";
import type { ChatMessage } from "@/entities/chat/chat-message";

export interface TopPagePreview {
  readonly heading: string;
  readonly supportingText: string;
  readonly primaryActionLabel: string;
  readonly channels: ReadonlyArray<ChatChannelSummary>;
  readonly selectedChannelName: string;
  readonly messages: ReadonlyArray<ChatMessage>;
}

export interface LoginPagePreview {
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly usernamePlaceholder: string;
  readonly passwordPlaceholder: string;
  readonly helperText: string;
}

export interface UiWorkspaceContentRepository {
  getTopPagePreview(): Promise<TopPagePreview>;
  getLoginPagePreview(): Promise<LoginPagePreview>;
}
