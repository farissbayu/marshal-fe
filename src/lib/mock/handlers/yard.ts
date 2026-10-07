import type { CarDetail, CarSummary, MapPoint, Truck, Yard, Zone } from "@/lib/schemas";
import { carDetailFixture } from "../fixtures/cars";
import { fail, type MockRequest, paginate, strQuery } from "./helpers";

export function getYard(req: MockRequest): Yard {
  const { db } = req;
  const exception = db.cars.filter((c) => c.state === "exception").length;
  const held = db.cars.filter((c) => c.state === "held").length;
  const zonesClosed = db.zones.filter((z) => z.closed).length;
  return {
    plant: "Plant 01 · Pasuruan",
    updated_at: new Date().toISOString(),
    summary: { total: db.cars.length, exception, held, zones_closed: zonesClosed },
    cars: db.cars,
    trucks: db.trucks,
    zones: db.zones,
    bays: db.bays,
  };
}

export function getCars(req: MockRequest) {
  const { query, db } = req;
  const q = strQuery(query.q)?.toLowerCase();
  const state = strQuery(query.state);
  const location = strQuery(query.location);
  const truck = strQuery(query.truck);
  const flags = strQuery(query.flags);

  let items = db.cars.slice();
  if (q)
    items = items.filter(
      (c) => c.vin.toLowerCase().includes(q) || (c.model ?? "").toLowerCase().includes(q),
    );
  if (state) items = items.filter((c) => c.state === state);
  if (location) items = items.filter((c) => c.location === location);
  if (truck) items = items.filter((c) => c.truck_id === truck);
  if (flags) items = items.filter((c) => flags.split(",").every((f) => c.flags.includes(f)));

  const sort = strQuery(query.sort);
  if (sort === "vin") items.sort((a, b) => a.vin.localeCompare(b.vin));
  else if (sort === "updated") items.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));

  return paginate(items, query);
}

export function getCar(req: MockRequest): CarDetail {
  const { db } = req;
  const vin = req.params.vin;
  const car = db.cars.find((c) => c.vin === vin);
  if (!car) fail(404, `Kendaraan ${vin} tidak ditemukan.`, "car_not_found");
  return carDetailFixture(car, db.now);
}

export function getMap(req: MockRequest): { points: MapPoint[] } {
  return { points: req.db.map };
}

function findCar(req: MockRequest): CarSummary {
  const car = req.db.cars.find((c) => c.vin === req.params.vin);
  if (!car) fail(404, `Kendaraan ${req.params.vin} tidak ditemukan.`, "car_not_found");
  return car;
}

export function sendMission(req: MockRequest) {
  const car = findCar(req);
  const destination = strQuery(req.body.destination);
  const reason = strQuery(req.body.reason);
  if (!destination) fail(422, "Tujuan misi wajib diisi.", "validation_error");
  if (car.state === "held")
    fail(409, "Kendaraan sedang di-hold. Resume terlebih dahulu.", "car_held");
  car.mission = `MISSION-${destination.toUpperCase()}`;
  car.state = "driving";
  car.updated_at = new Date().toISOString();
  return {
    vin: car.vin,
    mission: car.mission,
    status: car.state,
    destination,
    reason: reason ?? null,
  };
}

export function holdCar(req: MockRequest) {
  const car = findCar(req);
  const reason = strQuery(req.body.reason);
  if (!reason) fail(422, "Alasan hold wajib diisi.", "validation_error");
  if (car.state === "held") fail(409, "Kendaraan sudah dalam status held.", "already_held");
  car.state = "held";
  if (!car.flags.includes("held")) car.flags.push("held");
  car.updated_at = new Date().toISOString();
  return { vin: car.vin, status: car.state, reason };
}

export function resumeCar(req: MockRequest) {
  const car = findCar(req);
  if (car.state !== "held") fail(409, "Kendaraan tidak sedang di-hold.", "not_held");
  car.state = "waiting_dispatch";
  car.flags = car.flags.filter((f) => f !== "held");
  car.updated_at = new Date().toISOString();
  return { vin: car.vin, status: car.state, mission: car.mission };
}

export function updateTruckEta(req: MockRequest) {
  const { db } = req;
  const truck = db.trucks.find((t) => t.truck_id === req.params.truck_id);
  if (!truck) fail(404, `Truck ${req.params.truck_id} tidak ditemukan.`, "truck_not_found");
  const actualEta = strQuery(req.body.eta);
  if (!actualEta) fail(422, "ETA aktual wajib diisi.", "validation_error");
  const scheduled = truck.scheduled_eta ? new Date(truck.scheduled_eta).getTime() : null;
  const actual = new Date(actualEta).getTime();
  if (Number.isNaN(actual)) fail(422, "Format ETA tidak valid.", "validation_error");
  truck.actual_eta = new Date(actual).toISOString();
  truck.delay_minutes = scheduled ? Math.round((actual - scheduled) / 60000) : 0;
  return {
    truck_id: truck.truck_id,
    actual_eta: truck.actual_eta,
    scheduled_eta: truck.scheduled_eta ?? null,
    delay_minutes: truck.delay_minutes,
    reason: strQuery(req.body.reason) ?? null,
  };
}

export function loadTruck(req: MockRequest) {
  const { db } = req;
  const truck = db.trucks.find((t) => t.truck_id === req.params.truck_id);
  if (!truck) fail(404, `Truck ${req.params.truck_id} tidak ditemukan.`, "truck_not_found");
  const loaded: string[] = [];
  const rejected: Array<{ vin: string; reason: string }> = [];
  for (const vin of truck.assigned_vins) {
    const car = db.cars.find((c) => c.vin === vin);
    if (!car) {
      rejected.push({ vin, reason: "not_found" });
      continue;
    }
    if (car.state === "ready" || car.state === "waiting_dispatch" || car.state === "parked") {
      car.state = "ready";
      car.location = "GATE-OUT";
      car.updated_at = new Date().toISOString();
      loaded.push(vin);
    } else {
      rejected.push({ vin, reason: `state_${car.state}` });
    }
  }
  if (loaded.length === 0 && rejected.length > 0) {
    fail(409, "Tidak ada kendaraan yang memenuhi syarat untuk dimuat.", "load_blocked");
  }
  return { truck_id: truck.truck_id, loaded, rejected };
}

export function setZoneClosure(req: MockRequest): Zone {
  const { db } = req;
  const zone = db.zones.find((z) => z.zone === req.params.zone);
  if (!zone) fail(404, `Zone ${req.params.zone} tidak ditemukan.`, "zone_not_found");
  if (typeof req.body.closed !== "boolean")
    fail(422, "Field 'closed' wajib boolean.", "validation_error");
  zone.closed = req.body.closed;
  zone.reason = strQuery(req.body.reason) ?? null;
  return zone;
}

export function getReworkBays(req: MockRequest) {
  return { items: req.db.bays };
}

export function getTruckById(req: MockRequest): Truck {
  const truck = req.db.trucks.find((t) => t.truck_id === req.params.truck_id);
  if (!truck) fail(404, `Truck ${req.params.truck_id} tidak ditemukan.`, "truck_not_found");
  return truck;
}
