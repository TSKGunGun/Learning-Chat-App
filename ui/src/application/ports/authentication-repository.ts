export interface LoginCommand {
  readonly username: string;
  readonly password: string;
}

export interface AuthenticationRepository {
  login(command: LoginCommand): Promise<void>;
  ensureAuthenticated(): Promise<void>;
}
