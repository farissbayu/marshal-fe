import type { PlantAssist } from "@/lib/schemas";
import { fail, type MockHandler } from "./helpers";

function sampleCase(): PlantAssist {
  return {
    case_id: "AC-MOCK",
    vin: "VIN-P8",
    location: "lane_b",
    situation:
      "VIN-P8 stopped behind a forklift in lane B; a worker is at the pallet, 3 m from the lane.",
    status: "OPEN",
    recommended: "wait_for_removal",
    confidence: 0.82,
    options: [
      { id: "wait_for_removal", rank: 1, risk: "low", reason: "a person is in view" },
      { id: "pass_left_3kmh", rank: 2, risk: "medium", reason: "the lane beside is clear" },
      { id: "reroute_lane_c", rank: 3, risk: "high", reason: "adds about 90 s" },
    ],
  };
}

let assist: PlantAssist | null = sampleCase();
let spawns = 0;
let cars = 11;

export const getPlantState: MockHandler = () => ({
  running: true,
  speed: 8,
  assist,
  cars: Array.from({ length: cars }, (_, i) => ({
    vin: `VIN-P${i + 1}`,
    state: i % 3 === 0 ? "yard" : "driving",
    location: i % 3 === 0 ? `yard.Y${(i % 8) + 1}` : "finishing",
  })),
  kpis: { cars_in_yard: Math.ceil(cars / 3), cars_shipped: 4 },
});

export const plantSpawn: MockHandler = () => {
  spawns += 1;
  cars += 1;
  return { vin: `VIN-P${cars + spawns}` };
};

export const plantException: MockHandler = () => {
  assist = sampleCase();
  return assist;
};

export const plantRestart: MockHandler = () => {
  assist = null;
  cars = 11;
  return { restarted: true };
};

export const plantDecide: MockHandler = (req) => {
  const option = String(req.body.option ?? "");
  if (!assist) fail(404, "no open case", "case_not_found");
  if (!assist.options.some((o) => o.id === option)) {
    fail(422, `option ${option} was not offered`, "option_not_offered");
  }
  const decided: PlantAssist = { ...assist, status: "RESOLVED", choice: option };
  assist = null;
  return decided;
};
