# Workshop Zero — Live Inference V0 Design

**Status:** Approved design, frozen for implementation planning  
**Date:** 2026-09-12  
**Target branch:** `feature/workshop-model-qualification-v0`  
**Qualified cognitive core:** `phi4-mini:3.8b-q4_K_M`  
**Qualified model digest:** `78fad5d182a7c33065e153a5f8ba210754207ba9d91973f57dffa7f487363753`

## 1. Purpose

Live Inference V0 replaces the production development-probe loop with a real local cognitive turn loop while preserving Workshop Zero's deterministic world kernel and strict trust boundaries.

The Being receives only its durable SELF and permitted observation, asks the exact qualified local Phi-4 Mini artifact for one structured decision, validates that decision without repair, applies at most one accepted world action through the deterministic kernel, persists the causal evidence and resulting snapshot atomically, and then publishes the new UI state.

The core invariant is:

```text
one BeingContext
→ one model request
→ one validation result
→ at most one world transition
→ one durable turn record
```

A model response does not change the world merely because the model produced it.

## 2. Goals

Live Inference V0 must:

- make Phi-4 Mini the first live cognitive substrate for the Being;
- preserve the existing deterministic world rules unchanged;
- keep canonical world truth separate from the Being's observations and claims;
- permit exactly one model request per cognitive turn and zero automatic inference retries;
- ensure rejected, malformed, or failed inference advances zero ticks;
- support Step, Resume, Pause, Reset, and Reconnect with explicit semantics;
- serialize all cognitive turns so inference calls never overlap;
- persist append-only evidence for accepted, rejected, and failed turns;
- introduce durable world episodes while preserving one durable SELF;
- verify the exact qualified model name and digest before inference;
- restore the current episode/runtime paused after application restart;
- preserve the frozen `WorkshopViewState` contract;
- preserve the development probe as a deterministic test/reference path.

## 3. Non-goals

Live Inference V0 does not add:

- long-term memory retrieval;
- beliefs or belief updates;
- self-modification;
- generated skills or programs;
- training, adapters, checkpoint promotion, or recursive improvement;
- vector retrieval or RAG;
- cloud inference;
- multiple models or provider routing;
- hidden fallback actions;
- automatic repair of malformed model output;
- automatic replay of failed inference;
- background life while the application is closed;
- changes to canonical world physics.

Turn evidence is durable history, not yet memory available to the Being.

## 4. Architecture

The production live path is a dedicated cognition runtime rather than an in-place expansion of `KernelWorkshopProvider`.

```text
LiveWorkshopProvider
        |
        v
TurnController
  |     |      |
  |     |      +--> TurnEvidence / Persistence
  |     |
  |     +----------> DecisionValidator
  |
  +----------------> LocalModelAdapter
        |
        v
     Tauri
        |
        v
   Ollama / Phi-4 Mini
        |
        v
accepted WorldAction
        |
        v
 deterministic reduceWorld()
```

### 4.1 `LiveWorkshopProvider`

Owns React-facing orchestration only:

- current projected `WorkshopViewState`;
- pause/resume state;
- Step/Resume/Pause/Reset/Reconnect controls;
- provider readiness state;
- current runtime snapshot and identity loaded from persistence;
- scheduling of serialized autonomous turns;
- 1600 ms minimum spacing between completed autonomous turns;
- UI-facing status text.

It must not implement Ollama transport, schema validation, or world physics.

### 4.2 `TurnController`

Owns exactly one cognitive turn:

1. capture the current permitted `BeingContext`;
2. build the deterministic inference request;
3. make exactly one model inference request;
4. validate the returned decision;
5. if accepted, apply exactly one `WorldAction` through `reduceWorld()`;
6. construct turn evidence;
7. persist evidence and, for accepted turns, the resulting runtime snapshot;
8. return the completed turn outcome to the provider.

The controller is UI-independent and must not know about JSX or layout.

### 4.3 `LocalModelAdapter`

Owns the local model boundary only:

- Tauri command invocation from TypeScript;
- Ollama health/model verification in Rust;
- exact model/digest checking;
- request transmission;
- transport/provider error classification;
- response metadata required for evidence.

React must never call Ollama directly.

### 4.4 `DecisionValidator`

A pure deterministic validator. It:

- validates exact schema and values;
- rejects unknown fields;
- performs no repair or coercion;
- returns an accepted typed decision or structured rejection.

