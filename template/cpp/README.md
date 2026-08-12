# C++ examples (beginner)

This folder is the C++ version of the same template pipeline used in `template/src` (JavaScript) and `template/python`.

## Files

- `src/config.*` - reads required placeholders from environment variables.
- `src/entra_sidecar_client.*` - uses libcurl to get autonomous or OBO authorization headers from the local Entra Agent ID sidecar.
- `src/agent365_adapter.*` - TODO points for Agent365 SDK reporting hooks.
- `src/purview_adapter.*` - Purview Graph placeholder calls and decision parsing.
- `src/agent_middleware_template.*` - pre/post model policy checks and block logic.
- `src/host_adapters.*` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `src/example_runner.cpp` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
# Edit .env and replace the four Entra sidecar values before continuing.
cp entra-sidecar/.env.example entra-sidecar/.env
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
set -a && source .env && set +a
cmake -S cpp -B cpp/build
cmake --build cpp/build
./cpp/build/example_runner
```

Install the libcurl development package before configuring CMake. Before starting Compose, fill the blueprint values in `entra-sidecar/.env` and `AGENT_CLIENT_ID` in `.env`. Keeping these files separate prevents the blueprint secret from entering the agent process. The Purview adapter automatically uses the sidecar when `ENTRA_SIDECAR_ENABLED=true`. See `../entra-sidecar/README.md` for autonomous and OBO examples.
