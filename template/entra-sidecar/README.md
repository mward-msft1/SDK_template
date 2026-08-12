# Microsoft Entra Agent ID auth sidecar

This folder adds beginner-friendly, language-neutral authentication to every template. The Microsoft Entra ID Auth SDK runs in a companion container. Your agent asks it for an `Authorization` header and then uses that header to call Microsoft Graph, including the Microsoft Purview APIs in this repository.

## Why use it?

Use an Agent ID sidecar when you want:

- **A distinct identity per agent instance.** Each agent identity gets its own permissions and audit trail.
- **No identity SDK rewrite per language.** JavaScript, Python, .NET, Go, Rust, and C++ call the same local HTTP API.
- **Autonomous agents.** Scheduled jobs, batch processors, and background agents call APIs as themselves.
- **Interactive agents.** A chat or web agent exchanges the signed-in user's token and calls APIs on behalf of that user.
- **Safer production credentials.** Local development can use a blueprint client secret; production can switch the sidecar to workload identity or a certificate without changing agent code.

The sidecar manages token acquisition, caching, refresh, client-credential exchange, and OBO exchange. Your agent still decides when to call an API and must enforce authorization in its business logic.

## Beginner mental model

Microsoft Entra Agent ID uses three main pieces:

1. **Blueprint application**: the parent definition for a type of agent. Its credential belongs in the sidecar, never in agent code.
2. **Blueprint principal**: the service principal for that blueprint. It must be created explicitly.
3. **Agent identity**: the individual agent instance. Put downstream API permissions on this identity.

At runtime:

```text
Your agent -> localhost sidecar -> Microsoft Entra ID
           <- Authorization header <-
Your agent -> Microsoft Graph / Purview API
```

## Choose a use case

| Use case | Set `ENTRA_SIDECAR_AUTH_MODE` | Incoming user token |
|---|---|---|
| Nightly document processor | `autonomous` | No |
| Background Bedrock agent calling Graph | `autonomous` | No |
| User-facing chat agent | `obo` | Yes |
| API middleware preserving user context | `obo` | Yes |

Start with `autonomous`. Use `obo` only when a caller signs in and your agent must preserve that user's delegated permissions.

## Prerequisites

1. Docker Desktop with Docker Compose v2.
2. A Microsoft Entra tenant.
3. An Agent ID blueprint and blueprint principal.
4. A client secret on the blueprint for local development.
5. An agent identity created from that blueprint.
6. Microsoft Graph/Purview permissions granted to the **agent identity**, with admin consent where required.

