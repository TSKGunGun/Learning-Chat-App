import { LoaderCircle } from "lucide-react";

import { Card } from "@/components/atoms/card";

interface RouteLoadingStateProps {
  readonly title: string;
  readonly description: string;
}

export function RouteLoadingState({
  title,
  description,
}: RouteLoadingStateProps) {
  return (
    <Card className="w-full max-w-2xl p-8">
      <div className="flex items-start gap-4">
        <span className="rounded-2xl bg-primary/10 p-3 text-primary">
          <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
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
