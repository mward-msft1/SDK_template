# Complete Agent 365 CLI and SDK setup

This template takes an existing agent through the complete beginner flow:

1. install the Agent 365 CLI;
2. authenticate and validate prerequisites;
3. create an Agent Identity blueprint;
4. obtain the generated blueprint identifiers;
5. insert those values into the agent's environment;
6. install and initialize the Agent 365 observability SDK;
7. validate invocation, inference, and tool spans.

The Agent 365 SDK **extends an agent you already own**. It does not select a
model, create the reasoning loop, or host the agent.

## Understand the three IDs first

| Value | Meaning | Where to use it |
|---|---|---|
| `agentBlueprintId` | Application/client ID of the Agent Identity blueprint | `AGENT_BLUEPRINT_ID`, Agent 365 span metadata, local blueprint connection |
| `agentBlueprintObjectId` | Microsoft Entra directory object ID of the blueprint application | Administration and troubleshooting only |
| `AGENT_CLIENT_ID` | Client ID of the runtime child/instance Agent Identity | Runtime tokens and the `agentId` telemetry field |

For the local blueprint-only smoke test, this template initially sets
`AGENT_CLIENT_ID` to `agentBlueprintId`. When an Agent 365 registration or
administrator creates an agent instance from the blueprint, replace it with the
instance's Agent Identity client ID. Do not confuse an object ID with a client
ID.

## 1. Prerequisites

You need:

- .NET 8 or later;
- Azure CLI;
- Node.js 22 or later for this TypeScript example;
- an Azure subscription where you can create resources;
- an Agent 365-enabled Microsoft tenant;
- either Global Administrator or Agent ID Developer;
- Azure Contributor plus Agent ID Developer for the CLI setup workflow.

Observability also requires at least one tenant user with a Microsoft 365 E7 or
Microsoft Agent 365 license. Without it, the telemetry request can succeed but
the service drops the data.

Verify local tools:

```powershell
dotnet --version
az version
node --version
```

## 2. Install the A365 CLI

```powershell
dotnet tool install --global Microsoft.Agents.A365.DevTools.Cli
a365 -h
a365 --version
```

Update an existing installation:

```powershell
dotnet tool update --global Microsoft.Agents.A365.DevTools.Cli
```

The executable is installed per user:

- Windows: `%USERPROFILE%\.dotnet\tools`
- Linux/macOS: `$HOME/.dotnet/tools`

## 3. Sign in and select the Azure subscription

```powershell
az login --tenant "<YOUR_TENANT_ID>"
az account list --output table
az account set --subscription "<YOUR_SUBSCRIPTION_ID_OR_NAME>"
az account show --output table
```

Do not continue until `az account show` reports the intended tenant and
subscription.

## 4. Validate Agent 365 requirements

Run this in `template/agent365/`:

```powershell
a365 setup requirements
```

The command checks Azure access, authentication, PowerShell dependencies,
tenant enrollment, the CLI client application, and role claims. Follow every
repair instruction it prints, then sign out and back in if it changes token
claims:

```powershell
az logout
az login --tenant "<YOUR_TENANT_ID>"
a365 setup requirements
```

## 5. Create the blueprint

Choose one path.

### Path A: complete Azure-hosted setup

This creates the blueprint, Azure resource group, App Service plan, Web App,
managed identity, permissions, and `a365.generated.config.json`:

```powershell
a365 setup all --agent-name "<YOUR_AGENT_NAME>"
```

For a Teams or Microsoft 365 Copilot messaging agent, use the M365 path and
provide its endpoint through your config or endpoint command:

```powershell
a365 setup all --agent-name "<YOUR_AGENT_NAME>" --m365
```

### Path B: existing or self-hosted agent

Create only the blueprint first:

```powershell
a365 setup blueprint `
  --agent-name "<YOUR_AGENT_NAME>" `
  --tenant-id "<YOUR_TENANT_ID>" `
  --no-endpoint
