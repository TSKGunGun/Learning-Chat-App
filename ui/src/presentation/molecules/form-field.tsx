import type { ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

interface FormFieldProps {
  readonly label: string;
  readonly htmlFor: string;
  readonly hint?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function FormField({
  label,
  htmlFor,
  hint,
  children,
  className,
}: FormFieldProps) {
  return (
    <label className={cn("grid gap-2 text-sm", className)} htmlFor={htmlFor}>
      <span className="font-medium text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
