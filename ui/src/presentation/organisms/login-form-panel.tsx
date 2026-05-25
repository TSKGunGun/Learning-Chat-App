import { useState, type ChangeEvent, type FormEvent } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/presentation/atoms/button";
import { Card } from "@/presentation/atoms/card";
import { Input } from "@/presentation/atoms/input";
import { FormField } from "@/presentation/molecules/form-field";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

export interface LoginFormValues {
  readonly username: string;
  readonly password: string;
}

interface LoginFormPanelProps {
  readonly viewModel: LoginPageViewModel;
  readonly isSubmitting?: boolean;
  readonly errorMessage?: string;
  readonly onSubmit?: (values: LoginFormValues) => void | Promise<void>;
}

function hasUsernameValue(username: string): boolean {
  return username.trim().length > 0;
}

function hasPasswordValue(password: string): boolean {
  return password.length > 0;
}

export function LoginFormPanel({
  viewModel,
  isSubmitting = false,
  errorMessage,
  onSubmit,
}: LoginFormPanelProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isSubmitDisabled =
    isSubmitting || !hasUsernameValue(username) || !hasPasswordValue(password);

  const handleUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value);
  };

  const handlePasswordChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitDisabled) {
      return;
    }

    const trimmedUsername = username.trim();

    await onSubmit?.({
      username: trimmedUsername,
      password,
    });
  };

  return (
    <Card className="w-full max-w-md p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="rounded-2xl bg-primary/10 p-3 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{viewModel.title}</h1>
          <p className="text-sm text-muted-foreground">{viewModel.description}</p>
        </div>
      </div>

      <form
        className="grid gap-4"
        aria-label="ログインフォーム"
        onSubmit={handleSubmit}
      >
        <FormField htmlFor="username" label="ユーザー名">
          <Input
            id="username"
            name="username"
            placeholder={viewModel.usernamePlaceholder}
            autoComplete="username"
            value={username}
            onChange={handleUsernameChange}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField
          htmlFor="password"
          label="パスワード"
          hint={viewModel.helperText}
        >
          <Input
            id="password"
            name="password"
            type="password"
            placeholder={viewModel.passwordPlaceholder}
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            disabled={isSubmitting}
          />
        </FormField>

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <Button type="submit" className="mt-2" disabled={isSubmitDisabled}>
          {isSubmitting ? "送信中..." : viewModel.submitLabel}
        </Button>
      </form>
    </Card>
  );
}
