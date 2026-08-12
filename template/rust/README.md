# Rust examples (beginner)

This folder is the Rust version of the same template pipeline used in JavaScript (`template/src`), Python (`template/python`), C++ (`template/cpp`), and C#/.NET (`template/dotnet`).

## Files

- `src/config.rs` - reads required placeholders from environment variables.
- `src/entra_sidecar_client.rs` - gets autonomous or OBO authorization headers from the local Entra Agent ID sidecar.
- `src/models.rs` - shared context/result models.
- `src/agent365_adapter.rs` - TODO points for Agent365 SDK reporting hooks.
- `src/purview_adapter.rs` - Purview Graph placeholder calls and decision parsing.
- `src/middleware.rs` - pre/post model policy checks and block logic.
- `src/host_adapters.rs` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `src/main.rs` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
# Edit .env and replace the four Entra sidecar values before continuing.
cp entra-sidecar/.env.example entra-sidecar/.env
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
set -a && source .env && set +a
cargo run --manifest-path ./rust/Cargo.toml
```

Before starting Compose, fill the blueprint values in `entra-sidecar/.env` and `AGENT_CLIENT_ID` in `.env`. Keeping these files separate prevents the blueprint secret from entering the agent process. The Purview adapter automatically uses the sidecar when `ENTRA_SIDECAR_ENABLED=true`. See `../entra-sidecar/README.md` for autonomous and OBO examples.
