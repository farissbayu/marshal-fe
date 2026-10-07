import type * as React from "react";
import { cn } from "@/lib/utils";

export const Input = ({
  className,
  type,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    type={type}
    className={cn(
      "flex h-9 w-full rounded-md border border-border-strong bg-surface-2 px-3 py-1 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

export const Textarea = ({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    className={cn(
      "flex min-h-20 w-full rounded-md border border-border-strong bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

export const Label = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label className={cn("text-xs font-medium text-fg-muted", className)} {...props} />
);
