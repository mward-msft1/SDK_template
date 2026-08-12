# C#/.NET examples (beginner)

This folder is the C#/.NET version of the same template pipeline used in JavaScript (`template/src`), Python (`template/python`), and C++ (`template/cpp`).

## Files

- `Config.cs` - reads required placeholders from environment variables.
- `EntraSidecarClient.cs` - gets autonomous or OBO authorization headers from the local Entra Agent ID sidecar.
- `Models.cs` - shared context/result models.
- `Agent365Adapter.cs` - TODO points for Agent365 SDK reporting hooks.
- `PurviewAdapter.cs` - Purview Graph placeholder calls and decision parsing.
- `AgentMiddlewareTemplate.cs` - pre/post model policy checks and block logic.
- `HostAdapters.cs` - where to wire Agent Framework or Microsoft 365 Agents SDK hosts.
- `Program.cs` - starter runner.

## Run

From `template/`:

```bash
cp .env.example .env
# Edit .env and replace the four Entra sidecar values before continuing.
cp entra-sidecar/.env.example entra-sidecar/.env
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
set -a && source .env && set +a
dotnet run --project ./dotnet/AgnosticAgentTemplate.csproj
```

Before starting Compose, fill the blueprint values in `entra-sidecar/.env` and `AGENT_CLIENT_ID` in `.env`. Keeping these files separate prevents the blueprint secret from entering the agent process. The Purview adapter automatically uses the sidecar when `ENTRA_SIDECAR_ENABLED=true`. See `../entra-sidecar/README.md` for autonomous and OBO examples.
