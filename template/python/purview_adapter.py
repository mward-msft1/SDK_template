import json
import urllib.error
import urllib.request


def parse_activities(raw: str) -> str:
    return ",".join([x.strip() for x in raw.split(",") if x.strip()])


class PurviewAdapter:
    def __init__(self, config: dict):
        self.config = config

    async def compute_protection_scopes(self, user_id: str) -> dict:
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
        return self._post_json(url, payload)

    async def evaluate_content(self, user_id: str, activity: str, content: str, context_id: str) -> dict:
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
        return self._post_json(url, payload)

    def get_enforcement_decision(self, result: dict) -> dict:
        # Placeholder parser: adapt to the exact Graph response shape in your tenant.
        is_blocked = "block" in json.dumps(result).lower()
        return {"block": is_blocked, "raw": result}

    def _post_json(self, url: str, payload: dict) -> dict:
        token = self.config["graph_access_token_placeholder"]
        if not token:
            raise ValueError(
                "Missing graph_access_token_placeholder. Replace token acquisition TODO."
            )

        request = urllib.request.Request(
            url=url,
            method="POST",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(request) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            raise RuntimeError(f"Purview API request failed: {e.code}") from e
