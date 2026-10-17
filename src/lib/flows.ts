export const FLOWS = [
  {
    id: 1,
    code: "F1",
    short: "Yard",
    label: "Yard traffic",
    description: "Vehicle movement & mission status",
  },
  {
    id: 2,
    code: "F2",
    short: "Assistance",
    label: "Assistance desk",
    description: "Emergency assistance requests & recommendations",
  },
  {
    id: 3,
    code: "F3",
    short: "Visual Gate",
    label: "Visual inspector",
    description: "Gate cameras & visual findings",
  },
  {
    id: 4,
    code: "F4",
    short: "Functional",
    label: "Functional check",
    description: "Track tests & functional cameras",
  },
  {
    id: 5,
    code: "F5",
    short: "Quality",
    label: "Report & rework",
    description: "Inspection verdict & rework allocation",
  },
  {
    id: 6,
    code: "F6",
    short: "Scenario Lab",
    label: "Scenario generator",
    description: "Test scenario requests & conversion",
  },
  {
    id: 7,
    code: "F7",
    short: "Adversarial",
    label: "Adversarial tester",
    description: "Adversarial & regression test execution",
  },
] as const;

export type FlowMeta = (typeof FLOWS)[number];

export function flowMeta(flow: number): FlowMeta {
  return FLOWS.find((f) => f.id === flow) ?? FLOWS[0];
}

export const FLOW_COLORS: Record<number, string> = {
  1: "border-sky-500/40 bg-sky-500/15 text-sky-300",
  2: "border-rose-500/40 bg-rose-500/15 text-rose-300",
  3: "border-violet-500/40 bg-violet-500/15 text-violet-300",
  4: "border-teal-500/40 bg-teal-500/15 text-teal-300",
  5: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  6: "border-amber-500/40 bg-amber-500/15 text-amber-300",
  7: "border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-300",
};
