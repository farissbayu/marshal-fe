import * as THREE from "three";

export type FlowId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type CameraPreset =
  | "CAM-LINE-04"
  | "CAM-GATE-01"
  | "CAM-ASSIST-02"
  | "CAM-TRACK-03"
  | "CAM-REWORK-05"
  | "CAM-LAB-06"
  | "CAM-ADVERSARIAL-07"
  | "CAM-YARD-02";

export interface CameraPresetConfig {
  name: CameraPreset;
  flowId: FlowId;
  label: string;
  location: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface Flow1Telemetry {
  flow: 1;
  name: "Yard Traffic Controller";
  leadingVin: string;
  leadingSpeedKmh: number;
  leadingStatus: "CRUISING_TO_YARD" | "GATE_INSPECTION";
  trailingVin: string;
  trailingSpeedKmh: number;
  trailingStatus: "HOLDING_AT_LINE_END" | "RELEASED_HEADWAY_OK";
  headwayM: number;
  headwayTargetM: number;
  headwayRuleMet: boolean;
  lineEndStatus: "DISPATCHING" | "HOLDING";
  gateQueueCount: number;
  activeTruck: {
    truckId: string;
    status: string;
    stagedCars: number;
    capacity: number;
  };
}

export interface Flow2Telemetry {
  flow: 2;
  name: "Remote Assistance Desk";
  caseId: string;
  vin: string;
  stoppedDistanceM: number;
  obstacleType: string;
  workerDistanceM: number;
  workerNearby: boolean;
  options: Array<{
    id: "WAIT_OPERATOR" | "BYPASS_LEFT" | "REROUTE_C";
    label: string;
    recommended: boolean;
    reason: string;
  }>;
  status: "WAITING_HUMAN_OPERATOR" | "RESOLVED";
  timeoutRemainingS: number;
}

export interface Flow3Telemetry {
  flow: 3;
  name: "Drive-Through Visual Inspection";
  vin: string;
  speedKmh: number;
  gateCameras: Array<{ id: "front" | "rear" | "left" | "right"; status: "STREAMING" }>;
  zonesChecked: number;
  totalZones: 8;
  findings: Array<{
    zone: string;
    defect: string;
    confidence: number;
    status: "REVIEW" | "FAIL";
  }>;
  buildSheetMismatch: string | null;
  overallVerdict: "REVIEW" | "PASS" | "FAIL";
}

export interface Flow4Telemetry {
  flow: 4;
  name: "Functional Check on Test Track";
  vin: string;
  routineId: string;
  currentStep: number;
  totalSteps: number;
  currentAction: string;
  telemetryStatus: string;
  cameraStatus: string;
  disagreementFound: boolean;
  disagreementItem: string;
  lightStates: {
    headlights: boolean;
    indicators: boolean;
    brakeLights: { right: boolean; left: boolean };
  };
}

export interface Flow5Telemetry {
  flow: 5;
  name: "Inspection Report & Rework Routing";
  vin: string;
  ticketId: string;
  routeToBay: "BAY-PAINT" | "BAY-BODY" | "BAY-ELEC" | "BAY-MECH" | "BAY-HOLD";
  estimatedMinutes: number;
  baysStatus: Record<string, { queue: number; max: number; desc: string }>;
  reinspectionPolicy: "FAILED_ITEMS_ONLY";
  supervisorConfirmed: boolean;
}

export interface Flow6Telemetry {
  flow: 6;
  name: "Scenario Generator (Test Lab)";
  scenarioId: string;
  prompt: string;
  timeOfDay: "dusk" | "day" | "night";
  mapZone: "finishing_corner";
  actors: Array<{ type: string; position: string }>;
  passCriteria: string[];
  compilationStatus: "VALID_SPEC" | "COMPILING" | "READY_FOR_CARLA";
}

export interface Flow7Telemetry {
  flow: 7;
  name: "Adversarial Test Agent";
  scenarioId: string;
  iteration: number;
  maxIterations: 60;
  mutation: {
    workerDistanceM: number;
    workerSpeedMs: number;
    timeOfDay: "night";
    occluder: "pallet_stack";
  };
  minGapRecordedM: number;
  gapLimitM: number;
  verdict: "FAILED_NEAR_MISS" | "SEARCHING";
  rootCause: string;
}

export type AnyFlowTelemetry =
  | Flow1Telemetry
  | Flow2Telemetry
  | Flow3Telemetry
  | Flow4Telemetry
  | Flow5Telemetry
  | Flow6Telemetry
  | Flow7Telemetry;

export const CAMERA_PRESETS: Record<CameraPreset, CameraPresetConfig> = {
  "CAM-LINE-04": {
    name: "CAM-LINE-04",
    flowId: 1,
    label: "Flow 1 · Line End Dispatch",
    location: "Plant 01 · Line End Exit & Buffer",
    position: [-10, 12, 44],
    target: [0, 1.5, 22],
  },
  "CAM-ASSIST-02": {
    name: "CAM-ASSIST-02",
    flowId: 2,
    label: "Flow 2 · Remote Assistance Desk",
    location: "Plant 01 · Finishing Corner Artery",
    position: [-9, 8, 22],
    target: [1.5, 1.0, 14],
  },
  "CAM-GATE-01": {
    name: "CAM-GATE-01",
    flowId: 3,
    label: "Flow 3 · Drive-Through Gate Scanner",
    location: "Plant 01 · Inspection Gate 4-Cam Rig",
    position: [11, 13, 16],
    target: [0, 1.2, 0],
  },
  "CAM-TRACK-03": {
    name: "CAM-TRACK-03",
    flowId: 4,
    label: "Flow 4 · Test Track Functional Check",
    location: "Plant 01 · Functional Track Straight",
    position: [-9, 6, -20],
    target: [0, 1.0, -4],
  },
  "CAM-REWORK-05": {
    name: "CAM-REWORK-05",
    flowId: 5,
    label: "Flow 5 · Rework District & Routing",
    location: "Plant 01 · Specialized Bays District",
    position: [19, 14, -20],
    target: [12, 1.5, -20],
  },
  "CAM-LAB-06": {
    name: "CAM-LAB-06",
    flowId: 6,
    label: "Flow 6 · Test Lab Scenario Spec",
    location: "Test Lab · Virtual Simulation Grid",
    position: [12, 10, 2],
    target: [2.5, 1.0, -8],
  },
  "CAM-ADVERSARIAL-07": {
    name: "CAM-ADVERSARIAL-07",
    flowId: 7,
    label: "Flow 7 · Adversarial Night Fuzzing",
    location: "Stress Grid · Edge Case Pallet Occlusion",
    position: [11, 9, -5],
    target: [1.8, 1.0, -8],
  },
  "CAM-YARD-02": {
    name: "CAM-YARD-02",
    flowId: 1,
    label: "Yard Staging & Truck Loading Dock",
    location: "Plant 01 · Yard Lane B & Dock TRK-02",
    position: [24, 20, -10],
    target: [4, 1.0, -16],
  },
};

export const FLOW_DEFAULT_PRESETS: Record<FlowId, CameraPreset> = {
  1: "CAM-LINE-04",
  2: "CAM-ASSIST-02",
  3: "CAM-GATE-01",
  4: "CAM-TRACK-03",
  5: "CAM-REWORK-05",
  6: "CAM-LAB-06",
  7: "CAM-ADVERSARIAL-07",
};

export class ThreeCCTVScene {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Environment Lighting
  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private fillLight: THREE.DirectionalLight;

