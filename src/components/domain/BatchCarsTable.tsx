import type { BatchCar } from "@/lib/schemas";

const EXPECTED: Record<string, string> = {
  clean: "Clean",
  wrong_colour: "Wrong colour",
  dead_lamp: "Dead lamp",
  incident: "Box + worker incident",
};

function verdictClass(verdict: string | null | undefined) {
  if (verdict === "PASS") return "text-success";
  if (verdict === "FAIL") return "text-danger";
  if (verdict === "REVIEW") return "text-warning";
  return "text-fg-subtle";
}

export function BatchCarsTable({ cars }: { cars: BatchCar[] }) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[680px] text-left text-xs">
        <thead className="bg-surface-2 text-[10px] uppercase tracking-wide text-fg-subtle">
          <tr>
            {["VIN", "Expected", "State", "Stage", "Gate", "Report", "Slot / truck"].map((name) => (
              <th key={name} className="px-3 py-2 font-medium">
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cars.map((car) => {
            const expected = String(car.expected.kind ?? "unknown");
            const fault = car.expected.fault_step ? ` · ${String(car.expected.fault_step)}` : "";
            return (
              <tr key={car.vin} className="border-t border-border">
                <td className="px-3 py-2 font-mono text-fg">{car.vin}</td>
                <td className="px-3 py-2 text-fg-muted">
                  {EXPECTED[expected] ?? expected}
                  {fault}
                </td>
                <td className="px-3 py-2 text-fg-muted">{car.state.replaceAll("_", " ")}</td>
                <td className="px-3 py-2 text-fg-muted">Flow {car.stage}</td>
                <td className={`px-3 py-2 font-mono ${verdictClass(car.gate_verdict)}`}>
                  {car.gate_verdict ?? "—"}
                </td>
                <td className={`px-3 py-2 font-mono ${verdictClass(car.report_verdict)}`}>
                  {car.report_verdict ?? "—"}
                </td>
                <td className="px-3 py-2 text-fg-muted">{car.slot ?? car.truck_id ?? "—"}</td>
              </tr>
            );
          })}
          {cars.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-4 text-center text-fg-subtle">
                Waiting for cars…
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
