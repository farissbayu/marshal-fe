import type {
  Actor,
  AssistanceCase,
  CarSummary,
  FlowEvent,
  FunctionalInspection,
  InspectionResult,
  Job,
  MapPoint,
  Media,
  Proposal,
  Release,
  Report,
  ReworkBay,
  ReworkTicket,
  Scenario,
  ScenarioDetail,
  TestRequest,
  Truck,
  VisualInspection,
  Zone,
} from "@/lib/schemas";
import { assistanceFixture } from "./fixtures/assistance";
import { carsFixture, trucksFixture } from "./fixtures/cars";
import { actors, mediaFixtures } from "./fixtures/common";
import {
  functionalInspectionsFixture,
  inspectionResultsFixture,
  visualInspectionsFixture,
} from "./fixtures/inspection";
import {
  releasesFixture,
  scenarioDetailsFixture,
  scenariosFixture,
  testRequestsFixture,
} from "./fixtures/lab";
import { proposalsFixture } from "./fixtures/proposals";
import { reportsFixture, reworkTicketsFixture } from "./fixtures/reports";
import { baysFixture, mapFixture, zonesFixture } from "./fixtures/yard";

export interface MockDb {
  now: number;
  actors: Actor[];
  actorId: string;
  cars: CarSummary[];
  trucks: Truck[];
  zones: Zone[];
  bays: ReworkBay[];
  map: MapPoint[];
  proposals: Proposal[];
  assistance: AssistanceCase[];
  inspectionResults: InspectionResult[];
  visual: Record<string, VisualInspection>;
  functional: Record<string, FunctionalInspection>;
  reports: Record<string, Report>;
  reworkTickets: ReworkTicket[];
  testRequests: TestRequest[];
  scenarios: Scenario[];
  scenarioDetails: Record<string, ScenarioDetail>;
  releases: Release[];
  media: Media[];
  jobs: Job[];
  jobPayloads: Record<string, Record<string, unknown>>;
  events: FlowEvent[];
  eventSeq: number;
  scenarioSeq: number;
  requestSeq: number;
  jobSeq: number;
}

export function createDb(): MockDb {
  const now = Date.now();
  return {
    now,
    actors: actors(),
    actorId: "user-supervisor-01",
    cars: carsFixture(now),
    trucks: trucksFixture(now),
    zones: zonesFixture(),
    bays: baysFixture(),
    map: mapFixture(),
    proposals: proposalsFixture(now),
    assistance: assistanceFixture(now),
    inspectionResults: inspectionResultsFixture(now),
    visual: visualInspectionsFixture(now),
    functional: functionalInspectionsFixture(now),
    reports: reportsFixture(now),
    reworkTickets: reworkTicketsFixture(now),
    testRequests: testRequestsFixture(now),
    scenarios: scenariosFixture(now),
    scenarioDetails: scenarioDetailsFixture(now),
    releases: releasesFixture(now),
    media: mediaFixtures(),
    jobs: [],
    jobPayloads: {},
    events: [],
    eventSeq: 0,
    scenarioSeq: 5,
    requestSeq: 3,
    jobSeq: 0,
  };
}

export let db: MockDb = createDb();

export function resetDb() {
  db = createDb();
}

export function currentActor(): Actor {
  return db.actors.find((a) => a.actor_id === db.actorId) ?? db.actors[0];
}
