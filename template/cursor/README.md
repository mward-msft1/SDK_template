# Cursor + Microsoft Purview + Agent 365 template

This example runs the **Cursor TypeScript SDK locally** and puts Microsoft
Purview checks around every Cursor turn. It also records the agent invocation,
Cursor inference, and Purview guardrail decisions with the current
**Microsoft OpenTelemetry Distro for Agent 365**.

The example is intentionally copy-paste friendly. Values that are unique to
your tenant live in `.env`; the Blueprint client secret remains only in
`../entra-sidecar/.env` and is never given to Cursor.

## What this protects

Use this pattern when Cursor needs to read or change a local repository but
prompts and generated answers must follow your organization's data policies.

The trusted Node.js host performs this sequence:

1. Ask the local Entra Agent ID sidecar for a child Agent Identity Graph token.
2. Compute the user's Purview protection scopes.
3. Evaluate the prompt as `uploadText`.
4. Stop before Cursor if Purview returns a blocking action.
5. Create a detached temporary Git worktree and run the sandboxed Cursor agent there.
6. Evaluate the complete answer as `downloadText`.
7. Print the answer only if Purview allows it.
8. Export Agent 365 invocation, inference, and guardrail spans.

Purview enforcement is in `src/governed-run.ts`, outside the Cursor prompt.
The model cannot choose to skip it. Output is deliberately not streamed to the
terminal because streamed text cannot be recalled after a policy block.
The temporary worktree is removed after the turn, so Cursor tool calls cannot
change the source checkout before output approval. This beginner example is
therefore read-only: any file edits Cursor makes in the temporary worktree are
discarded.

## Important boundary

`local: { cwd }` means Cursor's agent loop and tools operate in your local
workspace. Model inference is still Cursor-hosted. Do not use this template for
content that your organization does not permit Cursor to process.

This starter does not use Cursor cloud agents because a cloud VM cannot reach
the sidecar bound to your developer machine's `127.0.0.1`. For cloud
deployment, put equivalent Purview and Agent 365 services on a private,
authenticated endpoint; never expose the local sidecar through an ingress or
public load balancer.

## Prerequisites

- Node.js 22.13 or later
- Docker Desktop with Compose v2
- A Cursor API key
- An Entra Agent ID Blueprint, Blueprint Principal, and child Agent Identity
- A local-development credential on the Blueprint
- Purview configured for your application
- These permissions granted to the **child Agent Identity**, with admin consent:
  - Microsoft Graph application permissions required by your Purview APIs,
    including `Content.Process.User` and `ProtectionScopes.Compute.User`
  - Agent 365 application permission `Agent365.Observability.OtelWrite`
- A tenant license that supports Agent 365 observability

The value for `PURVIEW_USER_ID` is the Entra object ID of the user whose policy
is being evaluated. This command returns the current signed-in user's ID:

```bash
az ad signed-in-user show --query id --output tsv
```

## 1. Configure the Entra sidecar

From `template/`:

```bash
cp entra-sidecar/.env.example entra-sidecar/.env
```

Edit `entra-sidecar/.env`:

```dotenv
TENANT_ID=YOUR_TENANT_ID
BLUEPRINT_APP_ID=YOUR_BLUEPRINT_APPLICATION_CLIENT_ID
BLUEPRINT_CLIENT_SECRET=YOUR_LOCAL_DEVELOPMENT_SECRET
```

The supplied Compose file has two downstream services:

- `Graph` requests `https://graph.microsoft.com/.default` for Purview.
- `Agent365` requests the Agent 365 S2S resource scope for telemetry export.

Start the sidecar:

```bash
docker compose --env-file entra-sidecar/.env -f entra-sidecar/docker-compose.yml up -d
curl --fail http://localhost:5000/healthz
```

Keep port 5000 bound to `127.0.0.1`. The sidecar holds the Blueprint credential
and must not be made public.

## 2. Configure this Cursor app

From `template/cursor/`:

```bash
cp .env.example .env
npm install
```

Open `.env` and replace every placeholder:

```dotenv
CURSOR_API_KEY=YOUR_CURSOR_API_KEY
CURSOR_MODEL=composer-2.5
CURSOR_WORKSPACE=../..
CURSOR_PROMPT=Explain the authentication flow in this repository.
CURSOR_ISOLATE_WORKSPACE=true

ENTRA_TENANT_ID=YOUR_TENANT_ID
ENTRA_AGENT_CLIENT_ID=YOUR_CHILD_AGENT_IDENTITY_CLIENT_ID
ENTRA_BLUEPRINT_APP_ID=YOUR_BLUEPRINT_APPLICATION_CLIENT_ID

PURVIEW_USER_ID=YOUR_USER_OBJECT_ID
PURVIEW_APP_LOCATION_ID=YOUR_APP_REGISTRATION_CLIENT_ID_IN_THE_DLP_POLICY
```

