# Workshop Persistence + Identity V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the authoritative Workshop runtime and create one durable SELF identity so application restart restores the same world and the same Being.

**Architecture:** Rust/Tauri owns the SQLite boundary and database path. The TypeScript kernel remains the sole owner of deterministic world transition rules. `KernelWorkshopProvider` loads one persisted snapshot at startup and transactionally saves each accepted development-probe transition before projecting it to the UI.

**Tech Stack:** Tauri 2, Rust, rusqlite with bundled SQLite, React 19, TypeScript 6, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-11-workshop-zero-v0-design.md`

## Global Constraints

- Use exactly one SQLite database in the Tauri application-data directory.
- Preserve the existing deterministic world reducer unchanged.
- Preserve the frozen `WorkshopViewState` contract unchanged.
- SELF identity is created once and survives Reset and application restart.
- Initial SELF fields: being version `0.1.0`, world id `workshop-zero`, world rules version `workshop-zero-rules-v0`, cognitive model `not-installed`.
- Persist canonical world state, last historical generator observation, and the temporary development-probe cursor.
- Persisted runtime writes are transactional.
- Reset restores canonical world state but does not replace SELF.
- Application startup is paused; closing the application causes no background simulation or catch-up ticks.
- No memory, beliefs, LLM inference, training, adapters, or self-modification in this phase.

---

### Task 1: SQLite persistence boundary and durable SELF

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Create: `src-tauri/src/persistence.rs`
- Create: `src-tauri/src/persistence_tests.rs`

**Interfaces:**
- Produces Tauri command `load_or_initialize_workshop() -> PersistedWorkshop`.
- Produces Tauri command `save_workshop_snapshot(snapshot) -> ()`.
- SELF row is immutable after first initialization.

- [ ] Write Rust tests proving first initialization creates SELF and canonical world.
- [ ] Run `cargo test` and verify RED before persistence implementation exists.
- [ ] Implement SQLite schema, validation, initialization, loading, and transactional save.
- [ ] Run `cargo test` and verify GREEN.
- [ ] Commit the Rust persistence boundary.

### Task 2: TypeScript persistence contract and Tauri adapter

**Files:**
- Create: `src/workshop/persistence/types.ts`
- Create: `src/workshop/persistence/tauriPersistence.ts`

**Interfaces:**
- `WorkshopPersistence.loadOrInitialize(): Promise<PersistedWorkshop>`
- `WorkshopPersistence.saveSnapshot(snapshot): Promise<void>`

- [ ] Define frontend types matching Rust camelCase serialization exactly.
- [ ] Implement the Tauri `invoke` adapter.
- [ ] Verify TypeScript build.

### Task 3: Kernel provider restart semantics

**Files:**
- Modify: `src/workshop/runtime/KernelWorkshopProvider.tsx`
- Create: `src/workshop/runtime/KernelWorkshopProvider.persistence.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Provider accepts optional injected `WorkshopPersistence` for tests.
- Context exposes durable identity, readiness, and persistence error state.
- Every accepted runtime transition is saved before it becomes visible.
- Reset is persisted while SELF remains unchanged.

- [ ] Write failing restart and identity tests against current provider.
- [ ] Verify RED.
- [ ] Implement startup restore and serialized transactional commit calls.
- [ ] Update App to use real Tauri persistence by default while allowing test injection.
- [ ] Verify provider and application tests GREEN.
- [ ] Run full test/build/Tauri gates.
- [ ] Commit frontend persistence integration.

## Acceptance Gate

Run:

- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm run test:run`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`

Manual restart proof:

1. Run `npm run tauri dev`.
2. Reset.
3. Step three times and confirm tick 3, lamp lit, gauge 5 observed at tick 3.
4. Close the application window.
5. Run `npm run tauri dev` again.
6. Confirm it opens paused at kernel 3/7, tick 3, lamp lit, gauge 5 observed at tick 3.
7. Reset, close, reopen, and confirm canonical tick 0 / lamp off / no observation.