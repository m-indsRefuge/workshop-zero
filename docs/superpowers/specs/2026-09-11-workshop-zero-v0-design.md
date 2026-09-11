# Workshop Zero V0 Design

Status: Accepted for implementation on 11 September 2026.

## Goal

Build the smallest credible artificial habitat in which one persistent local
open-weight AI Being can observe a deterministic world, select bounded actions,
experience authoritative consequences, preserve evidence, and later use
remembered evidence to improve a prediction or action after restart.

## V0 world

- One room.
- One Being.
- One lamp.
- One recovering charge store / generator.
- One terminal as a visual communication surface.
- Three world actions only: observe(generator), toggle(lamp), wait().
- No movement, inventory, crafting, programming, background life, networking,
  cloud inference, training, adapters, or autonomous self-modification.

## Core boundary

The Workshop owns world physics, canonical state transitions, perception rules,
permissions, limits, evidence integrity, evaluation criteria, and later
self-modification governance.

The Being may hold revisable beliefs, self-assessments, memories, and unfinished
intentions. V0 weights, strategies, and executable skills remain frozen.

The Being cannot rewrite reality. Reality may provide evidence that later
informs how the Being proposes to rewrite itself.

## UI boundary

The renderer consumes WorkshopViewState only. The UI does not own or mutate
canonical world state. Visible activity maps to explicit runtime state; the UI
must not fabricate hidden chain-of-thought, emotions, or fake cognition.

## Completion principle

Persistence alone is not enough. V0 learning evidence eventually requires the
same frozen local open-weight model to perform better with remembered local
evidence present than with that evidence withheld, including after application
restart.