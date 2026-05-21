import type { HTMLAttributes } from "react";

import { cn } from "@/shared/lib/utils";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/70 bg-card/90 shadow-soft backdrop-blur",
        className
      )}
      {...props}
    />
  );
}
