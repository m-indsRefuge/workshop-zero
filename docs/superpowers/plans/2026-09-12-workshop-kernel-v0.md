# Workshop Kernel V0 Implementation Plan

**Goal:** Add the first authoritative deterministic Workshop world without changing the Astra UI or replacing the mock provider.

**Architecture:** A pure TypeScript kernel owns canonical world state and accepted world transitions. It has no React, Tauri, persistence, model, memory, or UI dependencies.

## V0 rules

- Initial state: tick 0, charge 8, lamp switch off.
- Charge is clamped to 0..12.
- Every accepted action advances exactly one tick.
- A toggle applies before resource accounting.
- Every tick restores 1 charge.
- An on lamp consumes 3 charge per tick.
- The lamp is lit only when switched on and resulting charge is greater than zero.
- observe(generator) returns the resulting charge reading for that tick.
- wait() and toggle(lamp) do not expose a generator reading.
- Same prior state plus same action must always produce the same transition.
- Do not connect the kernel to the UI in this change.

## Files

- `src/workshop/kernel/types.ts`
- `src/workshop/kernel/world.ts`
- `src/workshop/kernel/world.test.ts`

## Acceptance

Run:

- `npm run test:run`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`