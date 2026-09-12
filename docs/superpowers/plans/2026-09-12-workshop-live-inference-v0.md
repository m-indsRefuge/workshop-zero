# Workshop Zero Live Inference V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the production development-probe loop with a local Phi-4 Mini cognitive turn loop that is strictly validated, serialized, recoverable, and durably evidenced without changing Workshop Zero's deterministic world rules.

**Architecture:** Add a dedicated `LiveWorkshopProvider` and pure `TurnController` around the existing `BeingContext` and `reduceWorld()` kernel. Rust/Tauri owns Ollama HTTP and SQLite transactions; TypeScript owns deterministic request construction, decision validation, orchestration, and UI projection. Accepted turns atomically append evidence and update the runtime snapshot; rejected/provider-failed turns append evidence only and advance zero ticks.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 5, Tauri 2, Rust 2021, rusqlite 0.32, Ollama HTTP API on `127.0.0.1:11434`, `reqwest` 0.12, `sha2` 0.10.

**Spec:** `docs/superpowers/specs/2026-09-12-workshop-live-inference-v0-design.md`

## Global Constraints

- Qualified model name: `phi4-mini:3.8b-q4_K_M`.
- Qualified full digest: `78fad5d182a7c33065e153a5f8ba210754207ba9d91973f57dffa7f487363753`.
- Qualified configuration: `temperature=0`, `seed=42`, `num_ctx=4096`, `num_predict=96`, `think=false`, `stream=false`.
- Exactly one model inference request per cognitive turn; zero automatic inference retries.
- Only a valid accepted action whose persistence transaction commits may advance the world, exactly one tick.
- Provider failures, validation failures, Reconnect, and health checks advance zero ticks.
- Reconnect verifies infrastructure/model identity only; it never resends a failed inference.
- Resume is serialized and waits at least 1600 ms after a completed turn before the next autonomous turn.
- Automatic infrastructure health checks run every 5000 ms while provider/model readiness is lost.
- `WorkshopViewState` remains unchanged.
- The existing deterministic world kernel remains unchanged.
- The existing development probe remains as a test/reference runtime and is not deleted.
- Turn history is evidence, not memory supplied to the Being.
- Reset preserves SELF and turn history, closes the active episode, creates a new episode, and resets only the world/runtime state.
- Production React code never calls Ollama directly; Ollama transport lives behind Tauri commands.
- Use ASCII-safe source/scripts where practical; do not introduce generated Python artifacts.

---

## Execution Preparation

Before Task 1, synchronize the locally checked-out qualification branch because the approved spec and this plan were committed through GitHub after the local qualification campaign.

```powershell
cd "C:\Users\nolan\AIProjects\workshop-zero"
git status --short
git switch feature/workshop-model-qualification-v0
git pull --ff-only origin feature/workshop-model-qualification-v0
git log -3 --oneline
git switch -c feature/workshop-live-inference-v0
```

Expected before creating the new branch: clean worktree and recent commits containing `docs: design Workshop live inference v0` and `docs: plan Workshop live inference v0`.

If `git status --short` is not empty, stop and inspect before pulling. Do not stash or discard unknown work automatically.

## Planned File Structure

### New TypeScript files

- `src/workshop/cognition/decision.ts` — `DecisionV0` types and strict non-repairing validator.
- `src/workshop/cognition/decision.test.ts` — schema/epistemic boundary tests.
- `src/workshop/cognition/request.ts` — frozen model identity, system instruction, schema, and deterministic Ollama request serialization.
- `src/workshop/cognition/request.test.ts` — exact request-shape and hidden-state exclusion tests.
- `src/workshop/model/types.ts` — provider verification and model attempt contracts.
- `src/workshop/model/tauriLocalModel.ts` — Tauri implementation of the local-model port.
- `src/workshop/model/tauriLocalModel.test.ts` — invoke-name/payload mapping tests.
- `src/workshop/runtime/turnController.ts` — exactly-one-turn orchestration, independent of React.
- `src/workshop/runtime/turnController.test.ts` — accepted/rejected/provider-failure turn tests.
- `src/workshop/runtime/LiveWorkshopProvider.tsx` — production live cognition provider, pacing, provider recovery, and controls.
- `src/workshop/runtime/LiveWorkshopProvider.test.tsx` — Step/Resume/Pause/recovery/reset orchestration tests.

### Modified TypeScript files

- `src/workshop/persistence/types.ts` — active episode and append-only turn persistence contracts.
- `src/workshop/persistence/tauriPersistence.ts` — invoke live persistence/reset commands.
- `src/workshop/playback.ts` — optional reconnect control without changing `WorkshopViewState`.
- `src/workshop/components/OperatorControls.tsx` — conditional Reconnect button.
- `src/workshop/components/WorkshopScene.tsx` — pass reconnect/status capability to controls.
- `src/App.tsx` — switch production path from `KernelWorkshopProvider` to `LiveWorkshopProvider`.
- `src/App.test.tsx` — production live-path UI tests with injected in-memory ports.

### New Rust files

- `src-tauri/src/model.rs` — Ollama health/model verification, outbound request validation/hash, and one-shot chat transport.
- `src-tauri/src/model_tests.rs` — pure model-boundary tests without live Ollama dependency.

### Modified Rust files