  // Active Flow State
  private activeFlow: FlowId = 1;

  // Vehicles
  private car1Group: THREE.Group = new THREE.Group();
  private car1Wheels: THREE.Mesh[] = [];
  private car1BrakeLightsMat: THREE.MeshStandardMaterial;
  private car1Z = 10;

  private car2Group: THREE.Group = new THREE.Group();
  private car2Wheels: THREE.Mesh[] = [];
  private car2BrakeLightsMat: THREE.MeshStandardMaterial;
  private car2LeftBrakeLightMesh: THREE.Mesh | null = null;
  private car2Z = 38;

  // Flow Sub-groups
  private flow1Group: THREE.Group = new THREE.Group();
  private flow2Group: THREE.Group = new THREE.Group();
  private flow3Group: THREE.Group = new THREE.Group();
  private flow4Group: THREE.Group = new THREE.Group();
  private flow5Group: THREE.Group = new THREE.Group();
  private flow6Group: THREE.Group = new THREE.Group();
  private flow7Group: THREE.Group = new THREE.Group();

  // Dynamic Visual Guides & Animators
  private lineEndSignalMat: THREE.MeshBasicMaterial;
  private lineEndSignalLight: THREE.PointLight;
  private headwayBeamMesh: THREE.Mesh | null = null;
  private scannerLight: THREE.PointLight;
  private scanPlaneMesh: THREE.Mesh | null = null;
  private flow2WaitRing: THREE.Mesh | null = null;
  private flow4BrakeErrorBeacon: THREE.Mesh | null = null;
  private flow5ArrowsMesh: THREE.Group = new THREE.Group();
  private flow6Waypoints: THREE.Mesh[] = [];
  private flow7DangerZone: THREE.Mesh | null = null;

  private currentPreset: CameraPreset = "CAM-LINE-04";
  private rafId = 0;
  private lastTime = 0;
  private isPaused = false;
  private isSupported = true;
  private telemetryListener: ((t: AnyFlowTelemetry) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.5, 120);

    this.car1BrakeLightsMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    this.car2BrakeLightsMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    this.lineEndSignalMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    this.lineEndSignalLight = new THREE.PointLight(0x22c55e, 2.0, 10);
    this.scannerLight = new THREE.PointLight(0x38bdf8, 2.0, 12);

