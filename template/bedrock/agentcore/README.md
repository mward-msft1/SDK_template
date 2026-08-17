# Amazon Bedrock AgentCore + Microsoft Entra Agent ID federation

This is a separate deployment path from the JavaScript Bedrock `Converse`
example in `../README.md`.

| Path | Use it when | Entra credential |
|---|---|---|
| Direct Bedrock `Converse` | Your existing app only needs Bedrock model inference | Local Entra sidecar or your host identity |
| Bedrock AgentCore Runtime | AWS hosts the agent and its execution role must federate to Entra | Short-lived AWS STS workload assertion; no Microsoft client secret |

This AgentCore template implements an autonomous, two-stage token exchange:

```text
AgentCore Runtime execution role
  -> AWS STS GetWebIdentityToken
  -> AWS-signed assertion
  -> Entra Blueprint token (T1)
  -> child Agent Identity resource token (TR)
  -> Microsoft Graph
```

Tokens stay in process memory. Never print, log, trace, serialize, persist, or
return the AWS assertion, T1, TR, or an authorization header.

## Prerequisites

- Node.js 20 or later and npm.
- Current AgentCore CLI: `npm install -g @aws/agentcore`.
- Python compatible with the current AgentCore CLI and the configured
  `PYTHON_3_14` runtime.
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) for CodeZip
  dependency resolution and packaging.
- Authenticated AWS CLI/deployment access for the target account and Region.
- Bedrock model access in the selected AWS Region.
- An AgentCore Runtime execution role with:
  - `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` for the
    selected model, or for both an inference profile and every underlying
    foundation model in its destination Regions.
  - `sts:GetWebIdentityToken`, constrained as shown in
    `iam-execution-role-policy.template.json`.
  - A trust relationship allowing `bedrock-agentcore.amazonaws.com` to assume
    the role, restricted by account and AgentCore source ARN as shown in
    `execution-role-trust-policy.template.json`.
- A Microsoft Entra Agent Identity Blueprint and BlueprintPrincipal.
- A child Agent Identity associated with that Blueprint.
- A Federated Identity Credential on the Blueprint:
  - **Subject:** exact AgentCore Runtime execution-role ARN.
  - **Audience:** `api://AzureADTokenExchange`.
  - **Issuer:** the AWS outbound federation issuer for your environment.
- Appropriate Microsoft Graph application permission granted to the child
  Agent Identity for the resource request you implement.

Do not substitute the AgentCore workload-identity ARN for the Runtime
execution-role ARN.

## Keep the identifiers straight

| Setting | Must contain | Common mistake |
|---|---|---|
| `ENTRA_TENANT_ID` | Entra tenant ID | Publishing a real tenant value in a public template |
| `ENTRA_BLUEPRINT_CLIENT_ID` | Blueprint **App ID** | Blueprint service-principal object ID |
| `ENTRA_CHILD_AGENT_CLIENT_ID` | Child Agent Identity **client/App ID** used by `fmi_path` | Child service-principal object ID, Blueprint ID, Agent 365 ID, or an AWS ARN |
| FIC subject | Exact Runtime execution-role ARN | AgentCore workload-identity ARN |
| FIC audience | `api://AzureADTokenExchange` | Microsoft Graph scope |
| Stage 2 `client_id` | `ENTRA_CHILD_AGENT_CLIENT_ID` | `ENTRA_BLUEPRINT_CLIENT_ID` |

## Copy-paste setup

Run from `template/bedrock/agentcore/`.

### PowerShell

```powershell
Copy-Item agentcore\agentcore.template.json agentcore\agentcore.json
Copy-Item agentcore\aws-targets.template.json agentcore\aws-targets.json
notepad agentcore\agentcore.json
notepad agentcore\aws-targets.json

node --version
npm --version
agentcore --version
uv --version
python -m py_compile app\EntraAgentTemplate\main.py app\EntraAgentTemplate\entra_token_provider.py
python -c "import json; json.load(open('agentcore/agentcore.template.json', encoding='utf-8')); json.load(open('agentcore/aws-targets.template.json', encoding='utf-8')); print('JSON OK')"
python -c "import tomllib; tomllib.load(open('app/EntraAgentTemplate/pyproject.toml', 'rb')); print('TOML OK')"

agentcore validate
agentcore deploy --dry-run
agentcore deploy
agentcore status
```

Before `agentcore deploy`, create or select the Runtime execution role:

