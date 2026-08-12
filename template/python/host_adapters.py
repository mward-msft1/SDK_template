"""
Beginner note:
This file shows WHERE to plug governed middleware into your chosen host SDK.
Replace TODOs with real wiring from:
- https://github.com/microsoft/agent-framework
- https://github.com/microsoft/agents
"""


async def run_with_agent_framework(middleware):
    # TODO: Replace with real Agent Framework turn/context objects.
    context = {
        "turn_id": "replace-with-runtime-turn-id",
        "user_id": "replace-with-user-object-id",
        "input_text": "Hello from Agent Framework host",
        "authorization_header": "",
    }

    # TODO: Replace with your real model/agent invoke function.
    async def next_fn(_context):
        return {"output_text": "Agent Framework model output placeholder"}

    return await middleware(context, next_fn)


async def run_with_m365_agents_sdk(middleware):
    # TODO: Replace with real Microsoft 365 Agents SDK activity handler.
    context = {
        "turn_id": "replace-with-activity-id",
        "user_id": "replace-with-entra-object-id",
        "input_text": "Hello from Microsoft 365 Agents SDK host",
        "authorization_header": "replace-with-current-request-authorization-header",
    }

    # TODO: Replace with your AI invocation (OpenAI/Azure OpenAI/other).
    async def next_fn(_context):
        return {"output_text": "Microsoft 365 Agents SDK model output placeholder"}

    return await middleware(context, next_fn)
