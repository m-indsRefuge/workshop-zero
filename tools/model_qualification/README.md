# Workshop Zero Model Qualification V0

This provider-isolated harness compares three already-installed local Ollama candidates without touching the real Workshop world or SQLite database.

Candidates: `phi4-mini:3.8b-q4_K_M`, `qwen3:8b`, `ministral-3:8b`.

The frozen campaign contains 24 cases. A full run makes exactly 72 local inference requests and zero retries.

Provider-free tests:

```powershell
python -m unittest discover -s tools/model_qualification -p "test_*.py" -v
```

Metadata-only preflight, zero inference calls:

```powershell
python tools/model_qualification/run_campaign.py --preflight
```

Execute the frozen campaign:

```powershell
python tools/model_qualification/run_campaign.py --execute
```

Evidence is written to a new timestamped directory under `evidence/model-qualification-v0/`. The manifest is written before inference, every case receipt is written immediately, no call is retried, and model `thinking` fields are stripped before evidence is persisted.