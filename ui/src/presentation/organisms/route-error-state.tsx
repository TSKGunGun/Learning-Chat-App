import { AlertTriangle } from "lucide-react";

import { Card } from "@/presentation/atoms/card";

interface RouteErrorStateProps {
  readonly title: string;
  readonly description: string;
}

export function RouteErrorState({
  title,
  description,
}: RouteErrorStateProps) {
  return (
    <Card className="w-full max-w-2xl p-8">
      <div className="flex items-start gap-4">
        <span className="rounded-2xl bg-accent/20 p-3 text-accent-foreground">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </Card>
  );
}
