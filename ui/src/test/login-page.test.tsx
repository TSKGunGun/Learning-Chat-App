import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginPage } from "@/presentation/pages/login/login-page";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

const loginPageViewModel: LoginPageViewModel = {
  title: "ログイン",
  description: "ユーザー名とパスワードを入力してログインしてください。",
  submitLabel: "ログインする",
  usernamePlaceholder: "ユーザー名を入力",
  passwordPlaceholder: "パスワードを入力",
  helperText: "登録済みのアカウント情報を入力してください。",
};

function renderLoginPage(
  onSubmit?: (values: { username: string; password: string }) => Promise<void> | void
) {
  render(<LoginPage viewModel={loginPageViewModel} onSubmit={onSubmit} />);
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LoginPage", () => {
  it("keeps the submit button disabled until both fields are filled", async () => {
    const user = userEvent.setup();

    renderLoginPage();

    const submitButton = screen.getByRole("button", { name: "ログインする" });
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/ユーザー名/), "demo-user");
    expect(submitButton).toBeDisabled();

    await user.type(screen.getByLabelText(/パスワード/), "secret");
    expect(submitButton).toBeEnabled();
  });

  it("invokes the submit callback with the entered credentials", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockResolvedValue(undefined);

    renderLoginPage(handleSubmit);

    await user.type(screen.getByLabelText(/ユーザー名/), "demo-user");
    await user.type(screen.getByLabelText(/パスワード/), "secret");
    await user.click(screen.getByRole("button", { name: "ログインする" }));

    expect(handleSubmit).toHaveBeenCalledTimes(1);
    expect(handleSubmit).toHaveBeenCalledWith({
      username: "demo-user",
      password: "secret",
    });
  });

  it("shows a submitting state while the async callback is pending", async () => {
    const user = userEvent.setup();
    let resolveSubmit: (() => void) | undefined;
    const handleSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        })
    );

    renderLoginPage(handleSubmit);

    await user.type(screen.getByLabelText(/ユーザー名/), "demo-user");
    await user.type(screen.getByLabelText(/パスワード/), "secret");
    await user.click(screen.getByRole("button", { name: "ログインする" }));

    expect(screen.getByRole("button", { name: "送信中..." })).toBeDisabled();
    expect(screen.getByLabelText(/ユーザー名/)).toBeDisabled();
    expect(screen.getByLabelText(/パスワード/)).toBeDisabled();

    resolveSubmit?.();

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: loginPageViewModel.submitLabel })
      ).toBeEnabled();
    });
  });

  it("shows an error message when the async callback rejects", async () => {
    const user = userEvent.setup();
    const handleSubmit = vi.fn().mockRejectedValue(new Error("invalid credentials"));

    renderLoginPage(handleSubmit);

    await user.type(screen.getByLabelText(/ユーザー名/), "demo-user");
    await user.type(screen.getByLabelText(/パスワード/), "secret");
    await user.click(screen.getByRole("button", { name: "ログインする" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "invalid credentials"
    );
    expect(screen.getByRole("button", { name: loginPageViewModel.submitLabel })).toBeEnabled();
  });
});
