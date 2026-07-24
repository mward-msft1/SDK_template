# C#/.NET examples (beginner)

This folder is the C#/.NET version of the same template pipeline used in JavaScript (`template/src`), Python (`template/python`), and C++ (`template/cpp`).

## Files

- `Config.cs` - reads required placeholders from environment variables.
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
set -a && source .env && set +a
dotnet run --project ./dotnet/AgnosticAgentTemplate.csproj
```

Before running, replace TODO placeholders in `Agent365Adapter.cs`, `PurviewAdapter.cs`, and `HostAdapters.cs`.
