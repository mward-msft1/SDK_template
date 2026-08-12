# Go examples (beginner)

This folder is the Go version of the same template pipeline used in JavaScript (`template/src`), Python (`template/python`), C++ (`template/cpp`), C#/.NET (`template/dotnet`), and Rust (`template/rust`).

## Files

- `config.go` - reads required placeholders from environment variables.
- `entra_sidecar_client.go` - gets autonomous or OBO authorization headers from the local Entra Agent ID sidecar.
- `models.go` - shared context/result models.
- `agent365_adapter.go` - TODO points for Agent365 SDK reporting hooks.
- `purview_adapter.go` - Purview Graph placeholder calls and decision parsing.
- `middleware.go` - pre/post model policy checks and block logic.
- `host_adapters.go` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `main.go` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
# Edit .env and replace the four Entra sidecar values before continuing.
cp entra-sidecar/.env.example entra-sidecar/.env
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
set -a && source .env && set +a
cd go
go run .
```

Before starting Compose, fill the blueprint values in `entra-sidecar/.env` and `AGENT_CLIENT_ID` in `.env`. Keeping these files separate prevents the blueprint secret from entering the agent process. The Purview adapter automatically uses the sidecar when `ENTRA_SIDECAR_ENABLED=true`. See `../entra-sidecar/README.md` for autonomous and OBO examples.
