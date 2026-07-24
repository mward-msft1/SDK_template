# Agnostic Agent + M365 Agents + Agent365 + Purview Template

This is a **beginner template** showing where to interject **Agent365 SDK** and **Purview API** calls in either:
- **Microsoft Agent Framework** (`microsoft/agent-framework`)
- **Microsoft 365 Agents SDK** (`microsoft/agents`)

You can keep one policy + reporting pattern, then swap host SDKs.

You get both:
- JavaScript examples in `src/`
- Python examples in `python/`
- C++ examples in `cpp/`
- C#/.NET examples in `dotnet/`
- Rust examples in `rust/`
- Go examples in `go/`

## Prerequisites

### Microsoft 365 / Entra / Purview prerequisites

1. A Microsoft Entra tenant and an app registration for your agent host.
2. Microsoft Purview enabled in that tenant.
3. Graph permissions for Purview API flows (for example `Content.Process.User` and `ProtectionScopes.Compute.User`) granted to your app registration.
4. A Purview DLP policy scoped to your app registration (`Application` enforcement plane).
5. If using the included policy script template, prerequisites from the Purview sample:
   - PowerShell 7+
   - ExchangeOnlineManagement module
   - A role that can manage Purview DLP (for example Compliance Administrator)

### Local developer prerequisites

| Language template | Required toolchain |
|---|---|
| JavaScript (`src/`) | Node.js 20+ |
| Python (`python/`) | Python 3.10+ |
| C++ (`cpp/`) | C++17 compiler |
| C#/.NET (`dotnet/`) | .NET SDK 8.0+ |
| Rust (`rust/`) | Rust stable toolchain (`cargo`) |
| Go (`go/`) | Go 1.22+ |

## One-time setup for all templates

1. From `template/`, create env file:
   ```bash
   cp .env.example .env
   ```
2. Fill all required placeholders in `.env` (tenant IDs, app IDs, secrets, endpoints).
3. Choose host SDK in `.env`:
   - `HOST_SDK=agent-framework`
   - `HOST_SDK=m365-agents-sdk`
4. Keep Purview IDs aligned:
   - `.env` → `PURVIEW_APP_LOCATION_ID`
   - `purview/Create-DlpPolicyForCustomAIApps.template.ps1` → `$Applications`
5. Replace TODOs for:
   - token acquisition in Purview adapters
   - Agent365 reporting adapter calls
   - host-specific wiring adapters

## Beginner mental model (simple)

Think of each message as a pipeline:
1. user sends text
2. Purview checks if policy allows it
3. model runs (if allowed)
4. Purview checks model response
5. app returns or blocks response
6. Agent365 logs what happened

## Where each integration happens

1. **Before model execution**
   - `computeProtectionScopes` for the current user
   - `contentActivities` with `uploadText`
   - block if policy requires it
2. **After model execution**
   - `contentActivities` with `downloadText`
   - block/redact if policy requires it
3. **Telemetry/reporting**
   - turn start/end + policy decisions through `Agent365Adapter`

## Which host SDK am I using?

Set `HOST_SDK` in `.env`:
- `agent-framework`
- `m365-agents-sdk`

Then wire the matching adapter in `src/framework/hostAdapters.js`.
For Python, wire it in `python/host_adapters.py`.
For C++, wire it in `cpp/src/host_adapters.cpp`.
For C#/.NET, wire it in `dotnet/HostAdapters.cs`.
For Rust, wire it in `rust/src/host_adapters.rs`.
For Go, wire it in `go/host_adapters.go`.

## Files to edit first (in order)

- `src/integrations/agent365Adapter.js`
 - replace TODO stubs with official Agent365 SDK calls for reporting
- `src/integrations/purviewAdapter.js`
 - replace token placeholder with MSAL/managed-identity token acquisition
 - adapt response parser in `getEnforcementDecision`