Identifier reminder:

| Setting | Value |
|---|---|
| `ENTRA_AGENT_CLIENT_ID` | Child Agent Identity **client/application ID** |
| `ENTRA_BLUEPRINT_APP_ID` | Blueprint **client/application ID** |
| `PURVIEW_USER_ID` | Human user's Entra **object ID** |
| `PURVIEW_APP_LOCATION_ID` | App client ID listed in the Purview DLP application location |

Do not put `BLUEPRINT_CLIENT_SECRET` in this app's `.env`. It belongs only in
`entra-sidecar/.env`. The app also removes `CURSOR_API_KEY` from
`process.env` after loading it so Cursor's local shell tools do not inherit it.

Keep `CURSOR_ISOLATE_WORKSPACE=true` for the safe default. It requires a Git
repository and runs Cursor against the committed `HEAD`; uncommitted files are
not copied into the temporary worktree. Setting it to `false` lets Cursor tools
modify the live workspace before the output policy decision and is not a
Purview-enforced workflow.

## 3. Validate and run

```bash
npm test
npm run build
npm start
```

The default configuration is fail-closed:

```dotenv
PURVIEW_BLOCK_ON_ERROR=true
```

If Purview is unavailable, the prompt is not sent to Cursor and no generated
answer is displayed. `false` is included only for local policy integration
diagnostics and should not be used for sensitive workloads.

Agent 365 remote export is off initially while console telemetry is on:

```dotenv
ENABLE_A365_OBSERVABILITY_EXPORTER=false
ENABLE_CONSOLE_TELEMETRY=true
```

After the permission and tenant setup is complete, set
`ENABLE_A365_OBSERVABILITY_EXPORTER=true`. Set console telemetry to `false` in
production because telemetry can contain prompt or response content.

## Files that matter

| File | Purpose |
|---|---|
| `src/index.ts` | Creates the local Cursor agent and never prints unapproved output |
| `src/governed-run.ts` | Fail-closed, testable Purview-before/after control flow |
| `src/purview-client.ts` | `protectionScopes/compute`, ETag caching, `processContent`, policy refresh, and action enforcement |
| `src/entra-sidecar.ts` | Autonomous child Agent Identity token acquisition |
| `src/agent365-observability.ts` | Microsoft OpenTelemetry Agent 365 scopes |
| `test/governed-run.test.ts` | Allowed, input-blocked, output-blocked, and error paths |

## Autonomous versus OBO

This command-line example uses the autonomous sidecar endpoint and application
permissions. There is no authenticated web request carrying a user token, so
placing an OBO token in `.env` would be unsafe.

For OBO, move `runGovernedTurn` into an authenticated server request handler.
Pass that request's `Authorization` header to the sidecar
`/AuthorizationHeader/{service}` endpoint only for that request. Never save the
user token in `.env`, logs, Cursor prompts, or Cursor cloud environment
variables.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Sidecar connection refused | Start Compose and confirm `ENTRA_SIDECAR_URL=http://localhost:5000`. |
| Sidecar 404 for `Agent365` | Use the repository's updated Compose file and recreate the container. |
| Graph 403 | Grant the Purview Graph application permissions to the child Agent Identity and wait for consent propagation. |
| Agent 365 403 / agent ID mismatch | Use the child Agent Identity client ID, not the Blueprint ID, and grant `Agent365.Observability.OtelWrite`. |
| Cursor run fails before policy output check | Confirm the API key, model access, Node version, and `CURSOR_WORKSPACE`. |
| No remote Agent 365 spans | Enable the exporter, check the tenant license and permission, then set `A365_OBSERVABILITY_LOG_LEVEL=info`. |

## References

- [Cursor cookbook](https://github.com/cursor/cookbook)
- [Cursor TypeScript SDK](https://cursor.com/docs/sdk/typescript)
- [Microsoft Purview APIs for custom AI apps](https://learn.microsoft.com/graph/api/resources/datasecurityandgovernance-overview)
- [Microsoft OpenTelemetry Distro](https://learn.microsoft.com/microsoft-agent-365/developer/microsoft-opentelemetry)
- [Microsoft Entra SDK for Agent ID sidecar](https://learn.microsoft.com/entra/agent-id/authentication-with-auth-sdk-sidecar)
