# Workshop Model Qualification Harness V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compare the three installed local Ollama candidates with a frozen provider-isolated benchmark before any model is allowed to inhabit the real Workshop world.

**Architecture:** A Python 3.12 standard-library harness under `tools/model_qualification` consumes frozen synthetic BeingContext fixtures, sends exactly one local Ollama `/api/chat` request per candidate/case, validates the structured response, and writes campaign evidence under `evidence/model-qualification-v0/`. The live Tauri app and SQLite runtime are never invoked.

**Tech Stack:** Python 3.12 standard library, Ollama local HTTP API, existing TypeScript/Rust regression gates.

**Spec:** `docs/superpowers/plans/2026-09-12-workshop-perception-v0.md`

## Global Constraints

- Candidates: `phi4-mini:3.8b-q4_K_M`, `qwen3:8b`, `ministral-3:8b`.
- Expected digest prefixes: `78fad5d182a7`, `500a1f067a9f`, `1922accd5827` respectively.
- No model pulls or model creation.
- Preflight all exact names and digests before inference.
- Local Ollama only: `http://127.0.0.1:11434`.
- `POST /api/chat`, `stream=false`, `think=false`.
- Options: `temperature=0`, `seed=42`, `num_ctx=4096`, `num_predict=96`.
- JSON Schema structured output.
- Exactly 24 cases x 3 models = 72 inference requests; zero retries.
- No canonical charge, persistence state, probe cursor, UI phase, or real Workshop state reaches a model.
- Do not store `thinking` fields.
- Qualify only with 0 provider errors, 24/24 schema valid, 0 epistemic violations, and at least 22/24 fully passed cases.
- Recommend the smallest stored model size among qualified candidates; report quality leader separately.
- No Python packages may be installed.

## Tasks

1. Freeze the 24-case fixture, decision schema, scoring, hashing, and exact Ollama request contract with RED then GREEN unit tests.
2. Add a metadata-only `--preflight` command that makes zero inference calls.
3. Add an explicit `--execute` campaign command that writes the manifest before inference, writes every case receipt immediately, performs no retries, and writes a final summary.
4. Run Python, frontend, build, Rust test, and Rust compile gates before committing the harness.

## Acceptance Gate

- `python -m unittest discover -s tools/model_qualification -p "test_*.py" -v`
- `npm run test:run`
- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo check --manifest-path src-tauri/Cargo.toml`

The implementation script must make zero model inference requests.