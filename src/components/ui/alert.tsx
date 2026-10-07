import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type * as React from "react";
import { cn } from "@/lib/utils";

const alertVariants = cva("flex gap-3 rounded-md border p-3 text-sm", {
  variants: {
    variant: {
      default: "border-border-strong bg-surface-2 text-fg-muted",
      info: "border-info/40 bg-info/10 text-fg",
      success: "border-success/40 bg-success/10 text-fg",
      warning: "border-warning/40 bg-warning/10 text-fg",
      danger: "border-danger/40 bg-danger/10 text-fg",
    },
  },
  defaultVariants: { variant: "default" },
});

const icons = {
  default: Info,
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: XCircle,
} as const;

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  icon?: boolean;
}

export function Alert({
  className,
  variant = "default",
  icon = true,
  children,
  ...props
}: AlertProps) {
  const Icon = icons[variant ?? "default"];
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props}>
      {icon && <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("font-medium text-fg", className)} {...props} />;
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-xs text-fg-muted", className)} {...props} />;
}
