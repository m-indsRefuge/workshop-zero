import { invoke } from "@tauri-apps/api/core";
import type {
  PersistedWorkshop,
  PersistenceSnapshot,
  WorkshopPersistence,
} from "./types";

export const tauriWorkshopPersistence: WorkshopPersistence = {
  loadOrInitialize() {
    return invoke<PersistedWorkshop>("load_or_initialize_workshop");
  },

  saveSnapshot(snapshot: PersistenceSnapshot) {
    return invoke<void>("save_workshop_snapshot", { snapshot });
  },
};