1. Set its trust relationship from
   `execution-role-trust-policy.template.json`.
2. Attach the permissions from `iam-execution-role-policy.template.json`.
3. If using an inference profile, list both its ARN and every underlying
   foundation-model ARN required in its destination Regions.
4. Put that exact role ARN in `executionRoleArn`.
5. Configure the same exact ARN as the Entra Federated Identity Credential
   subject.

Do not let the CLI create a different role for this federation path.

Do not continue until the Runtime reports `READY`.

Normal Bedrock invocation:

```powershell
agentcore invoke --prompt "What is 2 plus 2?"
```

Controlled federation validation:

```powershell
agentcore invoke --prompt "entra_graph_test"
```

A successful test returns sanitized fields such as `success`,
`identity_client_id_match`, `service_principal_type`, and
`tokens_logged: false`. It
must not return any token or authorization header.

## How the token exchange works

1. `entra_token_provider.py` calls regional STS `GetWebIdentityToken` with:
   - audience `api://AzureADTokenExchange`
   - duration 300 seconds
   - signing algorithm `RS256`
2. Stage 1 posts the AWS assertion to the tenant token endpoint:
   - `client_id=ENTRA_BLUEPRINT_CLIENT_ID`
   - `scope=api://AzureADTokenExchange/.default`
   - `fmi_path=ENTRA_CHILD_AGENT_CLIENT_ID`
3. Stage 2 uses T1 as a client assertion:
   - `client_id=ENTRA_CHILD_AGENT_CLIENT_ID`
   - `scope=https://graph.microsoft.com/.default`
4. `main.py` uses the final child identity token only for the controlled Graph
   request.

The `entra_graph_test` gate is intentional. Ordinary prompts use the Strands
Bedrock agent and do not acquire a Microsoft Graph token.

## Files

| File | Purpose |
|---|---|
| `agentcore/agentcore.template.json` | Current CLI project and CodeZip Runtime deployment template |
| `agentcore/aws-targets.template.json` | AWS account and Region deployment target template |
| `iam-execution-role-policy.template.json` | Least-privilege starting policy for model invocation and outbound federation |
| `execution-role-trust-policy.template.json` | AgentCore service trust relationship constrained by AWS account and source ARN |
| `app/EntraAgentTemplate/main.py` | AgentCore entry point, normal Bedrock path, and controlled federation test |
| `app/EntraAgentTemplate/entra_token_provider.py` | AWS assertion and two-stage Entra token exchange |
| `app/EntraAgentTemplate/pyproject.toml` | AgentCore, botocore, and Strands dependencies |
| `NOTICE.md` | Reference attribution and validation boundary |

## Troubleshooting

| Symptom | Check |
|---|---|
| `KeyError` contains a GUID | Use literal environment variable names in `agentcore.json`; put the GUID in each `value` |
| `AADSTS7002111` during Stage 2 | `ENTRA_CHILD_AGENT_CLIENT_ID` must be the child identity client/App ID, not the Blueprint ID or service-principal object ID |
| `AccessDenied` from `GetWebIdentityToken` | Execution-role policy, exact FIC subject ARN, audience, 300-second limit, and `RS256` |
| Runtime initialization timeout | Inspect AgentCore logs for the Python traceback before changing federation settings |
| `agentcore` is not recognized | Install the current AgentCore CLI, restart the shell, and run `agentcore --help` |
| `No agentcore project found` | Run commands from this directory and confirm `agentcore/agentcore.json` and `agentcore/aws-targets.json` exist |

## Security and validation boundary

- `networkMode` is `PUBLIC` only because it matches the validated reference
  configuration. Assess private networking and egress controls for production.
- The sample Graph lookup proves identity federation only. It does not prove
  Purview coverage, Agent 365 governance, Conditional Access, Defender
  protection, or production readiness.
- Do not commit `agentcore.json`, tenant identifiers, account IDs, role ARNs,
  issuer URLs, credentials, or logs.
- Test in a non-production environment and grant only the downstream
  permissions required by your real agent.

## References

- [Validated community reference](https://github.com/anthfuller/agentcore-entra-agentid-federation)
- [AWS STS GetWebIdentityToken](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetWebIdentityToken.html)
- [AWS outbound identity federation policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_outbound_policies.html)
- [Microsoft Entra Agent ID setup](https://learn.microsoft.com/en-us/entra/agent-id/identity-platform/agent-id-setup-instructions)