    this.hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x64748b, 1.5);
    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    this.fillLight = new THREE.DirectionalLight(0xb0d5f8, 0.8);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      this.isSupported = false;
      return;
    }

    this.initScene();
    this.setFlowMode(1);
  }

  public get supported(): boolean {
    return this.isSupported;
  }

  public onTelemetry(listener: (t: AnyFlowTelemetry) => void) {
    this.telemetryListener = listener;
  }

  private initScene() {
    // Atmosphere
    this.scene.background = new THREE.Color(0x93c5fd);
    this.scene.fog = new THREE.FogExp2(0xa5cbf5, 0.007);

    // Daylight lighting setup
    this.hemiLight.position.set(0, 50, 0);
    this.scene.add(this.hemiLight);

    this.sunLight.position.set(28, 45, 20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 100;
    this.sunLight.shadow.camera.left = -30;
    this.sunLight.shadow.camera.right = 30;
    this.sunLight.shadow.camera.top = 30;
    this.sunLight.shadow.camera.bottom = -30;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    this.fillLight.position.set(-20, 25, -20);
    this.scene.add(this.fillLight);

    // Ground: Slate concrete logistics yard slab
    const groundGeo = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.9,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Main Artery Asphalt Road
    const roadGeo = new THREE.PlaneGeometry(10, 100);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.02;
    road.receiveShadow = true;
    this.scene.add(road);

    // Curbs along road edges
    const curbGeo = new THREE.BoxGeometry(0.35, 0.15, 100);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.7 });
    const leftCurb = new THREE.Mesh(curbGeo, curbMat);
    leftCurb.position.set(-5.15, 0.075, 0);
    leftCurb.receiveShadow = true;
    this.scene.add(leftCurb);

    const rightCurb = new THREE.Mesh(curbGeo, curbMat);
    rightCurb.position.set(5.15, 0.075, 0);
    rightCurb.receiveShadow = true;
    this.scene.add(rightCurb);

    this.addRoadMarkings();

    // Attach all Flow Group containers to scene
    this.scene.add(this.flow1Group);
    this.scene.add(this.flow2Group);
    this.scene.add(this.flow3Group);
    this.scene.add(this.flow4Group);
    this.scene.add(this.flow5Group);
    this.scene.add(this.flow6Group);
    this.scene.add(this.flow7Group);

    // Populate 3D structures for each flow
    this.buildFlow1Assets();
    this.buildFlow2Assets();
    this.buildFlow3Assets();
    this.buildFlow4Assets();
    this.buildFlow5Assets();
    this.buildFlow6Assets();
    this.buildFlow7Assets();

    // Common environment fixtures and cars
    this.addEnvironmentProps();
    this.addVehicles();
  }

  private addRoadMarkings() {
    const lineGeo = new THREE.PlaneGeometry(0.2, 100);
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    const leftBorder = new THREE.Mesh(lineGeo, yellowMat);
    leftBorder.rotation.x = -Math.PI / 2;
    leftBorder.position.set(-4.5, 0.03, 0);
    this.scene.add(leftBorder);

    const rightBorder = new THREE.Mesh(lineGeo, yellowMat);
    rightBorder.rotation.x = -Math.PI / 2;
    rightBorder.position.set(4.5, 0.03, 0);
    this.scene.add(rightBorder);

    // White dashed center line
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    for (let z = -45; z <= 45; z += 5) {
      const dashGeo = new THREE.PlaneGeometry(0.25, 2.5);
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.03, z);
      this.scene.add(dash);
    }
  }

  // -------------------------------------------------------------
  // FLOW 1 ASSETS: Assembly Line End, 25m Headway, Truck Dock
  // -------------------------------------------------------------
  private buildFlow1Assets() {
    // Factory End Wall facade (at z = 46)
    const wallGeo = new THREE.BoxGeometry(36, 10, 2);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.8,
      metalness: 0.1,
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);
    wall.position.set(0, 5, 46);
    this.flow1Group.add(wall);

    // Roll-up bay door
    const doorGeo = new THREE.BoxGeometry(7.5, 5, 0.4);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.5, 45.2);
    this.flow1Group.add(door);

    // Line End Traffic Signal Gantry
    const gantryGeo = new THREE.BoxGeometry(9.5, 0.4, 0.4);
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const gantry = new THREE.Mesh(gantryGeo, gantryMat);
    gantry.position.set(0, 4.8, 33);
    this.flow1Group.add(gantry);

    // Traffic Signal Housing & Lens
    const signalBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.9, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0f172a }),
    );
    signalBox.position.set(0, 4.2, 33);
    const signalLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16),
      this.lineEndSignalMat,
    );
    signalLens.rotation.x = Math.PI / 2;
    signalLens.position.z = -0.22;
    signalBox.add(signalLens);
    this.lineEndSignalLight.position.set(0, 4.2, 32.5);
    this.flow1Group.add(signalBox);
    this.flow1Group.add(this.lineEndSignalLight);

    // Stop line on asphalt at z = 32
    const stopLineGeo = new THREE.PlaneGeometry(9, 0.8);
    const stopLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const stopLine = new THREE.Mesh(stopLineGeo, stopLineMat);
    stopLine.rotation.x = -Math.PI / 2;
    stopLine.position.set(0, 0.035, 32);
    this.flow1Group.add(stopLine);

    // Headway Laser guide
    const beamGeo = new THREE.PlaneGeometry(0.35, 1);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.85,
    });
    this.headwayBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.headwayBeamMesh.rotation.x = -Math.PI / 2;
    this.headwayBeamMesh.position.set(0, 0.04, 0);
    this.headwayBeamMesh.visible = false;
    this.flow1Group.add(this.headwayBeamMesh);

    // Transport Truck TRK-02 at dock
    const truckGroup = new THREE.Group();
    truckGroup.position.set(13, 0, -18);

    const cabGeo = new THREE.BoxGeometry(3.2, 3.8, 4.8);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0x4f46e5,
      roughness: 0.35,
      metalness: 0.3,
    });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0, 1.9, 5);
    truckGroup.add(cab);

    const trailerGeo = new THREE.BoxGeometry(3.1, 4.2, 16);
    const trailerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.4,
      metalness: 0.6,
      wireframe: false,
    });
    const trailer = new THREE.Mesh(trailerGeo, trailerMat);
    trailer.position.set(0, 2.5, -4.5);
    truckGroup.add(trailer);

    this.flow1Group.add(truckGroup);

    // Truck Staging Slots 1-6
    for (let i = 0; i < 6; i++) {
      const slotZ = -6 - i * 4.2;
      const bayBorderGeo = new THREE.PlaneGeometry(3.6, 4.0);
      const bayBorderMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        wireframe: true,
      });
      const bay = new THREE.Mesh(bayBorderGeo, bayBorderMat);
      bay.rotation.x = -Math.PI / 2;
      bay.position.set(7.5, 0.03, slotZ);
      this.flow1Group.add(bay);
    }
  }

  // -------------------------------------------------------------
  // FLOW 2 ASSETS: Remote Assistance (Box Obstacle + Worker + Options)
  // -------------------------------------------------------------
  private buildFlow2Assets() {
    // Cardboard Box Obstacle at Finishing Corner lane (x = 1.6, z = 14)
    const boxGeo = new THREE.BoxGeometry(1.2, 0.85, 1.2);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.position.set(1.6, 0.425, 14);
    box.castShadow = true;
    this.flow2Group.add(box);

    // Hazard warning stripes on box
    const stripeGeo = new THREE.PlaneGeometry(1.1, 0.25);
    const stripeMat = new THREE.MeshBasicMaterial({ color: 0x18181b });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.position.set(0, 0, 0.61);
    box.add(stripe);

    // Worker figurine nearby (x = 3.4, z = 14)
    const workerGroup = new THREE.Group();
    workerGroup.position.set(3.4, 0, 14);

    // Worker legs
    const legGeo = new THREE.BoxGeometry(0.3, 0.9, 0.3);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.16, 0.45, 0);
    const legR = new THREE.Mesh(legGeo, legMat);
    legR.position.set(0.16, 0.45, 0);
    workerGroup.add(legL, legR);

    // Hi-Vis orange vest torso
    const torsoGeo = new THREE.BoxGeometry(0.6, 0.85, 0.35);
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0xf97316 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, 1.3, 0);
    workerGroup.add(torso);

    // Hardhat
    const headGeo = new THREE.SphereGeometry(0.22, 12, 12);
    const hatMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const head = new THREE.Mesh(headGeo, hatMat);
    head.position.set(0, 1.85, 0);
    workerGroup.add(head);

    this.flow2Group.add(workerGroup);

    // Worker 3.0m Safety Perimeter Circle (dashed red)
    const ringGeo = new THREE.RingGeometry(2.8, 3.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    this.flow2WaitRing = new THREE.Mesh(ringGeo, ringMat);
    this.flow2WaitRing.rotation.x = -Math.PI / 2;
    this.flow2WaitRing.position.set(3.4, 0.04, 14);
    this.flow2Group.add(this.flow2WaitRing);

    // Projected Option B (BYPASS_LEFT): Curved cyan trajectory ribbon
    const bypassCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.05, 19),
      new THREE.Vector3(-2.2, 0.05, 15),
      new THREE.Vector3(-2.2, 0.05, 13),
      new THREE.Vector3(0, 0.05, 9),
    ]);
    const bypassGeo = new THREE.TubeGeometry(bypassCurve, 32, 0.12, 8, false);
    const bypassMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.85,
    });
    const bypassMesh = new THREE.Mesh(bypassGeo, bypassMat);
    this.flow2Group.add(bypassMesh);

    // Projected Option A (WAIT_OPERATOR): Glowing yellow hold target
    const waitDiscGeo = new THREE.CircleGeometry(1.2, 24);
    const waitDiscMat = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.6,
    });
    const waitDisc = new THREE.Mesh(waitDiscGeo, waitDiscMat);
    waitDisc.rotation.x = -Math.PI / 2;
    waitDisc.position.set(0, 0.04, 18);
    this.flow2Group.add(waitDisc);
  }

  // -------------------------------------------------------------
  // FLOW 3 ASSETS: Inspection Gate, 4-Camera Rig & Scanner
  // -------------------------------------------------------------
  private buildFlow3Assets() {
    const gateGroup = new THREE.Group();
    gateGroup.position.set(0, 0, 0);

    // Left and Right steel pillars
    const pillarGeo = new THREE.BoxGeometry(0.8, 6.5, 0.8);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.6,
      roughness: 0.35,
    });
    const pL = new THREE.Mesh(pillarGeo, steelMat);
    pL.position.set(-5.5, 3.25, 0);
    const pR = new THREE.Mesh(pillarGeo, steelMat);
    pR.position.set(5.5, 3.25, 0);
    gateGroup.add(pL, pR);

    // Overhead Gantry crossbeam
    const beamGeo = new THREE.BoxGeometry(11.8, 0.65, 1.2);
    const beam = new THREE.Mesh(beamGeo, steelMat);
    beam.position.set(0, 6.0, 0);
    gateGroup.add(beam);

    // 4 Gate Cameras (Front, Left, Right, Rear)
    const camGeo = new THREE.BoxGeometry(0.35, 0.35, 0.5);
    const camMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });

    [-3.8, -1.2, 1.2, 3.8].forEach((x) => {
      const c = new THREE.Mesh(camGeo, camMat);
      c.position.set(x, 5.4, 0);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12), lensMat);
      l.rotation.x = Math.PI / 2;
      l.position.z = 0.26;
      c.add(l);
      gateGroup.add(c);
    });

    // Scanner Laser Plane (Dynamic holographic sweep)
    const scanGeo = new THREE.PlaneGeometry(9.6, 5);
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    this.scanPlaneMesh = new THREE.Mesh(scanGeo, scanMat);
    this.scanPlaneMesh.position.set(0, 2.5, 0);
    gateGroup.add(this.scanPlaneMesh);

    this.scannerLight.position.set(0, 4.5, 0);
    gateGroup.add(this.scannerLight);

    // Defect Marker 1: Rear Left Door Scratch (Red Pin)
    const pinStemGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8);
    const pinHeadGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const defectRedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const scratchPin = new THREE.Mesh(pinStemGeo, defectRedMat);
    scratchPin.position.set(-1.25, 1.6, 0.6);
    const scratchHead = new THREE.Mesh(pinHeadGeo, defectRedMat);
    scratchHead.position.y = 0.6;
    scratchPin.add(scratchHead);
    gateGroup.add(scratchPin);

    // Defect Marker 2: Missing Rear Badge (Amber Pin)
    const defectAmberMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const badgePin = new THREE.Mesh(pinStemGeo, defectAmberMat);
    badgePin.position.set(0, 1.6, 2.3);
    const badgeHead = new THREE.Mesh(pinHeadGeo, defectAmberMat);
    badgeHead.position.y = 0.6;
    badgePin.add(badgeHead);
    gateGroup.add(badgePin);

    this.flow3Group.add(gateGroup);
  }

  // -------------------------------------------------------------
  // FLOW 4 ASSETS: Test Track Functional Check & Disagreement
  // -------------------------------------------------------------
  private buildFlow4Assets() {
    // Deceleration / Distance markers on asphalt (z = -10 to -35)
    [-10, -18, -26, -34].forEach((z) => {
      const markGeo = new THREE.PlaneGeometry(8, 0.3);
      const markMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
      const mark = new THREE.Mesh(markGeo, markMat);
      mark.rotation.x = -Math.PI / 2;
      mark.position.set(0, 0.035, z);
      this.flow4Group.add(mark);

      // Distance pole marker
      const pGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8);
      const pMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
      const p = new THREE.Mesh(pGeo, pMat);
      p.position.set(-4.8, 0.9, z);
      this.flow4Group.add(p);
    });

    // Brake Light Disagreement Error Aura (pulsing halo on left brake light)
    const errGeo = new THREE.RingGeometry(0.25, 0.45, 16);
    const errMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.flow4BrakeErrorBeacon = new THREE.Mesh(errGeo, errMat);
    this.flow4BrakeErrorBeacon.position.set(-0.85, 0.65, 2.4);
    this.flow4BrakeErrorBeacon.visible = false;
    this.flow4Group.add(this.flow4BrakeErrorBeacon);
  }

  // -------------------------------------------------------------
  // FLOW 5 ASSETS: Rework District (5 Specialized Bays & Arrows)
  // -------------------------------------------------------------
  private buildFlow5Assets() {
    // 5 Rework Bays along X = 13.5
    const bayConfigs = [
      { name: "PAINT", color: 0xa855f7, z: -10, label: "BAY-PAINT (20m)" },
      { name: "BODY", color: 0x3b82f6, z: -16, label: "BAY-BODY (30m)" },
      { name: "ELEC", color: 0x06b6d4, z: -22, label: "BAY-ELEC (25m)" },
      { name: "MECH", color: 0xf97316, z: -28, label: "BAY-MECH (45m)" },
      { name: "HOLD", color: 0xef4444, z: -34, label: "BAY-HOLD" },
    ];

    bayConfigs.forEach((cfg) => {
      const bayFrame = new THREE.Group();
      bayFrame.position.set(13.5, 0, cfg.z);

      // Floor bay markings
      const floorGeo = new THREE.PlaneGeometry(6, 4.5);
      const floorMat = new THREE.MeshBasicMaterial({
        color: cfg.color,
        wireframe: true,
      });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = 0.035;
      bayFrame.add(floor);

      // Canopy frame
      const postGeo = new THREE.BoxGeometry(0.3, 3.6, 0.3);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const p1 = new THREE.Mesh(postGeo, postMat);
      p1.position.set(-2.8, 1.8, -2.1);
      const p2 = new THREE.Mesh(postGeo, postMat);
      p2.position.set(2.8, 1.8, -2.1);
      bayFrame.add(p1, p2);

      // Illuminated Bay Sign Header
      const signGeo = new THREE.BoxGeometry(5.8, 0.7, 0.25);
      const signMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      const sign = new THREE.Mesh(signGeo, signMat);
      sign.position.set(0, 3.6, -2.1);
      bayFrame.add(sign);

      this.flow5Group.add(bayFrame);
    });

    // Holographic ground directional chevron arrows pointing to BAY-ELEC
    for (let i = 0; i < 4; i++) {
      const arrowGeo = new THREE.ConeGeometry(0.4, 0.8, 3);
      const arrowMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      const arrow = new THREE.Mesh(arrowGeo, arrowMat);
      arrow.rotation.x = -Math.PI / 2;
      arrow.rotation.z = -Math.PI / 2;
      arrow.position.set(3 + i * 2.2, 0.05, -22);
      this.flow5ArrowsMesh.add(arrow);
    }
    this.flow5Group.add(this.flow5ArrowsMesh);
  }

  // -------------------------------------------------------------
  // FLOW 6 ASSETS: Test Lab Scenario Generator (Forklift + Spec)
  // -------------------------------------------------------------
  private buildFlow6Assets() {
    // Forklift model at finishing_corner.p3 (x = 3.8, z = -8)
    const forklift = new THREE.Group();
    forklift.position.set(3.8, 0, -8);

    // Body
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.2, 2.4),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4 }),
    );
    body.position.set(0, 0.7, 0);
    forklift.add(body);

    // Mast & Forks
    const mast = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x18181b }),
    );
    mast.position.set(0, 1.2, -1.3);
    forklift.add(mast);

    const forks = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.08, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x18181b }),
    );
    forks.position.set(0, 0.1, -1.9);
    forklift.add(forks);

    this.flow6Group.add(forklift);

    // Worker stepping out from behind forklift (x = 2.4, z = -8)
    const labWorker = new THREE.Group();
    labWorker.position.set(2.4, 0, -8);
    const wBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x0284c7 }),
    );
    wBody.position.y = 1.2;
    const wHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfde047 }),
    );
    wHead.position.y = 1.7;
    labWorker.add(wBody, wHead);
    this.flow6Group.add(labWorker);

    // 3 Floating Holographic Waypoints (P1, P2, P3)
    const wpPositions: [number, number, number][] = [
      [0, 1.2, 4],
      [0, 1.2, -3],
      [-2.2, 1.2, -8],
    ];

    wpPositions.forEach(([x, y, z]) => {
      const diaGeo = new THREE.OctahedronGeometry(0.35, 0);
      const diaMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
      const dia = new THREE.Mesh(diaGeo, diaMat);
      dia.position.set(x, y, z);
      this.flow6Waypoints.push(dia);
      this.flow6Group.add(dia);
    });

    // Spline trajectory curve through waypoints
    const wpCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.06, 8),
      new THREE.Vector3(0, 0.06, 4),
      new THREE.Vector3(0, 0.06, -3),
      new THREE.Vector3(-2.2, 0.06, -8),
      new THREE.Vector3(-2.2, 0.06, -14),
    ]);
    const wpTube = new THREE.Mesh(
      new THREE.TubeGeometry(wpCurve, 40, 0.09, 8, false),
      new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.8 }),
    );
    this.flow6Group.add(wpTube);
  }

  // -------------------------------------------------------------
  // FLOW 7 ASSETS: Adversarial Stress Test (Pallets + 0.6m Breach)
  // -------------------------------------------------------------
  private buildFlow7Assets() {
    // Tall wooden pallet stack occluder (2.4m tall) at (x = 3.6, z = -8)
    const palletGroup = new THREE.Group();
    palletGroup.position.set(3.6, 0, -8);
    const pGeo = new THREE.BoxGeometry(1.8, 0.35, 1.8);
    const pMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    for (let i = 0; i < 7; i++) {
      const pl = new THREE.Mesh(pGeo, pMat);
      pl.position.y = 0.18 + i * 0.35;
      palletGroup.add(pl);
    }
    this.flow7Group.add(palletGroup);

    // Fast Runner Worker positioned dangerously close to lane (x = 1.6, z = -8)
    const jogger = new THREE.Group();
    jogger.position.set(1.6, 0, -8);
    const jTorso = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.8, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xdc2626 }),
    );
    jTorso.position.y = 1.2;
    const jHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef08a }),
    );
    jHead.position.y = 1.7;
    jogger.add(jTorso, jHead);
    this.flow7Group.add(jogger);

    // Critical 0.6m Breach Danger Zone Envelope (Pulsing Red)
    const dangerGeo = new THREE.RingGeometry(0.4, 0.65, 24);
    const dangerMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    this.flow7DangerZone = new THREE.Mesh(dangerGeo, dangerMat);
    this.flow7DangerZone.rotation.x = -Math.PI / 2;
    this.flow7DangerZone.position.set(1.1, 0.05, -8);
    this.flow7Group.add(this.flow7DangerZone);
  }

  private addEnvironmentProps() {
    const containerColors = [0x2563eb, 0xea580c, 0x059669, 0xdc2626, 0x475569, 0xca8a04];
    const containerGeo = new THREE.BoxGeometry(4.5, 3.2, 9);

    const positions: [number, number, number, number][] = [
      [-12, 1.6, -15, 0],
      [-12, 4.8, -15, 1],
      [-12, 1.6, -5, 2],
      [-12, 1.6, 12, 3],
      [18, 1.6, 10, 5],
    ];

    positions.forEach(([x, y, z, colorIdx]) => {
      const mat = new THREE.MeshStandardMaterial({
        color: containerColors[colorIdx],
        roughness: 0.55,
        metalness: 0.15,
      });
      const mesh = new THREE.Mesh(containerGeo, mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    });

    // Light poles
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.12, 7, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.4 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });

    [-6, 6].forEach((x) => {
      [-25, 25].forEach((z) => {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(x, 3.5, z);
        pole.castShadow = true;
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), lampMat);
        lamp.position.set(0, 3.5, 0);
        pole.add(lamp);
        this.scene.add(pole);
      });
    });
  }

  private buildCarModel(color: number): {
    group: THREE.Group;
    wheels: THREE.Mesh[];
    brakeMat: THREE.MeshStandardMaterial;
    leftBrakeLightMesh: THREE.Mesh;
  } {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.BoxGeometry(2.3, 0.65, 4.6);
    const bodyMat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.6,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.9, 0.55, 2.5);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.85,
      roughness: 0.15,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 1.2, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.4, 0.18, 0.1);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const headL = new THREE.Mesh(lightGeo, headMat);
    headL.position.set(-0.85, 0.65, -2.31);
    const headR = new THREE.Mesh(lightGeo, headMat);
    headR.position.set(0.85, 0.65, -2.31);
    group.add(headL, headR);

    // Brake lights
    const brakeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });
    const brakeL = new THREE.Mesh(lightGeo, brakeMat);
    brakeL.position.set(-0.85, 0.65, 2.31);
    const brakeR = new THREE.Mesh(lightGeo, brakeMat);
    brakeR.position.set(0.85, 0.65, 2.31);
    group.add(brakeL, brakeR);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.32, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85 });
    const wheelPositions: [number, number, number][] = [
      [-1.15, 0.38, -1.4],
      [1.15, 0.38, -1.4],
      [-1.15, 0.38, 1.4],
      [1.15, 0.38, 1.4],
    ];

    const wheels = wheelPositions.map(([x, y, z]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      group.add(wheel);
      return wheel;
    });

    return { group, wheels, brakeMat, leftBrakeLightMesh: brakeL };
  }

  private addVehicles() {
    // Car 1 (Active Dispatch - VIN-004, Electric Blue)
    const car1 = this.buildCarModel(0x0284c7);
    this.car1Group = car1.group;
    this.car1Wheels = car1.wheels;
    this.car1BrakeLightsMat = car1.brakeMat;
    this.car1Group.position.set(0, 0, this.car1Z);
    this.scene.add(this.car1Group);

    // Car 2 (Trailing / Line End Queue - VIN-003, Silver White)
    const car2 = this.buildCarModel(0xe2e8f0);
    this.car2Group = car2.group;
    this.car2Wheels = car2.wheels;
    this.car2BrakeLightsMat = car2.brakeMat;
    this.car2LeftBrakeLightMesh = car2.leftBrakeLightMesh;
    this.car2Group.position.set(0, 0, this.car2Z);
    this.scene.add(this.car2Group);
  }

  // -------------------------------------------------------------
  // Flow Switching & Camera Presets
  // -------------------------------------------------------------
  public setFlowMode(flowId: FlowId) {
    this.activeFlow = flowId;
    const defaultPreset = FLOW_DEFAULT_PRESETS[flowId];
    if (defaultPreset) {
      this.setCameraPreset(defaultPreset);
    }

    // Toggle lighting environment based on Flow scenario
    if (flowId === 6) {
      // Flow 6: Dusk twilight setting (ChatScene sunset)
      this.scene.background = new THREE.Color(0xd97706);
      this.scene.fog = new THREE.FogExp2(0xb45309, 0.009);
      this.hemiLight.color.setHex(0xfde047);
      this.hemiLight.groundColor.setHex(0x7c2d12);
      this.sunLight.color.setHex(0xf97316);
      this.sunLight.intensity = 1.4;
      this.fillLight.intensity = 0.4;
    } else if (flowId === 7) {
      // Flow 7: Night adversarial edge-case setting
      this.scene.background = new THREE.Color(0x020617);
      this.scene.fog = new THREE.FogExp2(0x0f172a, 0.015);
      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x020617);
      this.sunLight.color.setHex(0x38bdf8);
      this.sunLight.intensity = 0.5;
      this.fillLight.intensity = 0.2;
    } else {
      // Flows 1-5: Clean industrial daylight
      this.scene.background = new THREE.Color(0x93c5fd);
      this.scene.fog = new THREE.FogExp2(0xa5cbf5, 0.007);
      this.hemiLight.color.setHex(0xe0f2fe);
      this.hemiLight.groundColor.setHex(0x64748b);
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.intensity = 2.5;
      this.fillLight.intensity = 0.8;
    }
  }

  public getFlowMode(): FlowId {
    return this.activeFlow;
  }

  public setCameraPreset(preset: CameraPreset) {
    this.currentPreset = preset;
    const config = CAMERA_PRESETS[preset];
    if (!config) return;

    this.camera.position.set(...config.position);
    this.camera.lookAt(...config.target);
  }

  public getPreset(): CameraPreset {
    return this.currentPreset;
  }

  public setPaused(paused: boolean) {
    this.isPaused = paused;
  }

  public resize(width: number, height: number) {
    if (!this.renderer || width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  public start() {
    if (!this.renderer) return;
    this.lastTime = performance.now();

    const loop = (now: number) => {
      this.rafId = requestAnimationFrame(loop);
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      if (!this.isPaused) {
        this.update(dt);
      }

      this.renderer?.render(this.scene, this.camera);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    const time = performance.now() * 0.001;

    // Vehicle 1 motion (VIN-004)
    const distToGate1 = Math.abs(this.car1Z);
    let speed1 = 8.8;
    let isBraking1 = false;

    if (this.activeFlow === 2) {
      // In Flow 2 (Remote Assistance), Car 1 stops safely 4m before box at z = 18
      speed1 = 0;
      isBraking1 = true;
      this.car1Z = 18;
    } else {
      if (distToGate1 < 6) {
        speed1 = 2.5;
        isBraking1 = this.car1Z > 0;
      }
      this.car1Z -= speed1 * dt;
      if (this.car1Z < -36) {
        this.car1Z = 36;
      }
    }
    this.car1Group.position.z = this.car1Z;

    // Vehicle 2 motion (VIN-003) - Flow 1 25m headway enforcement
    let headway = this.car2Z - this.car1Z;
    if (headway < 0) {
      headway = this.car2Z + (36 - this.car1Z);
    }
    const headwayRuleMet = headway >= 25.0;
    let speed2 = 0;
    let isBraking2 = false;

    if (this.car2Z > 32) {
      if (!headwayRuleMet) {
        speed2 = 0;
        isBraking2 = true;
        this.lineEndSignalMat.color.setHex(0xf59e0b);
        this.lineEndSignalLight.color.setHex(0xf59e0b);
      } else {
        speed2 = 7.5;
        isBraking2 = false;
        this.lineEndSignalMat.color.setHex(0x22c55e);
        this.lineEndSignalLight.color.setHex(0x22c55e);
      }
    } else {
      speed2 = headway < 18 ? 3.0 : 8.0;
      isBraking2 = headway < 18;
    }

    this.car2Z -= speed2 * dt;
    if (this.car2Z < -36) {
      this.car2Z = 38;
    }
    this.car2Group.position.z = this.car2Z;

    // Wheel spin
    const spin1 = (speed1 / 0.38) * dt;
    this.car1Wheels.forEach((w) => {
      w.rotation.x -= spin1;
    });
    const spin2 = (speed2 / 0.38) * dt;
    this.car2Wheels.forEach((w) => {
      w.rotation.x -= spin2;
    });

    // Brake lights
    this.car1BrakeLightsMat.emissiveIntensity = isBraking1 ? 3.0 : 0.8;
    this.car2BrakeLightsMat.emissiveIntensity = isBraking2 ? 3.0 : 0.8;

    // Flow 1 Dynamic Headway Beam
    if (this.headwayBeamMesh) {
      if (this.car2Z > this.car1Z && headway < 45) {
        const centerZ = (this.car1Z + this.car2Z) / 2;
        const length = Math.max(0.1, this.car2Z - this.car1Z);
        this.headwayBeamMesh.position.z = centerZ;
        this.headwayBeamMesh.scale.set(1, length, 1);
        this.headwayBeamMesh.visible = this.activeFlow === 1;
        (this.headwayBeamMesh.material as THREE.MeshBasicMaterial).color.setHex(
          headwayRuleMet ? 0x22c55e : 0xf59e0b,
        );
      } else {
        this.headwayBeamMesh.visible = false;
      }
    }

    // Flow 2 Pulsing Wait Perimeter Ring
    if (this.flow2WaitRing) {
      const scale = 1.0 + Math.sin(time * 3) * 0.05;
      this.flow2WaitRing.scale.set(scale, scale, 1);
    }

    // Flow 3 Scanner Beam Sweep
    if (this.scanPlaneMesh) {
      this.scanPlaneMesh.position.z = Math.sin(time * 2) * 2.8;
      this.scannerLight.intensity = 2.0 + Math.sin(time * 6) * 1.5;
    }

    // Flow 4 Functional Check Disagreement Aura
    if (this.flow4BrakeErrorBeacon) {
      const isFlow4 = this.activeFlow === 4;
      this.flow4BrakeErrorBeacon.visible = isFlow4;
      if (isFlow4) {
        const pulse = 1.0 + Math.sin(time * 8) * 0.3;
        this.flow4BrakeErrorBeacon.scale.set(pulse, pulse, 1);
        if (this.car2LeftBrakeLightMesh) {
          // Left brake lamp fails to light up on camera
          (this.car2LeftBrakeLightMesh.material as THREE.MeshStandardMaterial).emissiveIntensity =
            0.0;
        }
      }
    }

    // Flow 5 Animated Chevron Arrows
    if (this.flow5ArrowsMesh) {
      this.flow5ArrowsMesh.position.x = ((time * 2) % 1.5) - 0.75;
    }

    // Flow 6 Floating Waypoint Beacons
    this.flow6Waypoints.forEach((wp, i) => {
      wp.rotation.y += dt * 1.5;
      wp.position.y = 1.2 + Math.sin(time * 2 + i) * 0.15;
    });

    // Flow 7 Pulsing Danger Envelope
    if (this.flow7DangerZone) {
      const dangerPulse = 1.0 + Math.sin(time * 6) * 0.12;
      this.flow7DangerZone.scale.set(dangerPulse, dangerPulse, 1);
    }

    // Broadcast active flow telemetry
    this.broadcastActiveTelemetry(speed1, speed2, headway, headwayRuleMet, distToGate1);
  }

  private broadcastActiveTelemetry(
    speed1: number,
    speed2: number,
    headway: number,
    headwayRuleMet: boolean,
    distToGate1: number,
  ) {
    if (!this.telemetryListener) return;

    switch (this.activeFlow) {
      case 1:
        this.telemetryListener({
          flow: 1,
          name: "Yard Traffic Controller",
          leadingVin: "VIN-004",
          leadingSpeedKmh: Math.round(speed1 * 3.6),
          leadingStatus: distToGate1 < 6 ? "GATE_INSPECTION" : "CRUISING_TO_YARD",
          trailingVin: "VIN-003",
          trailingSpeedKmh: Math.round(speed2 * 3.6),
          trailingStatus:
            this.car2Z > 32 && !headwayRuleMet ? "HOLDING_AT_LINE_END" : "RELEASED_HEADWAY_OK",
          headwayM: Math.round(headway * 10) / 10,
          headwayTargetM: 25.0,
          headwayRuleMet,
          lineEndStatus: headwayRuleMet ? "DISPATCHING" : "HOLDING",
          gateQueueCount: distToGate1 < 10 ? 1 : 0,
          activeTruck: {
            truckId: "TRK-02",
            status: "LOADING_AT_DOCK",
            stagedCars: 2,
            capacity: 6,
          },
        });
        break;

      case 2:
        this.telemetryListener({
          flow: 2,
          name: "Remote Assistance Desk",
          caseId: "case-01",
          vin: "VIN-231",
          stoppedDistanceM: 4.0,
          obstacleType: "Cardboard Box in Lane",
          workerDistanceM: 3.0,
          workerNearby: true,
          options: [
            {
              id: "WAIT_OPERATOR",
              label: "Wait for worker removal",
              recommended: true,
              reason: "Worker is 3m away in safety envelope; human in proximity rule",
            },
            {
              id: "BYPASS_LEFT",
              label: "Bypass using empty left lane",
              recommended: false,
              reason: "Permitted at 3 km/h only if worker clears area",
            },
            {
              id: "REROUTE_C",
              label: "Reroute via Lane C (+2 min)",
              recommended: false,
              reason: "Adds 2 min transit time to inspection gate",
            },
          ],
          status: "WAITING_HUMAN_OPERATOR",
          timeoutRemainingS: 42,
        });
        break;

      case 3:
        this.telemetryListener({
          flow: 3,
          name: "Drive-Through Visual Inspection",
          vin: "VIN-001",
          speedKmh: 5,
          gateCameras: [
            { id: "front", status: "STREAMING" },
            { id: "rear", status: "STREAMING" },
            { id: "left", status: "STREAMING" },
            { id: "right", status: "STREAMING" },
          ],
          zonesChecked: 8,
          totalZones: 8,
          findings: [
            {
              zone: "rear_left_door",
              defect: "Paint scratch 6 cm",
              confidence: 0.78,
              status: "REVIEW",
            },
            {
              zone: "rear_badge",
              defect: "Missing AWD badge",
              confidence: 0.94,
              status: "FAIL",
            },
          ],
          buildSheetMismatch: "AWD badge specified on build sheet; none detected",
          overallVerdict: "REVIEW",
        });
        break;

      case 4:
        this.telemetryListener({
          flow: 4,
          name: "Functional Check on Test Track",
          vin: "VIN-002",
          routineId: "R-12",
          currentStep: 3,
          totalSteps: 6,
          currentAction: "Brake Lights Actuation Test",
          telemetryStatus: "Brake Pedal Signal: ON (ALL CIRCUITS OK)",
          cameraStatus: "Vision: Left Brake Lamp DEAD / NOT LIT",
          disagreementFound: true,
          disagreementItem: "Left rear brake light bulb blown / open circuit",
          lightStates: {
            headlights: true,
            indicators: true,
            brakeLights: { right: true, left: false },
          },
        });
        break;

      case 5:
        this.telemetryListener({
          flow: 5,
          name: "Inspection Report & Rework Routing",
          vin: "VIN-001",
          ticketId: "RWK-4091",
          routeToBay: "BAY-ELEC",
          estimatedMinutes: 25,
          baysStatus: {
            "BAY-PAINT": { queue: 1, max: 3, desc: "Paint touch-up (20m)" },
            "BAY-BODY": { queue: 0, max: 2, desc: "Body fit (30m)" },
            "BAY-ELEC": { queue: 1, max: 2, desc: "Electrical bulb replacement (25m)" },
            "BAY-MECH": { queue: 0, max: 2, desc: "Mechanical alignment (45m)" },
            "BAY-HOLD": { queue: 0, max: 5, desc: "Production hold" },
          },
          reinspectionPolicy: "FAILED_ITEMS_ONLY",
          supervisorConfirmed: false,
        });
        break;

      case 6:
        this.telemetryListener({
          flow: 6,
          name: "Scenario Generator (Test Lab)",
          scenarioId: "SC-0142",
          prompt:
            "A worker steps out from behind a parked forklift at dusk while a car turns into the finishing lane",
          timeOfDay: "dusk",
          mapZone: "finishing_corner",
          actors: [
            { type: "forklift", position: "finishing_corner.p3" },
            { type: "worker", position: "behind:forklift" },
          ],
          passCriteria: ["no_contact", "min_gap_to_person_m >= 1.5", "speed_near_person_kmh <= 5"],
          compilationStatus: "VALID_SPEC",
        });
        break;

      case 7:
        this.telemetryListener({
          flow: 7,
          name: "Adversarial Test Agent",
          scenarioId: "SC-0142-v17",
          iteration: 17,
          maxIterations: 60,
          mutation: {
            workerDistanceM: 7.0,
            workerSpeedMs: 2.1,
            timeOfDay: "night",
            occluder: "pallet_stack",
          },
          minGapRecordedM: 0.6,
          gapLimitM: 1.5,
          verdict: "FAILED_NEAR_MISS",
          rootCause:
            "Late detection in low light behind tall pallet stack. Stopping distance violated limit by 0.9m.",
        });
        break;
    }
  }

  public dispose() {
    cancelAnimationFrame(this.rafId);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => {
            m.dispose();
          });
        } else if (obj.material) {
          obj.material.dispose();
        }
      }
    });

    this.renderer?.dispose();
    this.renderer = null;
  }
}