```

Then grant the permissions required for bot/observability operation:

```powershell
a365 setup permissions bot --agent-name "<YOUR_AGENT_NAME>"
```

Add Work IQ MCP permissions only after your project has a current
`ToolingManifest.json`:

```powershell
a365 setup permissions mcp --agent-name "<YOUR_AGENT_NAME>"
```

If you are Agent ID Developer rather than Global Administrator, setup performs
the developer steps and prints a consent URL. Send that URL to a Global
Administrator. The blueprint is not fully ready until the administrator grants
the OAuth permissions.

## 6. Obtain and verify the blueprint

The CLI writes `a365.generated.config.json` in the working directory. Do not
commit this file.

```powershell
$generated = Get-Content .\a365.generated.config.json | ConvertFrom-Json
$generated | Select-Object `
  tenantId, `
  agentBlueprintId, `
  agentBlueprintObjectId, `
  agentBlueprintServicePrincipalObjectId, `
  completed, `
  cliVersion
```

Verify:

- all IDs are GUIDs;
- `completed` is `true`;
- `resourceConsents` contains the resources you enabled;
- the app registration exists in the Microsoft Entra admin center;
- API permissions show **Granted for your tenant**.

If `completed` is `false`, complete the Global Administrator consent steps
printed by the CLI and rerun the relevant setup command.

## 7. Insert the blueprint into the agent

The included importer copies only non-secret IDs and refuses to overwrite an
existing `.env`:

```powershell
npm run blueprint:import
```

To import from another directory:

```powershell
node .\scripts\import-blueprint.mjs `
  "C:\path\to\a365.generated.config.json" `
  ".env"
```

The resulting `.env` maps the CLI output as follows:

```dotenv
TENANT_ID=<tenantId>
AGENT_BLUEPRINT_ID=<agentBlueprintId>
connections__service_connection__settings__clientId=<agentBlueprintId>
connections__service_connection__settings__tenantId=<tenantId>
```

The importer deliberately does not copy the client secret. To display the
locally stored blueprint secret on the same Windows machine and user account
that created it:

```powershell
a365 setup blueprint `
  --agent-name "<YOUR_AGENT_NAME>" `
  --show-secret
```

Paste it into these two local-only values:

```dotenv
AGENT_BLUEPRINT_CLIENT_SECRET=<SECRET_FROM_A365_CLI>
connections__service_connection__settings__clientSecret=<SECRET_FROM_A365_CLI>
```

Microsoft Entra cannot return an old secret after it is lost. If the CLI can no
longer reveal it, create a new development secret or, preferably, configure a
certificate or managed identity. Never commit `.env`,
`a365.generated.config.json`, or a displayed secret.

### Insert the same blueprint into the Entra sidecar

For the repository's autonomous child Agent Identity pattern, copy the
blueprint values to `template/entra-sidecar/.env`:

```dotenv
TENANT_ID=<tenantId>
BLUEPRINT_APP_ID=<agentBlueprintId>
BLUEPRINT_CLIENT_SECRET=<SECRET_FROM_A365_CLI>
```

Keep the runtime child Agent Identity client ID in the application:

```dotenv
AGENT_CLIENT_ID=<CHILD_OR_INSTANCE_AGENT_ID_CLIENT_ID>
```

The blueprint credential authenticates the blueprint; it is not the child
Agent Identity ID.

## 8. Install the Agent 365 SDK

This runnable sample uses the Microsoft OpenTelemetry Distro, which Microsoft
currently recommends for Agent 365 observability:

```powershell
npm install
```

Equivalent package installation:

```powershell
npm install @microsoft/opentelemetry @opentelemetry/resources
```

Install only additional Agent 365 capabilities your agent needs:

```powershell
# Identity/runtime helpers
npm install @microsoft/agents-a365-runtime

# Governed Work IQ MCP server discovery
npm install @microsoft/agents-a365-tooling

# Notifications (requires an agent user and eligible preview tenant)
npm install @microsoft/agents-a365-notifications
```

Framework-specific tooling extensions are separate packages. Choose the one
that matches your runtime rather than installing all of them.

## 9. Insert the SDK into the agent runtime

Use these files:

- `src/config.ts` validates all environment values.
- `src/entra-sidecar.ts` resolves a child Agent Identity token.
- `src/observability.ts` initializes Agent 365 and creates invocation,
  inference, and tool spans.
- `src/example-agent.ts` shows the exact startup and shutdown placement.

The required host order is:

```typescript
const config = loadAgent365Config();
initializeAgent365(config, sidecar); // once, before the agent runtime starts