- `src-tauri/Cargo.toml` — add HTTP and SHA-256 dependencies.
- `src-tauri/src/lib.rs` — register model commands and tests.
- `src-tauri/src/persistence.rs` — migrate schema, create episodes/turns, atomic accepted/rejected turn recording, transactional reset.
- `src-tauri/src/persistence_tests.rs` — persistence/episode/evidence atomicity tests.

---

### Task 1: Freeze `DecisionV0` and strict validation

**Files:**
- Create: `src/workshop/cognition/decision.ts`
- Create: `src/workshop/cognition/decision.test.ts`

**Interfaces:**
- Consumes: existing `WorldAction` from `src/workshop/kernel/types.ts`.
- Produces:
  - `DecisionV0`
  - `DecisionPredictionV0`
  - `DecisionValidationResult`
  - `validateDecisionV0(raw: unknown): DecisionValidationResult`
  - `decisionAction(decision: DecisionV0): WorldAction`

- [ ] **Step 1: Write the failing validator tests**

Create `src/workshop/cognition/decision.test.ts` with tests covering one valid object, unknown top-level fields, unknown nested action fields, string-to-number coercion rejection, prediction sensor restriction, integer range, and 160-character bounds.

```ts
import { describe, expect, it } from "vitest";
import { validateDecisionV0 } from "./decision";

const valid = {
  action: { kind: "observe", target: "generator" },
  prediction: { sensor: "generator.gauge", expectedValue: 9 },
  intention: "Check the generator again.",
  message: "I want another reading.",
};

describe("validateDecisionV0", () => {
  it("accepts the exact V0 contract", () => {
    const result = validateDecisionV0(valid);
    expect(result.ok).toBe(true);
  });

  it("rejects unknown fields instead of repairing them", () => {
    expect(validateDecisionV0({ ...valid, confidence: "high" }).ok).toBe(false);
  });

  it("rejects coercion and out-of-range predictions", () => {
    expect(validateDecisionV0({ ...valid, prediction: { sensor: "generator.gauge", expectedValue: "9" } }).ok).toBe(false);
    expect(validateDecisionV0({ ...valid, prediction: { sensor: "generator.gauge", expectedValue: 13 } }).ok).toBe(false);
  });

  it("rejects unsupported prediction sensors", () => {
    expect(validateDecisionV0({ ...valid, prediction: { sensor: "world.charge", expectedValue: 8 } }).ok).toBe(false);
  });

  it("rejects expression longer than 160 characters", () => {
    expect(validateDecisionV0({ ...valid, message: "x".repeat(161) }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test and confirm RED**

```powershell
npm test -- --run src/workshop/cognition/decision.test.ts
```

Expected: FAIL because `./decision` does not exist.

- [ ] **Step 3: Implement the minimal exact validator**

Create `decision.ts` with discriminated actions and explicit key checks. Do not use coercion.

```ts
import type { WorldAction } from "../kernel/types";

export type DecisionPredictionV0 =
  | null
  | { sensor: "generator.gauge"; expectedValue: number };

export interface DecisionV0 {
  action: WorldAction;
  prediction: DecisionPredictionV0;
  intention: string | null;
  message: string | null;
}

export type DecisionValidationResult =
  | { ok: true; decision: DecisionV0 }
  | { ok: false; error: string };

const EXACT_TOP_LEVEL_KEYS = ["action", "prediction", "intention", "message"] as const;
const MAX_EXPRESSION_LENGTH = 160;

export function validateDecisionV0(raw: unknown): DecisionValidationResult {
  // Implement explicit object/key/type checks for all fields.
  // Return the first deterministic rejection string; never mutate or coerce `raw`.
}

export function decisionAction(decision: DecisionV0): WorldAction {
  return decision.action;
}
```

The implementation must explicitly accept only:

```ts
{ kind: "observe", target: "generator" }
{ kind: "toggle", target: "lamp" }
{ kind: "wait" }
```

and require exact nested keys for each action shape.

- [ ] **Step 4: Run the focused and full frontend suites**

```powershell
npm test -- --run src/workshop/cognition/decision.test.ts
npm test -- --run
```

Expected: focused tests PASS; existing frontend suite remains PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/workshop/cognition/decision.ts src/workshop/cognition/decision.test.ts
git commit -m "feat: add live decision validation"
```

---

### Task 2: Build the deterministic Phi-4 request contract

**Files:**
- Create: `src/workshop/cognition/request.ts`
- Create: `src/workshop/cognition/request.test.ts`

**Interfaces:**
- Consumes: `BeingContext` and `DecisionV0` schema semantics.
- Produces:
  - `QUALIFIED_MODEL_NAME`
  - `QUALIFIED_MODEL_DIGEST`
  - `QUALIFIED_MODEL_IDENTITY`
  - `WORKSHOP_SYSTEM_INSTRUCTION`
  - `buildOllamaRequest(context: BeingContext): string`

- [ ] **Step 1: Write RED tests for exact request construction**

