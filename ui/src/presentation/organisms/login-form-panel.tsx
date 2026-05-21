import type { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";

import { Button } from "@/presentation/atoms/button";
import { Card } from "@/presentation/atoms/card";
import { Input } from "@/presentation/atoms/input";
import { FormField } from "@/presentation/molecules/form-field";
import type { LoginPageViewModel } from "@/interface-adapters/view-models/view-models";

interface LoginFormPanelProps {
  readonly viewModel: LoginPageViewModel;
}

export function LoginFormPanel({ viewModel }: LoginFormPanelProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
          />
        </FormField>

        <Button type="submit" className="mt-2">
          {viewModel.submitLabel}
        </Button>
      </form>
    </Card>
  );
}