### 4.5 Deterministic world kernel

The existing world kernel remains the sole authority for world consequences. `reduceWorld()` is not modified to accommodate the model.

The development probe remains available for deterministic tests/reference but is not the production cognition source once Live Inference V0 is enabled.

## 5. Live Decision V0 contract

The model must return exactly one structured object:

```ts
interface DecisionV0 {
  action:
    | { kind: "observe"; target: "generator" }
    | { kind: "toggle"; target: "lamp" }
    | { kind: "wait" };

  prediction:
    | null
    | {
        sensor: "generator.gauge";
        expectedValue: number; // integer 0..12
      };

  intention: string | null;
  message: string | null;
}
```

`intention` and `message` are limited to 160 characters each.

### 5.1 Authority split

Authoritative:

- `action`

Non-authoritative:

- `prediction`
- `intention`
- `message`

Only the validated action can reach the world kernel.

A textual claim such as "I think the charge is 8" may appear as expression but does not become world truth, memory, belief, or kernel state.

### 5.2 Validation rules

Reject the complete decision if any of the following is true:

- malformed JSON;
- missing required field;
- unknown field;
- unsupported action kind;
- unsupported action target;
- prediction sensor other than `generator.gauge`;
- prediction value is not an integer in `0..12`;
- type coercion would be required;
- `intention` or `message` exceeds 160 characters;
- schema contains any additional unsupported structure.

Validation never calls the model again and never repairs output.

On rejection:

- evidence is preserved;
- world tick is unchanged;
- runtime snapshot is unchanged;
- runtime pauses;
- there is no automatic inference retry.

## 6. Model identity and qualification binding

The active cognitive substrate is exactly:

```text
model: phi4-mini:3.8b-q4_K_M
digest: 78fad5d182a7c33065e153a5f8ba210754207ba9d91973f57dffa7f487363753
parameter size: 3.8B
quantization: Q4_K_M
```

Startup must verify both exact model name and exact full digest before enabling inference.

If Ollama is reachable but the model is missing or the digest differs, Workshop remains paused and inference is disabled.

The Being's durable `being_id` remains its identity. The cognitive model is a substrate, not the identity itself.

To preserve the existing identity/perception shape, the existing `cognitive_model` field should encode the exact artifact identity, for example:

```text
ollama:phi4-mini:3.8b-q4_K_M@sha256:78fad5d182a7c33065e153a5f8ba210754207ba9d91973f57dffa7f487363753
```

Per-turn evidence also stores model name and full digest separately.

## 7. Prompt and request construction

Every inference request is deterministically built from only:

- fixed V0 system instruction;
- durable SELF from `BeingContext`;
- current permitted observation from `BeingContext`;
- current available actions;
- fixed `DecisionV0` schema;
- frozen inference configuration.

The request must never include:

- canonical numeric charge;
- hidden world equations or rates;
- raw SQLite state;
- episode history;
- prior raw model responses;
- persistence internals;
- development probe position;
- operator controls;
- hidden runtime/backend metadata.

The fixed system instruction is behavioral, not explanatory. It should state, in substance:

```text
You are the Being inhabiting Workshop Zero.
Use only the supplied SELF and observation.
Choose exactly one available action.
Do not claim access to hidden world state.
Prediction is optional and may refer only to generator.gauge.
Intention and message must be brief.
Return only the required structured decision.
```

The prompt must not teach the hidden generator/lamp equations. Those relationships are to be discovered from permitted experience in later phases.

### 7.1 Frozen inference settings

Use the same settings that qualified the model:

```text
temperature: 0
seed: 42
num_ctx: 4096
num_predict: 96
think: false
stream: false
structured JSON schema: DecisionV0
```

### 7.2 Request identity

Before transmission, serialize the complete provider request canonically and compute SHA-256. Store that request hash in turn evidence.

## 8. Runtime control semantics

### Step

Executes exactly one complete cognitive turn.

If the turn is accepted, the world advances exactly one tick. If inference fails or validation rejects, the world advances zero ticks and the runtime pauses.

### Resume

Starts autonomous serialized cognition:

```text
turn
→ persist
→ publish
→ wait until minimum cadence is satisfied
→ next turn
```

There are no overlapping inference requests.

### Pause

Stops before the next cognitive turn begins. A turn already in progress is allowed to finish its current bounded operation and persist its result; V0 does not require transport cancellation.

### Reset