```ts
import { describe, expect, it } from "vitest";
import { buildOllamaRequest, QUALIFIED_MODEL_NAME } from "./request";
import type { BeingContext } from "../perception/types";

const context: BeingContext = {
  self: {
    beingId: "being-test",
    createdAt: "2026-09-12T00:00:00.000Z",
    beingVersion: "0.1.0",
    worldId: "workshop-zero",
    worldRulesVersion: "workshop-zero-rules-v0",
    cognitiveModel: "test-substrate",
  },
  observation: {
    tick: 4,
    lamp: { switchedOn: true, lit: true },
    generator: { lastObservedReading: 7, observedAtTick: 3 },
    availableActions: [
      { kind: "observe", target: "generator" },
      { kind: "toggle", target: "lamp" },
      { kind: "wait" },
    ],
  },
};

describe("buildOllamaRequest", () => {
  it("freezes the qualified model configuration", () => {
    const request = JSON.parse(buildOllamaRequest(context));
    expect(request.model).toBe(QUALIFIED_MODEL_NAME);
    expect(request.stream).toBe(false);
    expect(request.think).toBe(false);
    expect(request.options).toEqual({ temperature: 0, seed: 42, num_ctx: 4096, num_predict: 96 });
  });

  it("contains permitted perception but no canonical charge or hidden equations", () => {
    const text = buildOllamaRequest(context);
    expect(text).toContain('"lastObservedReading":7');
    expect(text).not.toContain('"charge"');
    expect(text).not.toContain("RECHARGE_PER_TICK");
    expect(text).not.toContain("LAMP_DRAIN_PER_TICK");
  });

  it("is byte-stable for identical BeingContext", () => {
    expect(buildOllamaRequest(context)).toBe(buildOllamaRequest(structuredClone(context)));
  });
});
```

- [ ] **Step 2: Run and confirm RED**

```powershell
npm test -- --run src/workshop/cognition/request.test.ts
```

Expected: FAIL because `request.ts` does not exist.

- [ ] **Step 3: Implement the frozen request builder**

Use an object literal with stable property insertion order and one `JSON.stringify` call. The user message contains only `{ self, observation }`; do not pass `WorldState` into this module.

```ts
import type { BeingContext } from "../perception/types";

export const QUALIFIED_MODEL_NAME = "phi4-mini:3.8b-q4_K_M";
export const QUALIFIED_MODEL_DIGEST = "78fad5d182a7c33065e153a5f8ba210754207ba9d91973f57dffa7f487363753";
export const QUALIFIED_MODEL_IDENTITY = `ollama:${QUALIFIED_MODEL_NAME}@sha256:${QUALIFIED_MODEL_DIGEST}`;

export const WORKSHOP_SYSTEM_INSTRUCTION = [
  "You are the Being inhabiting Workshop Zero.",
  "Use only the supplied SELF and observation.",
  "Choose exactly one available action.",
  "Do not claim access to hidden world state.",
  "Prediction is optional and may refer only to generator.gauge.",
  "Intention and message must be brief.",
  "Return only the required structured decision.",
].join("\n");

export function buildOllamaRequest(context: BeingContext): string {
  return JSON.stringify({
    model: QUALIFIED_MODEL_NAME,
    messages: [
      { role: "system", content: WORKSHOP_SYSTEM_INSTRUCTION },
      { role: "user", content: JSON.stringify({ self: context.self, observation: context.observation }) },
    ],
    format: {/* exact DecisionV0 JSON Schema with additionalProperties:false at every object level */},
    stream: false,
    think: false,
    options: { temperature: 0, seed: 42, num_ctx: 4096, num_predict: 96 },
  });
}
```

Replace the shown schema comment with the complete JSON Schema object: four required top-level properties, `additionalProperties:false`, exact action `oneOf`, prediction `anyOf` null/object, integer minimum 0 maximum 12, and `maxLength:160` for strings.

- [ ] **Step 4: Run focused/full tests and production build**

```powershell
npm test -- --run src/workshop/cognition/request.test.ts
npm test -- --run
npm run build
```

Expected: all PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/workshop/cognition/request.ts src/workshop/cognition/request.test.ts
git commit -m "feat: freeze live inference request contract"
```

---

### Task 3: Add the Tauri Ollama boundary and exact model verification

**Files:**
- Create: `src-tauri/src/model.rs`
- Create: `src-tauri/src/model_tests.rs`
- Create: `src/workshop/model/types.ts`
- Create: `src/workshop/model/tauriLocalModel.ts`
- Create: `src/workshop/model/tauriLocalModel.test.ts`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`

**Interfaces:**
- Produces Rust commands:
  - `verify_local_model() -> Result<ModelVerification, String>`
  - `infer_local_model(request_json: String) -> Result<ModelAttemptResult, String>`
- Produces TS port:

```ts
export interface LocalModelPort {
  verify(): Promise<ModelVerification>;
  infer(requestJson: string): Promise<ModelAttemptResult>;
}
```

- [ ] **Step 1: Write pure Rust RED tests before HTTP implementation**

Add tests for tag classification, outbound model-name validation, and SHA-256 stability.

```rust
#[test]
fn qualified_tag_is_ready_only_when_name_and_full_digest_match() {
    let tags = serde_json::json!({"models": [{
        "name": QUALIFIED_MODEL_NAME,
        "digest": QUALIFIED_MODEL_DIGEST
    }]});
    assert_eq!(classify_tags(&tags), ProviderState::Ready);
}

#[test]
fn outbound_request_must_name_the_qualified_model() {
    let request = format!(r#"{{"model":"{}"}}"#, QUALIFIED_MODEL_NAME);
    assert!(validate_outbound_request(&request).is_ok());
    assert!(validate_outbound_request(r#"{"model":"qwen3:8b"}"#).is_err());
}

#[test]
fn request_hash_is_sha256_of_exact_transmitted_bytes() {
    assert_eq!(sha256_hex("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
}
```

