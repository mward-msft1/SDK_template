# SDK_template

A **beginner-friendly, agnostic agent template** showing how to inject:
1. **Microsoft Agent Framework** runtime hooks (`microsoft/agent-framework`)
2. **Microsoft 365 Agents SDK** host hooks (`microsoft/agents`)
3. **Agent 365 SDK** observability hooks
4. **Microsoft Purview (Graph) policy evaluation**
5. **Amazon Bedrock** model inference through the `Converse` API
6. **Microsoft Entra Agent ID auth sidecar** for autonomous and OBO tokens
7. **Amazon Bedrock AgentCore Runtime** passwordless federation to Entra Agent ID
8. **Cursor SDK** local agent orchestration with enforced Purview and Agent 365 telemetry
9. **Clawpilot / OpenClaw** trusted middleware, tool enforcement, and secure Agent Skill guidance
10. **Agent 365 CLI and SDK** blueprint provisioning, configuration import, and complete observability wiring

The goal is to give you a portable starter you can adapt to Python, .NET, or Node runtimes while keeping all tenant-bound values as explicit placeholders.

## Prerequisites and setup

Use `template/README.md` as the source of truth for:
1. Required Microsoft 365 / Entra / Purview prerequisites.
2. Required local toolchains for JS, Python, C++, .NET, Rust, and Go.
3. Step-by-step setup and run instructions for each language template.

## When and where to insert each SDK

Insert the SDKs in the **trusted application host**, not in the system prompt,
agent instructions, model, tool description, or Agent Skill. The host must own
authentication, policy enforcement, telemetry, and the final decision to call
the model or return content.

| SDK or integration | When it runs | Where it belongs in the agent framework | Template starting point |
|---|---|---|---|
| **Microsoft Agent Framework** | For the actual agent/model turn | Inside the `next(context)` function, between the Purview input and output gates | `template/src/framework/hostAdapters.js` |
| **Microsoft 365 Agents SDK** | When receiving and replying to channel activities | At the outer channel/activity handler; convert the activity to the shared turn context, call the governed middleware, then send only its allowed result | `template/src/framework/hostAdapters.js` |
| **Microsoft Entra Agent ID SDK sidecar** | Just before a protected downstream API needs a token | Beside the trusted host as the authentication boundary; the host calls it for short-lived child Agent Identity tokens | `template/src/integrations/entraSidecarClient.js` and `template/entra-sidecar/` |
| **Microsoft Purview API** | Before inference, before tool/A2A effects, and after inference | In host middleware and pre-tool hooks: `uploadText` gates input; `downloadText` gates complete output and outbound payloads | `template/src/integrations/purviewAdapter.js` |
| **Agent 365 SDK / Microsoft OpenTelemetry** | From host startup through completion of every turn | Initialize once before the runtime starts; wrap invocation, Purview decisions, inference, tools, errors, and completion in telemetry scopes | `template/src/integrations/agent365Adapter.js` |
| **Amazon Bedrock Runtime** | Only after the input gate allows the request | In the model invocation slot represented by `next(context)`; return the complete response to the output gate | `template/src/integrations/bedrockAdapter.js` |
| **Amazon Bedrock AgentCore federation** | When AgentCore, rather than the local host, authenticates to Entra | At the AgentCore runtime identity boundary; it replaces the local sidecar path but does not replace Purview or Agent 365 | `template/bedrock/agentcore/` |
| **Cursor SDK** | Only after the input gate allows a local coding task | Inside the governed run; buffer the completed Cursor result before the Purview output gate | `template/cursor/` |
| **Claw-Pilot / OpenClaw** | On inbound messages, before tool/A2A execution, and before outbound delivery | Use trusted runtime middleware for messages and a decision-aware plugin hook for tools; do not rely on `SKILL.md` for enforcement | `template/clawpilot/` |

### Required order for every agent turn

1. The host receives the request and creates a turn/correlation ID.
2. Agent 365 starts the invocation scope.
3. The host asks the Entra Agent ID sidecar for the token needed by Purview.
4. Purview computes protection scopes and evaluates the input with
   `processContent` and `uploadText`.
5. Only an allowed request reaches Agent Framework, Bedrock, Cursor, or another
   model runtime.
6. Before any tool or agent-to-agent call causes an external effect, Purview
   evaluates the serialized destination and payload.
