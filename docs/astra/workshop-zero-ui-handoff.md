# Workshop Zero - Astra UI Handoff

## Your task

Transform the existing deliberately plain Workshop Zero shell into a polished,
atmospheric desktop artifact.

Do not implement cognition, memory, persistence, the deterministic world engine,
model inference, training, or self-modification.

## Architectural boundary

The UI consumes `WorkshopViewState` from `src/workshop/types.ts`.

The deterministic demonstration states live in
`src/workshop/mock/scenario.ts`.

The mock provider lives in
`src/workshop/mock/MockWorkshopProvider.tsx`.

Scene components live in `src/workshop/components/`.

Preserve the dependency direction:

Workshop runtime -> WorkshopViewState -> UI

Do not make scene components depend on the mock implementation.

## Visual goal

Workshop Zero should feel like a tiny inhabited desktop artifact, not an
analytics dashboard and not a conventional game UI.

The visible environment contains only the Being, lamp, generator, terminal,
and one room.

Use atmosphere, spatial composition, lighting, typography, restrained motion,
and state-driven transitions. Do not add features to create interest.

## State honesty

Visual behavior must correspond to supplied state.

Support and visibly differentiate idle, deciding, observing, acting, paused,
error, attention directed to lamp or generator, historical generator reading,
Being message, model-authored intention, model-reported uncertainty, and memory
supplied / cited metadata in secondary inspection.

Do not display hidden chain-of-thought.
Do not invent emotional states.
Do not add fake delays to imply deliberation.

## Controls

Retain Pause / Resume, Step, and Reset for mock demonstration.

Keep controls visually secondary to the room.

## Scope

You may substantially redesign markup and CSS inside the UI layer if the frozen
state contract remains clean and backend-independent.

Prefer lightweight CSS / SVG / native web techniques over unnecessary heavy
dependencies.

Do not add additional rooms, locomotion, inventory, crafting, RPG statistics,
achievements, large menus, networking, AI/model code, persistence, or real
world simulation.

When choosing between a new feature and making the existing room more
convincing, improve the existing room.

## Before finishing

- Run `npm run test:run`.
- Run `npm run build`.
- Run `cargo check --manifest-path src-tauri/Cargo.toml`.
- Ensure the mock sequence still exercises all important visual states.
- Summarize major visual decisions and assumptions Byte/Sol must preserve when
  replacing the mock provider with the real Workshop runtime.