- [ ] **Step 2: Run Rust tests and confirm RED**

```powershell
cd src-tauri
cargo test
cd ..
```

Expected: compile/test failure because `model` boundary does not exist.

- [ ] **Step 3: Add dependencies and model module**

Add to `src-tauri/Cargo.toml`:

```toml
reqwest = { version = "0.12", default-features = false, features = ["json", "rustls-tls"] }
sha2 = "0.10"
```

In `lib.rs` add:

```rust
mod model;
#[cfg(test)]
mod model_tests;
```

and register:

```rust
verify_local_model,
infer_local_model,
```

alongside the existing persistence commands.

- [ ] **Step 4: Implement `model.rs` with structured provider states**

Use these exact serialized state values:

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ProviderState {
    Checking,
    Ready,
    Unavailable,
    ModelMissing,
    ModelMismatch,
    Recovering,
    ReadyToRetry,
}
```

`verify_local_model` performs GET `/api/version` then GET `/api/tags`, never `/api/chat`. It returns `Unavailable` for transport failure, `ModelMissing` when the exact name is absent, `ModelMismatch` when the name exists with another digest, and `Ready` only on exact full digest match.

`infer_local_model` must:

1. reject a request whose JSON `model` is not exactly `QUALIFIED_MODEL_NAME` before network transmission;
2. hash the exact `request_json.as_bytes()` with SHA-256;
3. record UTC `started_at` and monotonic elapsed time;
4. POST exactly once to `http://127.0.0.1:11434/api/chat` with content type `application/json` and the exact request string body;
5. make zero retries;
6. return a structured `provider-error` result for transport/non-2xx errors while preserving `request_sha256`;
7. on success, preserve the raw response text and parse only enough to expose `message.content` for TypeScript validation.

Use a result shape equivalent to:

```rust
pub struct ModelAttemptResult {
    pub state: String, // "completed" | "provider-error"
    pub request_sha256: String,
    pub started_at: String,
    pub finished_at: String,
    pub elapsed_ms: u64,
    pub raw_response_json: Option<String>,
    pub assistant_content: Option<String>,
    pub error_type: Option<String>,
    pub error_message: Option<String>,
}
```

Do not persist Ollama `thinking` fields separately. The frozen request uses `think:false`.

- [ ] **Step 5: Add TypeScript model contracts and Tauri adapter**

`src/workshop/model/types.ts`:

```ts
export type ProviderState =
  | "checking" | "ready" | "unavailable" | "model-missing"
  | "model-mismatch" | "recovering" | "ready-to-retry";

export interface ModelVerification {
  state: ProviderState;
  ollamaVersion: string | null;
  modelName: string;
  expectedDigest: string;
  observedDigest: string | null;
}

export interface ModelAttemptResult {
  state: "completed" | "provider-error";
  requestSha256: string;
  startedAt: string;
  finishedAt: string;
  elapsedMs: number;
  rawResponseJson: string | null;
  assistantContent: string | null;
  errorType: string | null;
  errorMessage: string | null;
}

export interface LocalModelPort {
  verify(): Promise<ModelVerification>;
  infer(requestJson: string): Promise<ModelAttemptResult>;
}
```

`tauriLocalModel.ts` maps only to `verify_local_model` and `infer_local_model`.

- [ ] **Step 6: Test the TS invoke mapping**

Mock `@tauri-apps/api/core` and assert `infer()` invokes exactly once with `{ requestJson }`; assert `verify()` has no chat payload.

```powershell
npm test -- --run src/workshop/model/tauriLocalModel.test.ts
cd src-tauri
cargo test
cargo check
cd ..
```

Expected: all PASS; no live Ollama request is required by unit tests.

- [ ] **Step 7: Commit**

```powershell
git add src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src-tauri/src/model.rs src-tauri/src/model_tests.rs src/workshop/model
git commit -m "feat: add local Phi-4 model boundary"
```

---

### Task 4: Add episodes and append-only turn evidence to SQLite

**Files:**
- Modify: `src-tauri/src/persistence.rs`
- Modify: `src-tauri/src/persistence_tests.rs`
- Modify: `src/workshop/persistence/types.ts`
- Modify: `src/workshop/persistence/tauriPersistence.ts`
- Modify existing test fixtures that construct `PersistedWorkshop` to include `activeEpisodeId`.

**Interfaces:**
- Existing `WorkshopPersistence` remains usable by `KernelWorkshopProvider`.
- Add:

```ts
export interface LiveWorkshopPersistence extends WorkshopPersistence {
  recordTurn(request: PersistTurnRequest): Promise<void>;
  resetEpisode(): Promise<PersistedWorkshop>;
}
```

- Rust commands:
  - `record_workshop_turn`
  - `reset_workshop_episode`

- [ ] **Step 1: Write RED Rust tests for schema migration and episode identity**

Extend `persistence_tests.rs` so initialization asserts:

```rust
assert_eq!(first.identity.cognitive_model, QUALIFIED_MODEL_IDENTITY);
assert!(!first.active_episode_id.is_empty());
assert_eq!(first.active_episode_id, second.active_episode_id);
```

Add a migration test that creates the pre-Live-Inference `workshop_identity` and `workshop_runtime` tables without `active_episode_id`, runs `initialize_connection`, and proves the original SELF/world values survive while an active episode is backfilled.

- [ ] **Step 2: Write RED atomic evidence tests**

Add three tests:

1. accepted turn inserts one `workshop_turns` row and updates snapshot in the same transaction;
2. rejected/provider-error turn inserts evidence but leaves snapshot byte-equivalent;
3. reset closes the old episode, creates a different active episode, preserves `being_id`, preserves old turns, and returns tick 0/charge 8/lamp off/no generator reading/probe index 0.

Use in-memory SQLite only; no Tauri app handle.

- [ ] **Step 3: Run Rust tests and confirm RED**

```powershell
cd src-tauri
cargo test persistence
cd ..
```

Expected: failures because episode/turn schema and commands do not exist.

- [ ] **Step 4: Extend the schema without deleting existing databases**

Create:

```sql
CREATE TABLE IF NOT EXISTS workshop_episodes (
    episode_id TEXT PRIMARY KEY,
    being_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NULL,
    world_id TEXT NOT NULL,
    world_rules_version TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'closed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS workshop_one_active_episode
ON workshop_episodes(status)
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS workshop_turns (
    turn_id TEXT PRIMARY KEY,
    episode_id TEXT NOT NULL,
    being_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    finished_at TEXT NOT NULL,
    model_name TEXT NOT NULL,
    model_digest TEXT NOT NULL,
    being_context_json TEXT NOT NULL,
    request_sha256 TEXT NOT NULL,
    response_json TEXT NULL,
    validation_status TEXT NOT NULL CHECK (validation_status IN ('accepted','rejected','provider-error')),
    validation_error TEXT NULL,
    accepted_action_json TEXT NULL,
    world_before_json TEXT NOT NULL,
    world_after_json TEXT NULL,
    provider_status TEXT NOT NULL,
    elapsed_ms INTEGER NOT NULL CHECK (elapsed_ms >= 0),
    FOREIGN KEY (episode_id) REFERENCES workshop_episodes(episode_id)
);
```

For an existing `workshop_runtime`, inspect `PRAGMA table_info(workshop_runtime)` and execute exactly once when absent:

```sql
ALTER TABLE workshop_runtime ADD COLUMN active_episode_id TEXT NULL;
```

Then create/backfill one active episode and set `active_episode_id`. New databases should also use the same column.

Migrate SELF substrate only under this rule:

```text
if cognitive_model == "not-installed": update to QUALIFIED_MODEL_IDENTITY
if cognitive_model == QUALIFIED_MODEL_IDENTITY: preserve it
otherwise: return an initialization error; do not silently overwrite another substrate identity
```

- [ ] **Step 5: Implement atomic turn persistence**

Define a serializable `PersistTurnRequest` matching the TS contract. Enforce in Rust:

```text
accepted      => accepted_action_json, world_after_json, and snapshot are required
rejected      => accepted_action_json/world_after_json/snapshot must be absent
provider-error=> accepted_action_json/world_after_json/snapshot must be absent
```

`record_turn_to_connection` begins one SQLite transaction. For `accepted`, insert the turn then update `workshop_runtime` before commit. For rejected/provider-error, insert only the turn before commit. Any validation/SQL failure rolls the transaction back.

Generate `turn_id` in Rust/SQLite as `turn-` plus 16 random bytes in lowercase hex.

- [ ] **Step 6: Implement transactional episode reset**

Within one transaction:

```sql
UPDATE workshop_episodes SET status='closed', ended_at=<now> WHERE episode_id=<active> AND status='active';
INSERT INTO workshop_episodes (...) VALUES (<new-id>, ..., 'active');
UPDATE workshop_runtime SET tick=0, charge=8, lamp_switch='off', generator_visible_reading=NULL, generator_reading_tick=NULL, probe_index=0, active_episode_id=<new-id> WHERE singleton=1;
```

Return the freshly loaded `PersistedWorkshop` after commit.

- [ ] **Step 7: Extend TypeScript persistence contracts**

`PersistedWorkshop` becomes:

```ts
export interface PersistedWorkshop {
  identity: WorkshopIdentity;
  snapshot: PersistenceSnapshot;
  activeEpisodeId: string;
}
```

Add concrete `PersistTurnRequest` with the exact evidence fields from the spec plus `snapshot: PersistenceSnapshot | null`.

Keep the existing `saveSnapshot()` method for the deterministic `KernelWorkshopProvider`; add `recordTurn()` and `resetEpisode()` on `LiveWorkshopPersistence` and implement them in `tauriWorkshopPersistence` through `record_workshop_turn` and `reset_workshop_episode`.

- [ ] **Step 8: Run all persistence/frontend compatibility gates**

```powershell
cd src-tauri
cargo test
cargo check
cd ..
npm test -- --run
npm run build
```

Expected: all existing deterministic-provider tests plus new persistence tests PASS.

- [ ] **Step 9: Commit**

