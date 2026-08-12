import json
import urllib.error
import urllib.request

from entra_sidecar_client import EntraSidecarClient


def parse_activities(raw: str) -> str:
    return ",".join([x.strip() for x in raw.split(",") if x.strip()])


class PurviewAdapter:
    def __init__(self, config: dict):
        self.config = config
        self.entra_sidecar = EntraSidecarClient(config)

    async def compute_protection_scopes(
        self, user_id: str, incoming_authorization_header: str = ""
    ) -> dict:
        url = (
            f"{self.config['purview_graph_base_url']}/users/{user_id}"
            "/dataSecurityAndGovernance/protectionScopes/compute"
        )
        payload = {
            "activities": parse_activities(self.config["purview_activity_types"]),
            "locations": [
                {
                    "@odata.type": "microsoft.graph.policyLocationApplication",
                    "value": self.config["purview_app_location_id"],
                }
            ],
        }
        return self._post_json(url, payload, incoming_authorization_header)

    async def evaluate_content(
        self,
        user_id: str,
        activity: str,
        content: str,
        context_id: str,
        incoming_authorization_header: str = "",
    ) -> dict:
        url = (
            f"{self.config['purview_graph_base_url']}/users/{user_id}"
            "/dataSecurityAndGovernance/activities/contentActivities"
        )
        payload = {
            "activity": activity,
            "contentToProcess": {
                "contentEntries": [
                    {
                        "@odata.type": "microsoft.graph.contentEntry",
                        "content": content,
                    }
                ]
            },
            "metadata": {
                "correlationId": context_id,
                "appName": self.config["agent_name"],
            },
        }
        return self._post_json(url, payload, incoming_authorization_header)

    def get_enforcement_decision(self, result: dict) -> dict:
        is_blocked = "block" in json.dumps(result).lower()
        return {"block": is_blocked, "raw": result}

    def _post_json(
        self, url: str, payload: dict, incoming_authorization_header: str
    ) -> dict:
        if self.config["entra_sidecar_enabled"]:
            authorization = self.entra_sidecar.get_authorization_header(
                incoming_authorization_header
            )
        else:
            token = self.config["graph_access_token_placeholder"].strip()
            if not token:
                raise ValueError(
                    "Enable the Entra sidecar or set GRAPH_ACCESS_TOKEN_PLACEHOLDER."
                )
            authorization = token if token.startswith("Bearer ") else f"Bearer {token}"

        request = urllib.request.Request(
            url=url,
            method="POST",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": authorization,
                "Content-Type": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(request) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            raise RuntimeError(f"Purview API request failed: {error.code}") from error
