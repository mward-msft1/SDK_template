# Python examples (beginner)

This folder is the Python version of the same template pipeline used in `template/src` (JavaScript).

## Files

- `config.py` - reads required placeholders from environment variables.
- `entra_sidecar_client.py` - gets autonomous or OBO authorization headers from the local Entra Agent ID sidecar.
- `agent365_adapter.py` - TODO points for Agent365 SDK reporting hooks.
- `purview_adapter.py` - Purview Graph `computeProtectionScopes` and `contentActivities` calls.
- `agent_middleware_template.py` - pre/post model policy checks and block logic.
- `host_adapters.py` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `example_runner.py` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
cp entra-sidecar/.env.example entra-sidecar/.env
# Edit both files and replace their Entra placeholders before continuing.
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
set -a && source .env && set +a
python3 python/example_runner.py
```

Before starting Compose, fill the blueprint values in `entra-sidecar/.env` and `AGENT_CLIENT_ID` in `.env`. Keeping these files separate prevents the blueprint secret from entering the agent process. The Purview adapter automatically uses the sidecar when `ENTRA_SIDECAR_ENABLED=true`. See `../entra-sidecar/README.md` for autonomous and OBO examples.
