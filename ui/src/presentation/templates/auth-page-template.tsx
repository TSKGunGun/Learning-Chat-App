import type { ReactNode } from "react";

interface AuthPageTemplateProps {
  readonly eyebrow: string;
  readonly children: ReactNode;
}

export function AuthPageTemplate({
  eyebrow,
  children,
}: AuthPageTemplateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-secondary">
            {eyebrow}
          </p>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight sm:text-5xl">
            ChatApp
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">
            アカウントにログインして、会話を続けましょう。
          </p>
        </div>
        <div className="flex items-center justify-center">{children}</div>
      </section>
    </main>
  );
}
