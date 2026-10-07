import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { AssistanceOption } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/**
 * Renders exactly the options supplied by the backend. It never invents,
 * removes, reorders, or pre-selects an option — `value` starts as null in the
 * parent until the operator makes an explicit choice.
 */
export function OptionRadioGroup({
  options,
  value,
  onChange,
  disabled,
}: {
  options: AssistanceOption[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={onChange}
      disabled={disabled}
      className="space-y-2"
      aria-label="Opsi keputusan assistance"
    >
      {options.map((option) => (
        <label
          key={option.id}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors",
            value === option.id
              ? "border-primary/60 bg-primary/10"
              : "border-border bg-surface-2 hover:border-border-strong",
          )}
        >
          <RadioGroupItem value={option.id} id={`option-${option.id}`} className="mt-0.5" />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-fg">{option.label}</span>
              <span className="font-mono text-[11px] text-fg-subtle">{option.id}</span>
              <Badge
                variant={
                  option.risk === "high"
                    ? "danger"
                    : option.risk === "medium"
                      ? "warning"
                      : "success"
                }
              >
                Risiko {option.risk}
              </Badge>
            </span>
            <span className="mt-0.5 block text-xs text-fg-muted">
              {option.reason ?? "Tidak ada alasan ranking."}
            </span>
          </span>
        </label>
      ))}
    </RadioGroup>
  );
}
