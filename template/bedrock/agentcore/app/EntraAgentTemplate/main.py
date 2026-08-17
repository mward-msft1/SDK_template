"""Amazon Bedrock AgentCore entry point with an explicit Entra federation test."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

from bedrock_agentcore.runtime import BedrockAgentCoreApp
from entra_token_provider import get_resource_token
from strands import Agent
from strands.agent.conversation_manager.null_conversation_manager import (
    NullConversationManager,
)
from strands.models.bedrock import BedrockModel

GRAPH_SCOPE = "https://graph.microsoft.com/.default"

app = BedrockAgentCoreApp()


def _new_agent() -> Agent:
    """Create isolated, stateless history for each invocation."""
    return Agent(
        model=BedrockModel(
            model_id=os.getenv("BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0")
        ),
        system_prompt="You are a helpful enterprise assistant.",
        conversation_manager=NullConversationManager(),
    )


def _graph_identity_check() -> dict:
    """Validate federation without exposing any token or authorization header."""
    stage = "Microsoft Graph service principal lookup"
    try:
        child_agent_client_id = os.environ["ENTRA_CHILD_AGENT_CLIENT_ID"]
        token_result = get_resource_token(GRAPH_SCOPE)
        if not token_result.success or not token_result.access_token:
            return {
                "stage": stage,
                "success": False,
                "error": token_result.error,
                "tokens_logged": False,
            }

        request = urllib.request.Request(
            "https://graph.microsoft.com/v1.0/"
            f"servicePrincipals(appId='{child_agent_client_id}')",
            method="GET",
            headers={"Authorization": f"Bearer {token_result.access_token}"},
        )
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.loads(response.read().decode("utf-8"))
            return {
                "stage": stage,
                "success": 200 <= response.status < 300,
                "http_status": response.status,
                "identity_client_id_match": (
                    body.get("appId") == child_agent_client_id
                ),
                "service_principal_type": body.get("servicePrincipalType"),
                "error": None,
                "tokens_logged": False,
            }
    except KeyError as exc:
        return {
            "stage": stage,
            "success": False,
            "error": {
                "description": (
                    f"Required environment variable is missing: "
                    f"{str(exc).strip(chr(39))}"
                )
            },
            "tokens_logged": False,
        }
    except urllib.error.HTTPError as exc:
        return {
            "stage": stage,
            "success": False,
            "http_status": exc.code,
            "error": {"description": "Microsoft Graph request failed"},
            "tokens_logged": False,
        }
    except (urllib.error.URLError, json.JSONDecodeError, UnicodeDecodeError):
        return {
            "stage": stage,
            "success": False,
            "error": {"description": "Microsoft Graph response was unavailable"},
            "tokens_logged": False,
        }


@app.entrypoint
async def invoke(payload, _context):
    prompt = payload.get("prompt", "") if isinstance(payload, dict) else ""
    action = payload.get("action", "") if isinstance(payload, dict) else ""

    if prompt == "entra_graph_test" or action == "entra_graph_test":
        yield {
            "event": {
                "contentBlockDelta": {
                    "delta": {"text": json.dumps(_graph_identity_check())}
                }
            }
        }
        return

    async for event in _new_agent().stream_async(prompt):
        if isinstance(event, dict) and "event" in event:
            yield event


if __name__ == "__main__":
    app.run()