```powershell
git add src-tauri/src/persistence.rs src-tauri/src/persistence_tests.rs src/workshop/persistence src/App.test.tsx src/workshop/runtime/*.test.tsx
git commit -m "feat: persist Workshop episodes and turn evidence"
```

Only include existing test files in this commit if they required the new `activeEpisodeId` fixture field.

---

### Task 5: Implement the pure one-turn controller

**Files:**
- Create: `src/workshop/runtime/turnController.ts`
- Create: `src/workshop/runtime/turnController.test.ts`

**Interfaces:**
- Consumes: `WorkshopIdentity`, runtime world/generator/probe cursor, `LocalModelPort`, `LiveWorkshopPersistence`, `createBeingContext`, `buildOllamaRequest`, `validateDecisionV0`, `reduceWorld`.
- Produces:

```ts
export interface LiveRuntimeState {
  world: WorldState;
  generator: HistoricalGeneratorObservation;
  probeIndex: number;
  lastAction: WorldAction | null;
  intention: string | null;
  message: string | null;
}

export type TurnOutcome =
  | { state: "accepted"; runtime: LiveRuntimeState }
  | { state: "rejected"; error: string; runtime: LiveRuntimeState }
  | { state: "provider-error"; error: string; runtime: LiveRuntimeState };

export async function runCognitiveTurn(input: RunTurnInput): Promise<TurnOutcome>;
```

- [ ] **Step 1: Write RED tests with in-memory fake ports**

Test exact behaviors:

```ts
it("accepted decision performs one request, one transition, and one atomic persistence call", async () => {
  // model.infer call count === 1
  // outcome.runtime.world.tick === previous.tick + 1
  // persistence.recordTurn call count === 1
  // persisted validationStatus === "accepted"
});

it("schema rejection records evidence and advances zero ticks", async () => {
  // completed provider attempt returns malformed assistantContent
  // world object equals input world
  // persisted snapshot === null
});

it("provider error records evidence and advances zero ticks", async () => {
  // provider-error attempt
  // model.infer call count === 1
  // no automatic second call
});
```

Also assert that the `BeingContext` stored in evidence has no canonical `charge` key.

- [ ] **Step 2: Run and confirm RED**

```powershell
npm test -- --run src/workshop/runtime/turnController.test.ts
```

Expected: FAIL because controller does not exist.

- [ ] **Step 3: Implement accepted-turn flow**

The controller must snapshot current state before calling the model, build exactly one request, and call `model.infer(requestJson)` exactly once.

On a completed provider result:

```ts
const parsed: unknown = JSON.parse(attempt.assistantContent ?? "");
const validation = validateDecisionV0(parsed);
```

If accepted:

```ts
const transition = reduceWorld(current.world, validation.decision.action);
const nextGenerator = transition.observation.generatorReading === null
  ? current.generator
  : {
      visibleReading: transition.observation.generatorReading,
      readingTick: transition.observation.observationTick,
    };
```

Build the next `PersistenceSnapshot`, preserving the current legacy `probeIndex`, then call `recordTurn()` once with `validationStatus:"accepted"` and that snapshot. Return/publish nothing until that promise resolves.

- [ ] **Step 4: Implement rejected/provider-error flow**

For malformed JSON or `validateDecisionV0(...).ok === false`, call `recordTurn()` with `validationStatus:"rejected"`, `snapshot:null`, `worldAfterJson:null`, and return the original runtime unchanged.

For `attempt.state === "provider-error"`, call `recordTurn()` with `validationStatus:"provider-error"`, no snapshot/world-after/action, and return the original runtime unchanged.

Do not catch a persistence failure as a normal turn outcome; allow it to reject so the provider can enter a persistence error state without publishing a new world.

- [ ] **Step 5: Run focused/full suites**

```powershell
npm test -- --run src/workshop/runtime/turnController.test.ts
npm test -- --run
npm run build
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/workshop/runtime/turnController.ts src/workshop/runtime/turnController.test.ts
git commit -m "feat: add serialized cognitive turn controller"
```

---

### Task 6: Build `LiveWorkshopProvider` state machine, pacing, and recovery

**Files:**
- Create: `src/workshop/runtime/LiveWorkshopProvider.tsx`
- Create: `src/workshop/runtime/LiveWorkshopProvider.test.tsx`
- Modify: `src/workshop/playback.ts`

**Interfaces:**
- `LiveWorkshopProvider` accepts injectable `persistence?: LiveWorkshopPersistence` and `model?: LocalModelPort` for tests.
- `useLiveWorkshop()` exposes:

```ts
{
  state: WorkshopViewState;
  controls: WorkshopPlaybackControls;
  isPaused: boolean;
  isReady: boolean;
  providerState: ProviderState;
  statusLabel: string;
  activeEpisodeId: string | null;
  identity: WorkshopIdentity | null;
  beingContext: BeingContext | null;
}
```

- [ ] **Step 1: Write RED provider tests for startup/Step**

With fake persistence/model ports assert:

- startup loads persistence first, then verifies model;
- exact `ready` verification enables Step but remains paused;
- Step calls one inference and advances one tick only after persistence resolves;
- rejected/provider-error turn keeps tick unchanged and pauses.

- [ ] **Step 2: Write RED provider tests for Resume/Pause cadence**

