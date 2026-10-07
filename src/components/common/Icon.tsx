import type { ComponentType } from "react";

export function Icon({
  icon: IconComponent,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  className?: string;
}) {
  return <IconComponent className={className} />;
}
