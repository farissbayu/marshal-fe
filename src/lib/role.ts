import type { Role } from "@/lib/schemas";

const LABELS: Record<Role, string> = {
  supervisor: "Supervisor",
  inspector: "Inspector",
  worker: "Worker",
  engineer: "Engineer",
};

export function roleLabel(role: Role): string {
  return LABELS[role] ?? role;
}