Use fake timers. A successful Resume turn must not start the second inference until at least 1600 ms after the first turn completes. Set a deferred `recordTurn` promise and assert no second inference begins while persistence is unresolved.

Pause while a turn is in flight must allow that turn to finish but prevent scheduling the next turn.

- [ ] **Step 3: Write RED recovery tests**

Assert:

- provider failure changes provider state away from ready and pauses;
- no model inference is retried automatically;
- automatic `verify()` is called after 5000 ms;
- successful automatic verification sets `ready-to-retry` but does not call `infer()`;
- `reconnect()` invokes `verify()` immediately and never invokes `infer()`;
- Step/Resume from `ready-to-retry` authorizes a new single inference.

- [ ] **Step 4: Write RED reset test**

`reset()` calls `persistence.resetEpisode()` exactly once, publishes the returned canonical tick-0 runtime only after persistence resolves, preserves SELF, changes `activeEpisodeId`, clears latest intention/message/action, and remains paused.

- [ ] **Step 5: Implement provider orchestration**

Use refs to enforce serialization:

```ts
const inFlightRef = useRef(false);
const pausedRef = useRef(true);
const nextTurnTimerRef = useRef<number | null>(null);
```

Use `setTimeout`, never `setInterval`, for Resume. Schedule the next turn only after the prior `runCognitiveTurn()` promise has completed and 1600 ms has elapsed.

Provider verification uses a separate 5000 ms recovery timer when readiness is lost. Health verification must never call `runCognitiveTurn`.

Map UI phases without changing `WorkshopViewState`:

```text
inference in flight => deciding
paused             => paused
last accepted observe => observing
last accepted toggle  => acting
last accepted wait/null=> idle
persistence/provider terminal error => error
```

Set `being.intention` and `being.message` only from the latest accepted decision. Derive attention from the accepted action exactly as the current deterministic provider does.

- [ ] **Step 6: Extend playback controls without breaking the deterministic provider**

```ts
export interface WorkshopPlaybackControls {
  pause: () => void;
  resume: () => void;
  step: () => void;
  reset: () => void;
  reconnect?: () => void;
}
```

`KernelWorkshopProvider` requires no behavior change because `reconnect` is optional.

- [ ] **Step 7: Run provider/full gates**

```powershell
npm test -- --run src/workshop/runtime/LiveWorkshopProvider.test.tsx
npm test -- --run
npm run build
```

Expected: all PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/workshop/runtime/LiveWorkshopProvider.tsx src/workshop/runtime/LiveWorkshopProvider.test.tsx src/workshop/playback.ts
git commit -m "feat: add live Workshop cognition runtime"
```

---

### Task 7: Switch the production UI to live cognition and expose Reconnect

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/workshop/components/WorkshopScene.tsx`
- Modify: `src/workshop/components/OperatorControls.tsx`
- Modify: `src/App.css` only if the existing generic operator-control button styles do not already cover Reconnect.

**Interfaces:**
- Production `App` uses `LiveWorkshopProvider`.
- `WorkshopApplication` keeps injectable live ports for UI tests:

```ts
interface WorkshopApplicationProps {
  persistence?: LiveWorkshopPersistence;
  model?: LocalModelPort;
}
```

- [ ] **Step 1: Rewrite App tests to the live production seam and confirm RED**

Replace probe-count assertions (`kernel 0/7`) with live status semantics. Provide `AppMemoryPersistence` implementing the live persistence methods and a fake model that returns a valid `DecisionV0`.

Required UI tests:

```text
startup => paused, tick 0, status contains phi4-mini ready
Step => one model call, tick 1, accepted message appears
provider unavailable => tick unchanged, Reconnect visible
Reconnect success => status ready to retry, no inference call
Reset => same being identity, different active episode, tick 0
```

- [ ] **Step 2: Run App test and confirm RED**

```powershell
npm test -- --run src/App.test.tsx
```

Expected: FAIL while App still uses `KernelWorkshopProvider`.

- [ ] **Step 3: Add conditional Reconnect control**

`OperatorControls` receives an explicit `showReconnect` boolean (or equivalent provider readiness prop) and renders:

```tsx
{showReconnect && controls.reconnect && (
  <button type="button" onClick={controls.reconnect}>Reconnect</button>
)}
```

Do not overload Resume to perform infrastructure verification.

- [ ] **Step 4: Switch App to `LiveWorkshopProvider`**

Remove production references to `probeIndex`/`probeLength`. Use `statusLabel` from the live provider. Preserve `WorkshopScene` layout and frozen `WorkshopViewState` props.

The deterministic `KernelWorkshopProvider` and `developmentProbe.ts` remain in the repository for reference/tests.

- [ ] **Step 5: Run UI/full/build gates**

```powershell
npm test -- --run src/App.test.tsx
npm test -- --run
npm run build
```

Expected: all PASS; no probe-specific production status remains.

- [ ] **Step 6: Commit**

```powershell
git add src/App.tsx src/App.test.tsx src/App.css src/workshop/components/WorkshopScene.tsx src/workshop/components/OperatorControls.tsx
git commit -m "feat: connect Workshop UI to live cognition"
```

If `App.css` was not changed, omit it from `git add`.

---

### Task 8: Run the exact local model smoke test and failure/recovery proof