Use the official [Agent ID samples](https://github.com/microsoft/entra-agentid-samples) to create the tenant objects. Record:

- Tenant ID
- Blueprint application client ID
- Blueprint client secret
- Agent identity client ID

Client secrets are only for local development. Use `SignedAssertionFilePath` with Microsoft Entra Workload ID in AKS, or another documented certificate/federated credential, for production.

## Copy-paste local setup

Run from `template/`.

### PowerShell

```powershell
Copy-Item .env.example .env
Copy-Item entra-sidecar/.env.example entra-sidecar/.env
notepad .env
notepad entra-sidecar/.env
```

### Bash

```bash
cp .env.example .env
cp entra-sidecar/.env.example entra-sidecar/.env
${EDITOR:-vi} .env
${EDITOR:-vi} entra-sidecar/.env
```

Put only the sidecar's blueprint credential in `entra-sidecar/.env`:

```dotenv
TENANT_ID=YOUR_ENTRA_TENANT_ID
BLUEPRINT_APP_ID=YOUR_BLUEPRINT_APPLICATION_CLIENT_ID
BLUEPRINT_CLIENT_SECRET=YOUR_LOCAL_DEVELOPMENT_SECRET
```

Put the agent identity and application settings in `.env`:

```dotenv
AGENT_CLIENT_ID=YOUR_AGENT_IDENTITY_CLIENT_ID

ENTRA_SIDECAR_ENABLED=true
ENTRA_SIDECAR_URL=http://localhost:5000
ENTRA_SIDECAR_SERVICE_NAME=Graph
ENTRA_SIDECAR_AUTH_MODE=autonomous
```

Start the sidecar:

```powershell
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
Invoke-WebRequest http://localhost:5000/healthz
```

Or with Bash:

```bash
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
curl --fail http://localhost:5000/healthz
```

Test autonomous token acquisition:

```powershell
$url = "http://localhost:5000/AuthorizationHeaderUnauthenticated/Graph?AgentIdentity=$env:AGENT_CLIENT_ID"
Invoke-RestMethod $url
```

The JSON response contains `authorizationHeader`. Treat it as a secret and do not log it.

## Autonomous example

The language clients call:

```http
GET /AuthorizationHeaderUnauthenticated/Graph?AgentIdentity={AGENT_CLIENT_ID}
```

The clients also send `optionsOverride.RequestAppToken=true`. The sidecar authenticates the blueprint, exchanges that identity for the selected agent identity, and returns an application authorization header. The Purview adapters use it for Graph requests.

## OBO example

Your host first receives a bearer token whose audience is the blueprint API. Set:

```dotenv
ENTRA_SIDECAR_AUTH_MODE=obo
```

Copy the current request's `Authorization` header into the template's
`TurnContext.authorizationHeader` field (`authorization_header` in Python and
Rust). The examples pass that request-scoped header to:

```http
GET /AuthorizationHeader/Graph?AgentIdentity={AGENT_CLIENT_ID}
Authorization: Bearer {incoming-user-token}
```

The clients send `optionsOverride.RequestAppToken=false` so the sidecar preserves delegated user context instead of silently using an app-only token. The middleware passes the header only for that request. Never put a user token in `.env`, persist it, commit it, or reuse it between users.

## Language examples

| Language | Sidecar client |
|---|---|
| JavaScript | `src/integrations/entraSidecarClient.js` |
| Python | `python/entra_sidecar_client.py` |
| .NET | `dotnet/EntraSidecarClient.cs` |
| Go | `go/entra_sidecar_client.go` |
| Rust | `rust/src/entra_sidecar_client.rs` |
| C++ | `cpp/src/entra_sidecar_client.cpp` |

Each client validates configuration, chooses autonomous or OBO, fails on non-success responses, and returns the full authorization header. The Purview adapter uses the sidecar when `ENTRA_SIDECAR_ENABLED=true`; set it to `false` only to use the legacy `GRAPH_ACCESS_TOKEN_PLACEHOLDER`.

## Production checklist

- Do not expose the sidecar through public ingress or a load balancer.
- Run it in the same pod or private container network as the agent.
- Set `ASPNETCORE_ENVIRONMENT=Production` outside local development.
- Use workload identity (`SignedAssertionFilePath`) in AKS instead of a client secret.
- Grant minimum permissions to each agent identity, not to the blueprint principal.
- Do not log authorization headers, client secrets, or inbound user tokens.
- Add retry with backoff for transient `500`/`503` responses.
- Use `/healthz` for health checks.

## Troubleshooting

| Problem | Fix |
|---|---|
| Connection refused | Start Compose and verify `ENTRA_SIDECAR_URL`. |
| `404` service not configured | Match `ENTRA_SIDECAR_SERVICE_NAME` to `DownstreamApis__Graph`. |
| `400` missing `AgentIdentity` | Set `AGENT_CLIENT_ID`. |
| `401` in OBO mode | Verify the inbound token audience, issuer, expiry, and blueprint API scope. |
| `403` from Graph/Purview | Grant the required permission to the individual agent identity and wait for consent propagation. |
| Token acquisition `500` | Check `docker logs entra-agent-id-sidecar`, tenant ID, blueprint ID, secret, and consent. |

## Official documentation

- [Authentication with the Microsoft Entra Auth SDK sidecar](https://learn.microsoft.com/entra/agent-id/authentication-with-auth-sdk-sidecar)
- [Acquire tokens and call downstream APIs](https://learn.microsoft.com/entra/agent-id/microsoft-entra-sdk-for-agent-identities)
- [Run the sidecar for local development](https://learn.microsoft.com/entra/agent-id/sidecar-local-development)
- [Sidecar configuration reference](https://learn.microsoft.com/entra/msidweb/agent-id-sdk/configuration)
- [Sidecar endpoints reference](https://learn.microsoft.com/entra/msidweb/agent-id-sdk/endpoints)
