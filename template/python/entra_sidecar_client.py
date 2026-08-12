import json
import urllib.error
import urllib.parse
import urllib.request


def _normalize_authorization_header(value: str) -> str:
    header = (value or "").strip()
    if not header:
        raise ValueError("The Entra sidecar returned an empty authorizationHeader.")
    if header.startswith(("Bearer ", "PoP ")):
        return header
    return f"Bearer {header}"


class EntraSidecarClient:
    def __init__(self, config: dict):
        self.config = config

    def get_authorization_header(self, incoming_authorization_header: str = "") -> str:
        mode = self.config["entra_sidecar_auth_mode"].lower()
        if mode not in {"autonomous", "obo"}:
            raise ValueError("ENTRA_SIDECAR_AUTH_MODE must be autonomous or obo.")

        endpoint = (
            "AuthorizationHeaderUnauthenticated"
            if mode == "autonomous"
            else "AuthorizationHeader"
        )
        service = urllib.parse.quote(self.config["entra_sidecar_service_name"])
        query = urllib.parse.urlencode(
            {
                "AgentIdentity": self.config["entra_agent_client_id"],
                "optionsOverride.RequestAppToken": (
                    "true" if mode == "autonomous" else "false"
                ),
            }
        )
        url = (
            f"{self.config['entra_sidecar_url'].rstrip('/')}"
            f"/{endpoint}/{service}?{query}"
        )

        headers = {}
        if mode == "obo":
            if not incoming_authorization_header:
                raise ValueError(
                    "The current request authorization header is required in obo mode."
                )
            headers["Authorization"] = _normalize_authorization_header(
                incoming_authorization_header
            )

        request = urllib.request.Request(url=url, headers=headers, method="GET")
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Entra sidecar token request failed: {error.code}"
                + (f" - {detail}" if detail else "")
            ) from error

        return _normalize_authorization_header(body.get("authorizationHeader", ""))