const observer = new Agent365Observer(config);
const result = await observer.runTurn(prompt, () => invokeYourAgent(prompt));

await shutdownAgent365(); // once, during graceful host shutdown
```

Keep `A365_RECORD_CONTENT=false` unless your privacy and compliance owners
explicitly approve prompt and response capture. Spans still record operation
metadata, errors, token counts, and timing.

## 10. Build and validate locally

First validate without exporting to Agent 365:

```powershell
npm run build
npm test
npm start
```

Expected behavior:

- the example response is printed;
- console telemetry contains an `invoke_agent` root span;
- inference is nested under that invocation;
- no prompt or output text is captured while `A365_RECORD_CONTENT=false`.

To export through this repository's Entra sidecar:

1. Complete `template/entra-sidecar/README.md`.
2. Start the sidecar and verify `/healthz`.
3. Set a real child/instance `AGENT_CLIENT_ID`.
4. Set `A365_EXPORT_ENABLED=true`.
5. Start the agent again.

```powershell
docker compose `
  --env-file ..\entra-sidecar\.env `
  -f ..\entra-sidecar\docker-compose.yml up -d

Invoke-WebRequest http://localhost:5000/healthz
npm start
```

The runtime command includes
`--import @microsoft/opentelemetry/loader`, which must load before supported AI
libraries for automatic instrumentation.

## 11. Production changes

Before production:

1. replace the blueprint client secret with a managed identity federated
   credential or certificate;
2. store credentials in Key Vault or the host's secret manager;
3. use the runtime child/instance Agent Identity ID for `AGENT_CLIENT_ID`;
4. keep the blueprint ID in `AGENT_BLUEPRINT_ID`;
5. use OBO for delegated user actions and S2S only for background operations;
6. grant least-privilege Graph, Work IQ, notification, and observability scopes;
7. keep Purview gates before inference, tools, A2A calls, and output release;
8. emit one valid `invoke_agent` root span per turn.

## Troubleshooting

| Symptom | Resolution |
|---|---|
| `a365` isn't recognized | Restart the shell and add the per-user `.dotnet/tools` directory to `PATH` |
| Requirements reports missing roles | Assign Azure Contributor and Agent ID Developer, then sign out/in |
| `a365.generated.config.json` is missing | Run the command from the intended project directory and inspect CLI errors |
| Blueprint exists but `completed=false` | Complete the Global Administrator consent URL and rerun permissions |
| Importer refuses to run | Preserve the existing `.env`, or intentionally rename it before importing |
| Secret is masked or unavailable | Use `--show-secret` on the original Windows user/machine or create a new credential |
| Telemetry returns 401 | Verify token audience is Agent 365 Observability and the resolver isn't returning an expired token |
| Telemetry returns 403 | Verify licensing, `Agent365.Observability.OtelWrite`, admin consent, and runtime agent ID |
| Export succeeds but no spans appear | Verify tenant licensing and that `invoke_agent` is the root span |
| Spans are silently dropped | Ensure tenant and agent identity baggage match the token and export URL |

## Official references

- [Agent 365 CLI](https://learn.microsoft.com/microsoft-agent-365/developer/agent-365-cli)
- [Set up an agent blueprint](https://learn.microsoft.com/microsoft-agent-365/developer/registration)
- [Agent 365 CLI setup reference](https://learn.microsoft.com/microsoft-agent-365/developer/reference/cli/setup)
- [Agent 365 SDK overview](https://learn.microsoft.com/microsoft-agent-365/developer/agent-365-sdk)
- [Microsoft OpenTelemetry Distro](https://learn.microsoft.com/microsoft-agent-365/developer/microsoft-opentelemetry)
- [Observability authentication](https://learn.microsoft.com/microsoft-agent-365/developer/observability-authentication-setup)