7. The host buffers the complete model response.
8. Purview evaluates the response with `processContent` and `downloadText`.
9. Only allowed output is sent to the user, channel, tool, or downstream agent.
10. Agent 365 records completion or error and closes the invocation scope.

The default should be **fail closed**: if token acquisition or Purview
evaluation fails, do not invoke the model, execute the tool, or release the
output. The detailed insertion-point diagram and editable Excalidraw source are
in [`template/README.md`](template/README.md#sdk-insertion-point-diagram).

## Copy-paste SDK examples

### Agent 365 SDK: observe the governed turn

Install the current Node.js packages:

```bash
npm install @microsoft/opentelemetry @opentelemetry/resources
```

The example below assumes it is running from `template/clawpilot/`, where the
included Entra sidecar client is available. Initialize telemetry once at host
startup, start one invocation scope per turn, and record prompt/response content
only after the matching Purview gate allows it.

```typescript
import {
  ApplyGuardrailScope,
  GuardrailDecisionType,
  GuardrailTargetType,
  InvokeAgentScope,
  shutdownMicrosoftOpenTelemetry,
  useMicrosoftOpenTelemetry
} from "@microsoft/opentelemetry";
import type {
  A365Request,
  AgentDetails
} from "@microsoft/opentelemetry";
import { EntraSidecarClient } from "./src/entra-sidecar.js";

const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} before starting the agent.`);
  return value;
};

const sidecar = new EntraSidecarClient(
  process.env.ENTRA_SIDECAR_URL ?? "http://localhost:5000",
  required("AGENT_CLIENT_ID")
);

useMicrosoftOpenTelemetry({
  a365: {
    enabled: true,
    useS2SEndpoint: true,
    tokenResolver: async () =>
      sidecar.getAccessToken(
        process.env.ENTRA_AGENT365_SERVICE_NAME ?? "Agent365"
      )
  }
});

const agentDetails: AgentDetails = {
  agentId: required("AGENT_CLIENT_ID"),
  agentName: required("AGENT_NAME"),
  agentDescription: required("AGENT_DESCRIPTION"),
  agentBlueprintId: required("BLUEPRINT_APP_ID"),
  tenantId: required("TENANT_ID"),
  providerName: "Your agent host"
};

