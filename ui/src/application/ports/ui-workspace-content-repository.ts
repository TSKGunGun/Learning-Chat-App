export interface LoginPagePreview {
  readonly title: string;
  readonly description: string;
  readonly submitLabel: string;
  readonly usernamePlaceholder: string;
  readonly passwordPlaceholder: string;
  readonly helperText: string;
}

export interface UiWorkspaceContentRepository {
  getLoginPagePreview(): Promise<LoginPagePreview>;
}