Preserves SELF and historical evidence, closes the current world episode, creates a new episode, and restores canonical world state at tick 0.

### Reconnect

Performs immediate infrastructure/model verification only. It never resends a failed inference request and never advances the world.

## 9. Turn pacing

Autonomous Resume mode uses a fixed V0 minimum cadence of 1600 ms between completed turns.

Model inference time is not replaced by this delay. The next turn begins only after:

1. the prior turn has completed;
2. its required persistence transaction has committed;
3. its UI state has been published;
4. at least 1600 ms has elapsed since completion.

This is intentionally fixed in V0 rather than user-configurable.

## 10. Connectivity and recovery

Provider readiness is tracked separately from `WorkshopViewState` so the frozen view-state contract does not need expansion.

Recommended provider states:

```text
checking
ready
unavailable
model-missing
model-mismatch
recovering
ready-to-retry
```

### 10.1 Startup

```text
load SELF + current runtime
→ verify Ollama reachability
→ verify exact model name + digest
→ READY
```

Until verification succeeds, cognition remains paused.

### 10.2 Provider/inference failure

If an inference request fails because the provider is unavailable or transport fails:

- append failed turn evidence;
- leave world/runtime snapshot unchanged;
- pause cognition;
- enter inference error/provider unavailable state;
- start lightweight automatic health checks.

### 10.3 Automatic infrastructure recovery

While unavailable, run a lightweight local health/model check every 5 seconds.

These checks:

- perform no model inference;
- advance zero ticks;
- do not mutate world state;
- do not replay the failed prompt.

When the provider and exact model are available again, transition to `ready-to-retry`. The user must then use Resume or Step to authorize a new cognitive request.

### 10.4 Manual Reconnect

Reconnect triggers the same health/model verification immediately instead of waiting for the next 5-second probe.

Infrastructure recovery may restore readiness but may never silently advance cognition.

## 11. Persistence model

SQLite expands from identity + current snapshot into identity + episodes + append-only turn evidence + current snapshot.

### 11.1 `workshop_identity`

Remains the single durable SELF row.

Reset never replaces it.

### 11.2 `workshop_episodes`

One row per world episode, with at minimum:

```text
episode_id
being_id
started_at
ended_at | null
world_id
world_rules_version
status
```

The first live startup creates an episode if no current episode exists.

### 11.3 `workshop_turns`

Append-only evidence for every attempted cognitive turn, including accepted, rejected, and provider-failed turns.

At minimum:

```text
turn_id
episode_id
being_id
started_at
finished_at
model_name
model_digest
being_context_json
request_sha256
response_json | null
validation_status
validation_error | null
accepted_action_json | null
world_before_json
world_after_json | null
provider_status
elapsed_ms
```

Raw response evidence may be stored only to the extent needed for deterministic audit. Hidden provider reasoning fields, if any, must not be intentionally persisted as cognitive evidence.

### 11.4 Current runtime snapshot

The existing singleton runtime remains the fast startup source and gains a link to the active episode.

The existing development-probe cursor may remain for the deterministic reference provider, but the live cognition controller must not depend on it.

## 12. Transaction boundaries

### 12.1 Accepted turn

```text
valid decision
→ reduceWorld(current, action)
→ BEGIN TRANSACTION
→ append accepted turn evidence
→ update runtime snapshot to resulting world/observation
→ COMMIT
→ publish UI state
```

If the transaction fails, the new world state is not published.

### 12.2 Rejected or failed turn

```text
rejected decision / provider failure
→ BEGIN TRANSACTION
→ append failed/rejected turn evidence only
→ COMMIT
→ pause runtime
```

The runtime snapshot is unchanged.

### 12.3 Reset

Reset is transactional:

```text
BEGIN TRANSACTION
→ close episode N
→ create episode N+1
→ write canonical runtime snapshot for N+1
→ COMMIT
→ publish paused tick-0 state
```

All prior episodes and turns remain intact.

## 13. Episode semantics

Workshop Zero has one persistent Being and multiple world episodes.

```text
Being
  ├── Episode 1
  │    ├── turn 1
  │    ├── turn 2
  │    └── ...
  ├── Reset
  └── Episode 2
       ├── turn 1
       └── ...
```

Reset changes only the world episode. It does not erase SELF or prior evidence.

This preserves the future ability to compare how the same Being behaves across fresh worlds.

## 14. UI integration

The existing room design remains intact.

The frozen `WorkshopViewState` contract is preserved.

