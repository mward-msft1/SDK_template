# Python examples (beginner)

This folder is the Python version of the same template pipeline used in `template/src` (JavaScript).

## Files

- `config.py` - reads required placeholders from environment variables.
- `agent365_adapter.py` - TODO points for Agent365 SDK reporting hooks.
- `purview_adapter.py` - Purview Graph `computeProtectionScopes` and `contentActivities` calls.
- `agent_middleware_template.py` - pre/post model policy checks and block logic.
- `host_adapters.py` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `example_runner.py` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
set -a && source .env && set +a
python3 python/example_runner.py
```

Before running, replace TODO placeholders in `agent365_adapter.py`, `purview_adapter.py`, and `host_adapters.py`.
