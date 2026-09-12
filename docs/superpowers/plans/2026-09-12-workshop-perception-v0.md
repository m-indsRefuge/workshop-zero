# Workshop Perception V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the deterministic boundary that converts canonical Workshop reality into exactly the information the Being is permitted to know.

**Architecture:** Perception is a pure TypeScript projection. Canonical `WorldState` remains private to the kernel. The perception layer receives canonical world state, durable SELF identity, and the last permitted generator observation, then emits a `BeingContext` containing separate `self` and `observation` sections for future model inference.

**Tech Stack:** TypeScript 6, Vitest, React 19.

**Spec:** `docs/superpowers/specs/2026-09-11-workshop-zero-v0-design.md`

## Global Constraints

- Do not expose canonical numeric `charge` to the Being.
- Current tick is observable.
- Lamp switch state and whether the lamp is visibly lit are observable.
- Generator information is historical only: last permitted reading plus the tick at which that reading was observed.
- When the generator has never been observed, no reading may be fabricated.
- Available actions are exactly `observe(generator)`, `toggle(lamp)`, and `wait()`.
- Durable SELF identity is supplied separately from environment observation.
- Do not expose persistence metadata, development-probe cursor, UI phase, memory counters, operator controls, or backend implementation details.
- The same permitted inputs must always produce the same `BeingContext`.
- No prompt strings, model inference, memory retrieval, beliefs, training, or self-modification in this phase.
- Do not change the frozen `WorkshopViewState`.
- Do not alter the deterministic world reducer.
- Do not change the Astra UI.

---

### Task 1: Pure perception contract

**Files:**
- Create: `src/workshop/perception/types.ts`
- Create: `src/workshop/perception/perceive.ts`
- Create: `src/workshop/perception/perceive.test.ts`

**Produces:**
- `BeingContext`
- `BeingSelf`
- `BeingObservation`
- `HistoricalGeneratorObservation`
- `createBeingContext(identity, world, generator)`

**Required proof:**
- Worlds with different hidden charge but identical permitted visible state produce identical observations.
- Historical generator readings retain their original observation tick.
- No generator reading is invented before observation.
- Lamp switch and visible illumination are represented.
- Exactly three available actions are represented.
- SELF identity is copied separately from observation.
- Serialized observation contains no `charge`, `probeIndex`, `phase`, `memory`, or persistence data.
- Projection is deterministic and does not mutate inputs.

### Task 2: Runtime perception seam

**Files:**
- Modify: `src/workshop/runtime/KernelWorkshopProvider.tsx`
- Create: `src/workshop/runtime/KernelWorkshopProvider.perception.test.tsx`

**Produces:**
- Provider context field `beingContext: BeingContext | null`.
- Context is null while durable SELF is loading.
- Once ready, context is projected from the current authoritative runtime and identity.
- Context changes only as permitted observations/world-visible state change.

**Required proof:**
- Initial context has SELF and no fabricated generator reading.
- First observe action exposes reading 9 at tick 1.
- Lamp toggle exposes switch/illumination state but not numeric charge.
- Provider context contains no probe cursor or UI-only state inside `observation`.

## Acceptance Gate

Run:

- `npx vitest run src/workshop/perception/perceive.test.ts --reporter=verbose`
- `npx vitest run src/workshop/runtime/KernelWorkshopProvider.perception.test.tsx --reporter=verbose`
- `npm run test:run`
- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`

No manual UI behavior change is expected in this phase.