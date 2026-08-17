# Amazon Bedrock + Agent 365 + Microsoft Purview

This copy-paste path sends a text prompt to Amazon Bedrock through the AWS SDK for JavaScript v3 `Converse` API while keeping Microsoft Purview evaluation before and after model inference.

This is the **direct model inference** path. To deploy the agent itself into
Amazon Bedrock AgentCore Runtime and use passwordless federation from its AWS
execution role to Microsoft Entra Agent ID, use
[`agentcore/README.md`](agentcore/README.md). AgentCore is a separate hosting
and identity path; it does not require the local Entra sidecar.

## What happens on each turn

1. The app computes Microsoft Purview protection scopes for the signed-in user.
2. Purview evaluates the prompt as `uploadText`.
3. If policy allows the prompt, the app calls Amazon Bedrock.
4. Purview evaluates the model response as `downloadText`.
5. The Agent 365 adapter records turn and policy events.
6. The app returns an allowed response or a block result.

The ordering is important: content blocked by Purview is not sent to Amazon Bedrock.

## Prerequisites

- Node.js 20 or later.
- An AWS account, an enabled Amazon Bedrock model in the selected Region, and AWS credentials available through the standard AWS SDK credential provider chain.
- IAM permission `bedrock:InvokeModel` for the selected model or inference profile. Start from `iam-policy.template.json` and replace its resource placeholder.
- A Microsoft Entra app registration and a Microsoft Purview DLP policy scoped to that application.
- Microsoft Graph permissions required by the Purview APIs, including the appropriate `ProtectionScopes.Compute.User` and `Content.Process.User` delegated or application permission for your scenario, with admin consent where required.
- Agent 365 setup if you want production observability instead of the included adapter placeholders.

Do not place AWS access keys in `.env` or source control. Prefer AWS IAM Identity Center, workload roles, or another short-lived credential provider supported by the AWS SDK.

## Copy-paste setup on Windows PowerShell

Run these commands from the repository root:

```powershell
Set-Location .\template
Copy-Item .env.example .env
npm install
notepad .env
```

Set at least these values in `.env`:

```dotenv
HOST_SDK=bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-micro-v1:0
BEDROCK_MAX_TOKENS=512
BEDROCK_TEMPERATURE=0.2
BEDROCK_SYSTEM_PROMPT=You are a helpful enterprise assistant.
BEDROCK_PROMPT=Summarize the purpose of this agent in three bullets.

DEFAULT_USER_ID=REPLACE_WITH_ENTRA_USER_OBJECT_ID
PURVIEW_APP_LOCATION_ID=REPLACE_WITH_ENTRA_APP_ID_IN_THE_DLP_POLICY
AGENT_CLIENT_ID=REPLACE_WITH_AGENT_IDENTITY_CLIENT_ID
ENTRA_SIDECAR_ENABLED=true
ENTRA_SIDECAR_AUTH_MODE=autonomous
```

Keep `BLUEPRINT_APP_ID` and `BLUEPRINT_CLIENT_SECRET` only in
`entra-sidecar/.env`, as shown in `../entra-sidecar/README.md`.

Start the Entra sidecar as described in `../entra-sidecar/README.md`, fill the remaining required placeholders, then authenticate to AWS. For example, with an IAM Identity Center profile:

```powershell
aws sso login --profile REPLACE_WITH_PROFILE
$env:AWS_PROFILE = "REPLACE_WITH_PROFILE"
npm start
```

The runner reads `BEDROCK_PROMPT`, applies inbound Purview policy, calls Bedrock with `Converse`, applies outbound Purview policy, and prints the governed result.

## Files to customize

| File | Purpose |
|---|---|
| `../src/integrations/bedrockAdapter.js` | Bedrock Runtime client and `ConverseCommand` |
| `../src/framework/hostAdapters.js` | Maps a request into the common governed turn |
| `../src/framework/agentMiddlewareTemplate.js` | Purview-before-model and Purview-after-model ordering |
| `../src/integrations/agent365Adapter.js` | Replace placeholders with production Agent 365 observability |
| `../src/integrations/purviewAdapter.js` | Replace the temporary Graph token hook and decision parser |

## Agent 365 SDK: what it provides

Microsoft Agent 365 supplies lifecycle, identity, governance, and observability capabilities for agents. For this template, the relevant part is observability: capture agent inference spans, inputs, outputs, errors, and useful metadata through OpenTelemetry-compatible instrumentation.

Microsoft currently recommends the **Microsoft OpenTelemetry Distro** as the unified observability SDK for Agent 365, Microsoft Foundry, Azure Monitor, and OTLP-compatible backends. The earlier Agent 365 Observability SDK remains supported, but new implementations should follow the current distro guidance. The local `Agent365Adapter` is intentionally an abstraction; replace its TODO methods with the official instrumentation for your runtime rather than treating `AGENT365_REPORTING_ENDPOINT` as a generic REST contract.

Start here:

- [Agent 365 development overview](https://learn.microsoft.com/microsoft-agent-365/developer/get-started)
- [Agent 365 Observability SDK](https://learn.microsoft.com/microsoft-agent-365/developer/observability)
- [Microsoft OpenTelemetry Distro](https://learn.microsoft.com/microsoft-agent-365/developer/microsoft-opentelemetry)

## Purview SDK/API: what it provides

The integration used here is the Microsoft Purview data security and governance API in Microsoft Graph:

- **Compute protection scopes** determines whether policies apply to the user, application location, and activity.
- **Content activity** evaluates prompt or response content and returns policy actions that the application must enforce.
- The application location ID must be the same Entra application ID used in the Purview DLP policy.
- A production implementation must parse the documented response fields. The included string-search decision parser is only a visible replacement point.
- Decide explicitly whether failures should block or allow traffic. The current middleware propagates Purview errors, while `PURVIEW_BLOCK_ON_ERROR` records the intended host policy for a production implementation.

Start here:

- [Microsoft Purview data security and governance APIs](https://learn.microsoft.com/graph/security-datasecurityandgovernance-overview)
- [Use Microsoft Purview APIs in your apps](https://learn.microsoft.com/purview/developer/use-the-api)

## Amazon Bedrock references

- [Get started with the Amazon Bedrock API](https://docs.aws.amazon.com/bedrock/latest/userguide/getting-started-api.html)
- [Inference using the Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [AWS SDK for JavaScript v3 Bedrock Runtime examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html)
- [AgentCore + Entra Agent ID federation template](agentcore/README.md)
