import type { ReactNode } from "react";

interface WorkspacePageTemplateProps {
  readonly title: string;
  readonly summary: string;
  readonly children: ReactNode;
}

export function WorkspacePageTemplate({
  title,
  summary,
  children,
}: WorkspacePageTemplateProps) {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <header className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-secondary">
            ChatApp
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">{title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            {summary}
          </p>
        </header>
        {children}
      </section>
    </main>
  );
}
