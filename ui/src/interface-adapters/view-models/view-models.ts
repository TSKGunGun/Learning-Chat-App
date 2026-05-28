export interface ChatChannelListItemViewModel {
  readonly channelId: string;
  readonly channelName: string;
  readonly lastMessagedAtLabel: string;
  readonly isSelected: boolean;
  readonly deleteLabel: string;
}

export interface ChatMessageViewModel {
  readonly id: string;
  readonly authorLabel: string;
  readonly body: string;
  readonly statusLabel: string;
  readonly feedbackAvailable: boolean;
}

export interface TopPageSidebarViewModel {
  readonly title: string;
  readonly description: string;
  readonly primaryActionLabel: string;
  readonly channels: ReadonlyArray<ChatChannelListItemViewModel>;
}

export interface TopPageComposerViewModel {
  readonly inputPlaceholder: string;
  readonly submitLabel: string;
  readonly isInputDisabled: boolean;
  readonly isSubmitDisabled: boolean;
}

export interface TopPageActivePaneViewModel {
  readonly title: string;
  readonly description: string;
  readonly isDraft: boolean;
  readonly emptyStateText: string;
  readonly messages: ReadonlyArray<ChatMessageViewModel>;
  readonly composer: TopPageComposerViewModel;
}

export interface TopPageMobileDrawerViewModel {
  readonly canOpenDrawer: boolean;
  readonly isDrawerOpen: boolean;
  readonly openLabel: string;
  readonly closeLabel: string;
  readonly title: string;
}

export interface TopPageViewModel {
  readonly heading: string;
  readonly supportingText: string;
  readonly sidebar: TopPageSidebarViewModel;
  readonly activePane: TopPageActivePaneViewModel;
  readonly mobileDrawer: TopPageMobileDrawerViewModel;
}

export interface LoginPageViewModel {
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly usernamePlaceholder: string;
  readonly passwordPlaceholder: string;
  readonly helperText: string;
}
