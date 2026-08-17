"""Acquire a child Entra Agent Identity token from an AgentCore execution role."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any

import botocore.exceptions
import botocore.session

TOKEN_EXCHANGE_AUDIENCE = "api://AzureADTokenExchange"
CLIENT_ASSERTION_TYPE = (
    "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
)
HTTP_TIMEOUT_SECONDS = 30


@dataclass(frozen=True)
class TokenResult:
    success: bool
    access_token: str | None = None
    error: dict[str, Any] | None = None


def _post_form(url: str, values: dict[str, str]) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=urllib.parse.urlencode(values).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
        return json.loads(response.read().decode("utf-8"))


def _error(stage: str, description: str, **details: Any) -> TokenResult:
    return TokenResult(
        success=False,
        error={"stage": stage, "description": description, **details},
    )


def get_resource_token(resource_scope: str) -> TokenResult:
    """Return a resource token for in-process use only.

    Never log, trace, serialize, persist, or return the token to an agent user.
    """
    if not isinstance(resource_scope, str) or not resource_scope.strip():
        return _error("Input validation", "resource_scope must be non-empty")

    stage = "Configuration"
    try:
        tenant_id = os.environ["ENTRA_TENANT_ID"]
        blueprint_client_id = os.environ["ENTRA_BLUEPRINT_CLIENT_ID"]
        child_agent_client_id = os.environ["ENTRA_CHILD_AGENT_CLIENT_ID"]
        region = os.getenv("AWS_REGION", "us-east-1")
        token_url = (
            f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
        )

        stage = "AWS signed assertion"
        sts = botocore.session.get_session().create_client(
            "sts", region_name=region
        )
        assertion = sts.get_web_identity_token(
            Audience=[TOKEN_EXCHANGE_AUDIENCE],
            DurationSeconds=300,
            SigningAlgorithm="RS256",
        )["WebIdentityToken"]

        stage = "Blueprint token exchange"
        blueprint_response = _post_form(
            token_url,
            {
                "client_id": blueprint_client_id,
                "grant_type": "client_credentials",
                "scope": f"{TOKEN_EXCHANGE_AUDIENCE}/.default",
                "client_assertion_type": CLIENT_ASSERTION_TYPE,
                "client_assertion": assertion,
                "fmi_path": child_agent_client_id,
            },
        )
        blueprint_token = blueprint_response["access_token"]

        stage = "Child Agent Identity resource token exchange"
        resource_response = _post_form(
            token_url,
            {
                "client_id": child_agent_client_id,
                "grant_type": "client_credentials",
                "scope": resource_scope,
                "client_assertion_type": CLIENT_ASSERTION_TYPE,
                "client_assertion": blueprint_token,
            },
        )
        return TokenResult(
            success=True,
            access_token=resource_response["access_token"],
        )
    except KeyError as exc:
        missing = str(exc).strip("'")
        description = (
            f"Required environment variable is missing: {missing}"
            if missing.startswith("ENTRA_")
            else "A required token response field was missing"
        )
        return _error(stage, description)
    except urllib.error.HTTPError as exc:
        return _error(
            stage,
            "Microsoft Entra token request failed",
            http_status=exc.code,
        )
    except urllib.error.URLError:
        return _error(stage, "Microsoft Entra token endpoint was unreachable")
    except (botocore.exceptions.BotoCoreError, botocore.exceptions.ClientError) as exc:
        return _error(stage, f"AWS STS request failed: {type(exc).__name__}")
    except (json.JSONDecodeError, UnicodeDecodeError, TypeError, ValueError):
        return _error(stage, "Token endpoint returned an invalid response")
