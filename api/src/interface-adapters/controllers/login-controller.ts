import type { LoginCommand, LoginUseCase } from "@/application/use-cases/login-use-case";
import type {
  LoginHttpResponse,
  LoginPresenter,
} from "@/interface-adapters/presenters/login-presenter";

export class LoginController {
  public constructor(
    private readonly useCase: LoginUseCase,
    private readonly presenter: LoginPresenter
  ) {}

  public async handle(command: LoginCommand): Promise<LoginHttpResponse> {
    const result = await this.useCase.execute(command);
    return this.presenter.present(result);
  }
}