- `src/framework/hostAdapters.js`
 - replace placeholders with your real host runtime objects/handlers
- `.env.example`
 - copy to `.env` and fill all IDs/secrets/endpoints
- If using Python first, start with:
 - `python/agent365_adapter.py`
 - `python/purview_adapter.py`
 - `python/host_adapters.py`
- If using C++ first, start with:
 - `cpp/src/agent365_adapter.cpp`
 - `cpp/src/purview_adapter.cpp`
 - `cpp/src/host_adapters.cpp`
- If using C#/.NET first, start with:
 - `dotnet/Agent365Adapter.cs`
 - `dotnet/PurviewAdapter.cs`
 - `dotnet/HostAdapters.cs`
- If using Rust first, start with:
 - `rust/src/agent365_adapter.rs`
 - `rust/src/purview_adapter.rs`
 - `rust/src/host_adapters.rs`
- If using Go first, start with:
 - `go/agent365_adapter.go`
 - `go/purview_adapter.go`
 - `go/host_adapters.go`

## Mandatory placeholders to fill

| Placeholder | Purpose |
|---|---|
| `TENANT_ID` | Microsoft Entra tenant hosting app + policies |
| `ENTRA_CLIENT_ID` / `ENTRA_CLIENT_SECRET` | app credential used to acquire Graph token |
| `HOST_SDK` | choose `agent-framework` or `m365-agents-sdk` |
| `M365_AGENTS_BOT_APP_ID` / `M365_AGENTS_BOT_APP_PASSWORD` | Microsoft 365 Agents SDK app credentials |
| `PURVIEW_APP_LOCATION_ID` | Entra app registration ID used in DLP `Application` location |
| `AGENT365_APP_ID` / `AGENT365_APP_SECRET` | Agent365 SDK app credentials |
| `AGENT365_REPORTING_ENDPOINT` | destination for Agent365 reporting/telemetry |
| `GRAPH_ACCESS_TOKEN_PLACEHOLDER` | temporary runtime token hook until MSAL flow is wired |

## Purview policy bootstrap

Use `purview/Create-DlpPolicyForCustomAIApps.template.ps1` as a starter to create/update tenant DLP rules for your app registrations.

## Setup and run each template

### JavaScript

```bash
cd template
node --env-file=.env ./src/exampleRunner.js
```

Edit first:
- `src/integrations/agent365Adapter.js`
- `src/integrations/purviewAdapter.js`
- `src/framework/hostAdapters.js`

### Python

```bash
cd template
set -a && source .env && set +a
python3 python/example_runner.py
```

Edit first:
- `python/agent365_adapter.py`
- `python/purview_adapter.py`
- `python/host_adapters.py`

### C++

```bash
cd template
set -a && source .env && set +a
/usr/bin/c++ -std=c++17 cpp/src/*.cpp -o ./cpp/example_runner
./cpp/example_runner
```

Edit first:
- `cpp/src/agent365_adapter.cpp`
- `cpp/src/purview_adapter.cpp`
- `cpp/src/host_adapters.cpp`

### C#/.NET

```bash
cd template
set -a && source .env && set +a
dotnet run --project ./dotnet/AgnosticAgentTemplate.csproj
```

Edit first:
- `dotnet/Agent365Adapter.cs`
- `dotnet/PurviewAdapter.cs`
- `dotnet/HostAdapters.cs`

### Rust

```bash
cd template
set -a && source .env && set +a
cargo run --manifest-path ./rust/Cargo.toml
```

Edit first:
- `rust/src/agent365_adapter.rs`
- `rust/src/purview_adapter.rs`
- `rust/src/host_adapters.rs`

### Go

```bash
cd template
set -a && source .env && set +a
cd go
go run .
```

Edit first:
- `go/agent365_adapter.go`
- `go/purview_adapter.go`
- `go/host_adapters.go`

If you use another runtime, keep the same middleware order and only replace runtime-specific wiring.
