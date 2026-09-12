export interface WorkshopIdentity {
  beingId: string;
  createdAt: string;
  beingVersion: string;
  worldId: string;
  worldRulesVersion: string;
  cognitiveModel: string;
}

export interface PersistedWorldState {
  tick: number;
  charge: number;
  lampSwitch: "off" | "on";
}

export interface PersistedGeneratorObservation {
  visibleReading: number | null;
  readingTick: number | null;
}

export interface PersistenceSnapshot {
  world: PersistedWorldState;
  generator: PersistedGeneratorObservation;
  probeIndex: number;
}

export interface PersistedWorkshop {
  identity: WorkshopIdentity;
  snapshot: PersistenceSnapshot;
}

export interface WorkshopPersistence {
  loadOrInitialize: () => Promise<PersistedWorkshop>;
  saveSnapshot: (snapshot: PersistenceSnapshot) => Promise<void>;
}