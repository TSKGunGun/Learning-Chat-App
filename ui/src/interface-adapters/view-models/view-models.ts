export interface ChatChannelListItemViewModel {
  readonly channelId: string;
  readonly channelName: string;
  readonly lastMessagedAtLabel: string;
}

export interface ChatMessageViewModel {
  readonly id: string;
  readonly authorLabel: string;
  readonly body: string;
  readonly statusLabel: string;
  readonly feedbackAvailable: boolean;
}

export interface TopPageViewModel {
  readonly heading: string;
  readonly supportingText: string;
  readonly isMobileDrawerEnabled: boolean;
  readonly primaryActionLabel: string;
  readonly channels: ReadonlyArray<ChatChannelListItemViewModel>;
  readonly selectedChannelId: string;
  readonly selectedChannelName: string;
  readonly messages: ReadonlyArray<ChatMessageViewModel>;
}

export interface LoginPageViewModel {
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly usernamePlaceholder: string;
  readonly passwordPlaceholder: string;
  readonly helperText: string;
}
