# SDK_template

A **beginner-friendly, agnostic agent template** showing how to inject:
1. **Microsoft Agent Framework** runtime hooks (`microsoft/agent-framework`)
2. **Microsoft 365 Agents SDK** host hooks (`microsoft/agents`)
3. **Agent 365 SDK** observability hooks
4. **Microsoft Purview (Graph) policy evaluation**
5. **Amazon Bedrock** model inference through the `Converse` API

The goal is to give you a portable starter you can adapt to Python, .NET, or Node runtimes while keeping all tenant-bound values as explicit placeholders.

## Prerequisites and setup

Use `template/README.md` as the source of truth for:
1. Required Microsoft 365 / Entra / Purview prerequisites.
2. Required local toolchains for JS, Python, C++, .NET, Rust, and Go.
3. Step-by-step setup and run instructions for each language template.

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
- `template/src/integrations/purviewAdapter.js` - Purview Graph calls for `protectionScopes/compute` and `contentActivities`.
- `template/src/integrations/bedrockAdapter.js` - Amazon Bedrock Runtime `Converse` integration.
- `template/bedrock/README.md` - complete copy-paste Bedrock setup plus Agent 365 and Purview SDK guidance.
- `template/src/exampleRunner.js` - runnable skeleton showing wire-up.
- `template/purview/Create-DlpPolicyForCustomAIApps.template.ps1` - tenant DLP policy bootstrap placeholders.

## Beginner quick start

1. Follow prerequisites in `template/README.md`.
2. Copy `template/.env.example` to `.env` and fill all placeholder values.
3. Pick your host:
   - `agent-framework` (Agent Framework)
   - `m365-agents-sdk` (Microsoft 365 Agents SDK / `microsoft/agents`)
   - `bedrock` (direct Amazon Bedrock model invocation)
3. For Bedrock, follow the copy-paste instructions in `template/bedrock/README.md`.
4. Replace TODO blocks in:
   - `template/src/framework/hostAdapters.js`
   - `template/src/integrations/agent365Adapter.js`
   - `template/src/integrations/purviewAdapter.js`
5. Keep Purview app registration IDs aligned between:
   - `PURVIEW_APP_LOCATION_ID` in `.env`
   - DLP policy script application list in `template/purview/Create-DlpPolicyForCustomAIApps.template.ps1`
6. Register the middleware from `agentMiddlewareTemplate.js` in your host runtime and route each user turn through it.
7. If you prefer Python, start from `template/python/example_runner.py`.
8. If you prefer C++, start from `template/cpp/src/example_runner.cpp`.
9. If you prefer C#/.NET, start from `template/dotnet/Program.cs`.
10. If you prefer Rust, start from `template/rust/src/main.rs`.
11. If you prefer Go, start from `template/go/main.go`.

## Runtime flow

1. Compute Purview protection scopes for the signed-in user.
2. Evaluate inbound content (`uploadText`) before model execution.
3. Report decision/events through Agent365 telemetry hooks.
4. Evaluate outbound content (`downloadText`) after model execution.
5. Enforce block/redact decisions before returning content to the caller.