**Files:**
- No production code should be added merely to pass this task.
- If a genuine defect is found, stop and use the systematic-debugging workflow before changing code.

**Interfaces:**
- Uses the installed exact Phi-4 model and the production Tauri app.
- Produces manual acceptance evidence in terminal/video plus durable SQLite rows.

- [ ] **Step 1: Run all automated qualification gates from a clean worktree**

```powershell
cd "C:\Users\nolan\AIProjects\workshop-zero"
git status --short
npm test -- --run
npm run build
Push-Location src-tauri
cargo test
cargo check
Pop-Location
```

Expected: clean worktree before commands; all tests/build/checks PASS.

- [ ] **Step 2: Verify local Ollama/model before launching the app**

```powershell
ollama list
```

Expected to include exact model name `phi4-mini:3.8b-q4_K_M`. The app itself remains responsible for verifying the full digest before enabling cognition.

- [ ] **Step 3: Launch Workshop Zero**

```powershell
npm run tauri dev
```

Expected startup behavior:

```text
paused
provider status = phi4-mini ready
tick restored from current active episode
no inference occurs until Step or Resume
```

- [ ] **Step 4: Prove one live Step**

Click `Step` exactly once. Verify:

```text
phase enters deciding
one model inference occurs
valid action accepted
tick increases by exactly 1
intention/message may appear
world change matches deterministic kernel consequence
runtime returns paused after the one Step
```

- [ ] **Step 5: Prove autonomous Resume/Pause**

Click Resume, observe several turns, then Pause. Verify turns are visibly serialized, no overlapping rapid burst occurs, and Pause prevents the next turn while allowing an already-started turn to finish.

- [ ] **Step 6: Prove restart persistence**

Close the application, relaunch it, and verify the same SELF and current world/runtime are restored paused with no catch-up ticks.

- [ ] **Step 7: Prove Reset episode semantics**

Record current tick, click Reset, and verify tick returns to 0 while SELF remains unchanged. Use the SQLite inspection in Step 9 to prove a new episode was created and prior turns remain.

- [ ] **Step 8: Prove provider failure/recovery without cognitive retry**

While Workshop is paused/ready, stop Ollama, then authorize a Step so one inference attempt fails. Verify:

```text
world tick unchanged
runtime paused
Reconnect visible
no automatic inference retry occurs
```

Restart Ollama. Wait for automatic health recovery or click Reconnect. Verify status becomes `ready to retry` and world tick remains unchanged until explicitly clicking Step or Resume.

- [ ] **Step 9: Inspect durable evidence directly**

After closing the app, use Python's stdlib SQLite support from PowerShell:

```powershell
$Db = Join-Path $env:APPDATA "com.mindsrefuge.workshopzero\workshop-zero.sqlite3"
python -c "import sqlite3,sys; db=sys.argv[1]; c=sqlite3.connect(db); print('identity=', c.execute('select being_id,cognitive_model from workshop_identity').fetchall()); print('episodes=', c.execute('select episode_id,status,started_at,ended_at from workshop_episodes order by started_at').fetchall()); print('turns=', c.execute('select turn_id,episode_id,validation_status,request_sha256,world_before_json,world_after_json from workshop_turns order by rowid').fetchall())" "$Db"
```

Expected:

- exactly one SELF row with qualified cognitive model identity;
- at least two episode rows after Reset, only one active;
- accepted turn rows contain non-null `world_after_json`;
- rejected/provider-error row contains null `world_after_json`;
- request SHA-256 values are present;
- historical turns remain after Reset.

- [ ] **Step 10: Final repository verification and commit any test-only fixes already justified by failing evidence**

```powershell
git status --short
git log --oneline --decorate -8
```

If the worktree is clean and all acceptance checks passed, do not create an empty commit.

---

## Final Acceptance Gate

Live Inference V0 is complete only when all of these are evidenced:

```text
[ ] exact qualified Phi-4 name + full digest verified before inference
[ ] exactly one /api/chat request per cognitive turn
[ ] zero automatic inference retries
[ ] malformed/rejected output advances zero ticks
[ ] provider outage advances zero ticks
[ ] Reconnect performs verification only
[ ] automatic health recovery performs no inference
[ ] accepted action advances exactly one tick
[ ] accepted evidence + runtime snapshot commit atomically
[ ] rejected/provider-error evidence persists without snapshot mutation
[ ] Reset preserves SELF/history and creates a new episode
[ ] Resume is serialized with >=1600 ms post-turn spacing
[ ] Step executes exactly one cognitive turn
[ ] restart restores current episode/runtime paused with no catch-up
[ ] frozen WorkshopViewState contract remains unchanged
[ ] deterministic development probe remains available for tests/reference
[ ] frontend tests pass
[ ] production frontend build passes
[ ] Rust tests pass
[ ] cargo check passes
[ ] manual local-model smoke/recovery sequence passes
```

## Commit Sequence

The intended reviewable history is:

```text
feat: add live decision validation
feat: freeze live inference request contract
feat: add local Phi-4 model boundary
feat: persist Workshop episodes and turn evidence
feat: add serialized cognitive turn controller
feat: add live Workshop cognition runtime
feat: connect Workshop UI to live cognition
```

Do not squash during implementation. Each commit is an independent review checkpoint and should be green before proceeding to the next task.
