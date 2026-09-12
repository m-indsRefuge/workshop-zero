import type { WorldAction } from "../kernel/types";

export const DEVELOPMENT_PROBE: readonly WorldAction[] = [
  { kind: "observe", target: "generator" },
  { kind: "toggle", target: "lamp" },
  { kind: "observe", target: "generator" },
  { kind: "toggle", target: "lamp" },
  { kind: "observe", target: "generator" },
  { kind: "wait" },
  { kind: "observe", target: "generator" },
] as const;