export async function runObservedTurn(options: {
  prompt: string;
  turnId: string;
  purviewAllowsInput: () => Promise<boolean>;
  invokeAgent: () => Promise<string>;
  purviewAllowsOutput: (output: string) => Promise<boolean>;
}): Promise<string> {
  const request: A365Request = {
    sessionId: options.turnId,
    conversationId: options.turnId,
    channel: { name: "custom-agent" }
  };
  const scope = InvokeAgentScope.start(request, {}, agentDetails);

  try {
    return await scope.withActiveSpanAsync(async () => {
      const observePurview = async (
        targetType: GuardrailTargetType,
        evaluate: () => Promise<boolean>
      ): Promise<boolean> => {
        const guardrail = ApplyGuardrailScope.start(
          {
            targetType,
            decisionType: GuardrailDecisionType.Allow,
            guardianName: "Microsoft Purview",
            guardianProviderName: "Microsoft",
            externalEventId: options.turnId
          },
          agentDetails,
          request
        );
        try {
          const allowed = await evaluate();
          guardrail.recordDecision(
            allowed
              ? GuardrailDecisionType.Allow
              : GuardrailDecisionType.Deny
          );
          return allowed;
        } catch (error) {
          guardrail.recordError(
            error instanceof Error ? error : new Error(String(error))
          );
          throw error;
        } finally {
          guardrail.dispose();
        }
      };

      if (
        !(await observePurview(
          GuardrailTargetType.LlmInput,
          options.purviewAllowsInput
        ))
      ) {
        throw new Error("Purview blocked the input.");
      }
      scope.recordInputMessages([options.prompt]);

      const output = await options.invokeAgent();
      if (
        !(await observePurview(GuardrailTargetType.LlmOutput, () =>
          options.purviewAllowsOutput(output)
        ))
      ) {
        throw new Error("Purview blocked the output.");
      }
      scope.recordOutputMessages([output]);
      return output;
    });
  } catch (error) {
    scope.recordError(
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  } finally {
    scope.dispose();
  }
}

// Register this function with your host's graceful-shutdown handler.
export async function shutdownObservability(): Promise<void> {
  await shutdownMicrosoftOpenTelemetry();
}
```

For production observability, also create `InferenceScope` and
`ExecuteToolScope` spans around model and tool operations. See the official
[Microsoft OpenTelemetry manual instrumentation
guide](https://learn.microsoft.com/microsoft-agent-365/developer/microsoft-opentelemetry#manual-instrumentation).

### Purview SDK: Microsoft Agent Framework middleware

For Python Agent Framework applications, install the native middleware:

```bash
pip install agent-framework azure-identity
```

```python
import asyncio
import os

from agent_framework import Agent, Message
from agent_framework.microsoft import PurviewPolicyMiddleware, PurviewSettings
from agent_framework.openai import OpenAIChatCompletionClient
from azure.identity import AzureCliCredential, InteractiveBrowserCredential


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Set {name} before starting the agent.")
    return value


async def main() -> None:
    chat_client = OpenAIChatCompletionClient(
        model=required("AZURE_OPENAI_CHAT_COMPLETION_MODEL"),
        azure_endpoint=required("AZURE_OPENAI_ENDPOINT"),
        credential=AzureCliCredential(),
    )

    purview = PurviewPolicyMiddleware(
        credential=InteractiveBrowserCredential(
            client_id=required("PURVIEW_CLIENT_APP_ID")
        ),
        settings=PurviewSettings(app_name=required("AGENT_NAME")),
    )

    agent = Agent(
        client=chat_client,
        instructions="You are a secure assistant.",
        middleware=[purview],
    )

    response = await agent.run(
        Message(role="user", contents=["Summarize zero trust in one sentence."])
    )
    print(response)


if __name__ == "__main__":
    asyncio.run(main())
```

`InteractiveBrowserCredential` and `AzureCliCredential` are convenient local
development credentials. Use a deliberately selected managed identity,
workload identity, certificate, or Agent ID flow in production. See
[Use Microsoft Purview SDK with Agent
Framework](https://learn.microsoft.com/agent-framework/tutorials/plugins/use-purview-with-agent-framework-sdk).

### Purview API client: TypeScript custom runtimes

Bedrock, Cursor, Claw-Pilot, and other custom hosts can use the included Graph
client. This example also runs from `template/clawpilot/`:

```typescript
import { loadGovernanceConfig } from "./src/config.js";
import { EntraSidecarClient } from "./src/entra-sidecar.js";
import { PurviewClient } from "./src/purview-client.js";

const config = loadGovernanceConfig();
const sidecar = new EntraSidecarClient(
  config.entraSidecarUrl,
  config.agentClientId
);
const purview = new PurviewClient(config, sidecar);

async function requirePurviewAllow(
  activity: "uploadText" | "downloadText",
  content: string,
  correlationId: string
): Promise<void> {
  const decision = await purview.evaluate(activity, content, correlationId);
  if (decision.block) {
    throw new Error(`Purview blocked ${activity}.`);
  }
}

export async function runGovernedAgent(
  prompt: string,
  invokeAgent: () => Promise<string>
): Promise<string> {
  const correlationId = crypto.randomUUID();

  // Compute after authentication and cache the returned ETag.
  await purview.computeProtectionScopes();

  // Input gate: do not invoke the model until this returns allow.
  await requirePurviewAllow("uploadText", prompt, correlationId);
  const output = await invokeAgent();

  // Output gate: do not stream, display, forward, or execute this output yet.
  await requirePurviewAllow("downloadText", output, correlationId);
  return output;
}
```

The included client caches the `ETag`, sends it as `If-None-Match`, and
recomputes scopes when `protectionScopeState` is `modified`. A production host
must also inspect and enforce every returned `policyAction`, apply the most
restrictive applicable scope, refresh scopes periodically, and block
agent-to-agent calls before execution when Purview returns `restrictAccess`.
See the official [Purview API
tutorial](https://learn.microsoft.com/purview/developer/use-the-api).

## Template contents

- `template/.env.example` - tenant/app placeholders required to activate integrations.
- `template/config/tenant.template.json` - app + policy mapping placeholders per tenant.
- `template/python/` - beginner Python examples of the same middleware + adapters.
- `template/cpp/` - beginner C++ examples of the same middleware + adapters.
- `template/dotnet/` - beginner C#/.NET examples of the same middleware + adapters.
- `template/rust/` - beginner Rust examples of the same middleware + adapters.
- `template/go/` - beginner Go examples of the same middleware + adapters.
- `template/src/framework/agentMiddlewareTemplate.js` - generic middleware that interjects Purview + Agent365 into an agent turn.
- `template/src/framework/hostAdapters.js` - where to connect the middleware to Agent Framework **or** Microsoft 365 Agents SDK containers.
- `template/src/integrations/agent365Adapter.js` - Agent365 SDK insertion points.
- `template/src/integrations/purviewAdapter.js` - Purview Graph calls for `protectionScopes/compute` and `processContent`.
- `template/src/integrations/entraSidecarClient.js` - gets Graph authorization headers from the local Entra Agent ID sidecar.
- `template/entra-sidecar/` - Docker Compose and detailed beginner instructions for autonomous and OBO agents.
- `template/src/integrations/bedrockAdapter.js` - Amazon Bedrock Runtime `Converse` integration.
- `template/bedrock/README.md` - complete copy-paste Bedrock setup plus Agent 365 and Purview SDK guidance.
- `template/bedrock/agentcore/` - AgentCore Runtime, IAM, Strands, and two-stage Entra workload federation template.
- `template/cursor/` - complete local Cursor SDK example with fail-closed Purview input/output gates and the Microsoft OpenTelemetry Distro for Agent 365.
- `template/clawpilot/` - complete Claw-Pilot middleware/plugin framework plus OpenClaw Agent Skill security guidance.
- `template/agent365/` - complete A365 CLI blueprint setup, safe configuration import, SDK installation, and runnable observability example.
- `template/src/exampleRunner.js` - runnable skeleton showing wire-up.
- `template/purview/Create-DlpPolicyForCustomAIApps.template.ps1` - tenant DLP policy bootstrap placeholders.

## Beginner quick start

1. Follow prerequisites in `template/README.md`.
2. Copy `template/.env.example` to `.env` and fill all placeholder values.
3. Follow `template/entra-sidecar/README.md` to add your blueprint and agent identity values and start the local auth sidecar.
4. Pick your host:
   - `agent-framework` (Agent Framework)
   - `m365-agents-sdk` (Microsoft 365 Agents SDK / `microsoft/agents`)
   - `bedrock` (direct Amazon Bedrock model invocation)
5. For Bedrock, follow the copy-paste instructions in `template/bedrock/README.md`.
   For AgentCore-hosted federation, use `template/bedrock/agentcore/README.md`
   instead of the local sidecar path.
   For Cursor, use `template/cursor/README.md`.
   For Clawpilot or OpenClaw, use `template/clawpilot/README.md`.
   For Agent 365 CLI blueprint onboarding, use `template/agent365/README.md`.
6. Replace TODO blocks in:
   - `template/src/framework/hostAdapters.js`
   - `template/src/integrations/agent365Adapter.js`
   - `template/src/integrations/purviewAdapter.js`
7. Keep Purview app registration IDs aligned between:
   - `PURVIEW_APP_LOCATION_ID` in `.env`
   - DLP policy script application list in `template/purview/Create-DlpPolicyForCustomAIApps.template.ps1`
8. Register the middleware from `agentMiddlewareTemplate.js` in your host runtime and route each user turn through it.
9. If you prefer Python, start from `template/python/example_runner.py`.
10. If you prefer C++, start from `template/cpp/src/example_runner.cpp`.
11. If you prefer C#/.NET, start from `template/dotnet/Program.cs`.
12. If you prefer Rust, start from `template/rust/src/main.rs`.
13. If you prefer Go, start from `template/go/main.go`.

## Runtime flow

1. Ask the Entra Agent ID sidecar for an autonomous or OBO Graph authorization header.
2. Compute Purview protection scopes for the signed-in user.
3. Evaluate inbound content (`uploadText`) before model execution.
4. Report decision/events through Agent365 telemetry hooks.
5. Evaluate outbound content (`downloadText`) after model execution.
6. Enforce block/redact decisions before returning content to the caller.

### AgentCore Runtime path

This alternative does not use the local sidecar:

1. The AgentCore execution role calls AWS STS `GetWebIdentityToken` for a
   short-lived RS256 assertion with audience `api://AzureADTokenExchange`.
2. The application exchanges the assertion for an Entra Blueprint token using
   the child Agent Identity ID as `fmi_path`.
3. It exchanges the Blueprint token for a child Agent Identity resource token.
4. The resource token stays in process memory and is used only for the intended
   downstream API request.

See `template/bedrock/agentcore/README.md` for copy-paste deployment,
identifier mapping, IAM restrictions, and troubleshooting.