Existing fields are used as follows:

- `phase`: `deciding`, `observing`, `acting`, `paused`, `error`, or `idle`;
- `being.intention`: latest accepted decision intention;
- `being.message`: latest accepted decision message;
- `being.attentionTarget`: derived from accepted action;
- generator/lamp/tick: projected from authoritative runtime.

Provider connectivity/recovery state is exposed through provider/controller state and the existing status/control area rather than by expanding `WorkshopViewState`.

`OperatorControls` gains a conditional Reconnect control when infrastructure/model verification is not ready.

Reconnect is distinct from Step/Resume.

## 15. Failure semantics

The following all advance zero ticks:

- provider unavailable;
- timeout/transport error;
- model missing;
- model digest mismatch;
- malformed JSON;
- schema rejection;
- unsupported action;
- persistence failure before commit;
- Reconnect;
- automatic health check.

Only a valid accepted `DecisionV0` action whose persistence transaction commits advances one tick.

No failure is converted into `wait()`.

No inference request is automatically retried.

## 16. Testing strategy

Implementation is TDD-governed. Each boundary is introduced RED → GREEN before proceeding.

### 16.1 Pure unit tests

Cover:

- DecisionV0 schema validation;
- unknown-field rejection;
- no coercion/repair;
- intention/message length bounds;
- prompt/request construction;
- hidden-state exclusion from prompt input;
- canonical request hash stability;
- provider state transitions;
- WorkshopViewState projection.

### 16.2 Runtime orchestration tests

Cover:

- one model request per cognitive turn;
- one accepted inference produces at most one transition;
- accepted action advances exactly one tick;
- rejected inference advances zero ticks;
- provider failure advances zero ticks;
- Step executes exactly one turn;
- Resume serializes turns with no overlap;
- Pause prevents the next turn;
- reconnect/health verification makes zero inference requests;
- recovery reaches ready-to-retry without resending the failed turn;
- 1600 ms minimum autonomous spacing.

### 16.3 Persistence tests

Cover:

- accepted turn evidence + runtime snapshot commit atomically;
- rejected turn appends evidence only;
- provider failure appends evidence only;
- SELF survives Reset;
- Reset closes current episode and creates the next episode;
- previous episodes/turns remain readable;
- startup restores active runtime/episode paused;
- model identity is persisted exactly.

### 16.4 Local integration smoke test

Using the exact qualified local model:

- verify Ollama;
- verify exact model name/digest;
- issue one Step;
- receive valid structured DecisionV0;
- persist turn evidence;
- advance world exactly one tick.

## 17. Acceptance criteria

Live Inference V0 is complete only when all of the following are demonstrated:

- exact qualified Phi-4 artifact verified before inference;
- one and only one inference request per cognitive turn;
- zero automatic inference retries;
- malformed/rejected output cannot advance world state;
- provider outage cannot advance world state;
- Reconnect performs health/model verification only;
- accepted action advances exactly one tick;
- accepted turn evidence and runtime snapshot are committed atomically;
- evidence exists for accepted, rejected, and provider-failed turns;
- Reset starts a new episode while preserving SELF and prior history;
- Resume executes serialized turns with at least 1600 ms spacing;
- Step executes exactly one turn;
- app restart restores the active episode/runtime paused;
- frozen WorkshopViewState remains compatible;
- frontend tests pass;
- production frontend build passes;
- Rust tests pass;
- `cargo check` passes;
- manual end-to-end smoke test passes.

## 18. Manual proof sequence

Final V0 proof:

```text
Launch
→ exact model verified
→ Step
→ inspect action/message/tick
→ Resume for several turns
→ Pause
→ close app
→ reopen
→ verify same SELF + restored runtime/episode
→ Reset
→ verify tick 0 + new episode + same SELF
→ stop/unavailable Ollama
→ verify pause + Reconnect state + zero world mutation
→ restore Ollama
→ verify READY_TO_RETRY without automatic inference
→ Step or Resume explicitly
```

## 19. Foundational invariants

The implementation must preserve these statements without exception:

```text
history ≠ memory
evidence ≠ belief
database truth ≠ Being knowledge
model output ≠ world authority
provider recovery ≠ cognitive retry
Being identity ≠ cognitive substrate
```

The deterministic kernel remains reality. The model may perceive, predict, express, and choose among allowed actions, but it cannot rewrite reality or bypass the trusted validation/persistence boundaries.
