import { EntraSidecarClient } from "./entraSidecarClient.js";

function parseActivities(raw) {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export class PurviewAdapter {
  constructor(config) {
    this.config = config;
    this.entraSidecar = new EntraSidecarClient(config);
  }

  async computeProtectionScopes(userId, incomingAuthorizationHeader = "") {
    const activities = parseActivities(this.config.purviewActivityTypes).join(",");
    const response = await fetch(
      `${this.config.purviewGraphBaseUrl}/users/${userId}/dataSecurityAndGovernance/protectionScopes/compute`,
      {
        method: "POST",
        headers: await this.#authHeaders(incomingAuthorizationHeader),
        body: JSON.stringify({
          activities,
          locations: [
            {
              "@odata.type": "microsoft.graph.policyLocationApplication",
              value: this.config.purviewAppLocationId
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Purview computeProtectionScopes failed: ${response.status}`);
    }
    return response.json();
  }

  async evaluateContent({
    userId,
    activity,
    content,
    contextId,
    incomingAuthorizationHeader = ""
  }) {
    const response = await fetch(
      `${this.config.purviewGraphBaseUrl}/users/${userId}/dataSecurityAndGovernance/activities/contentActivities`,
      {
        method: "POST",
        headers: await this.#authHeaders(incomingAuthorizationHeader),
        body: JSON.stringify({
          activity,
          contentToProcess: {
            contentEntries: [
              {
                "@odata.type": "microsoft.graph.contentEntry",
                content
              }
            ]
          },
          metadata: {
            correlationId: contextId,
            appName: this.config.agentName
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Purview evaluateContent failed: ${response.status}`);
    }
    return response.json();
  }

  getEnforcementDecision(result) {
    const isBlocked = JSON.stringify(result).toLowerCase().includes("block");
    return {
      block: isBlocked,
      raw: result
    };
  }

  async #authHeaders(incomingAuthorizationHeader) {
    if (this.config.entraSidecarEnabled) {
      return {
        Authorization: await this.entraSidecar.getAuthorizationHeader(
          incomingAuthorizationHeader
        ),
        "Content-Type": "application/json"
      };
    }

    const token = this.config.graphAccessTokenPlaceholder?.trim();
    if (!token) {
      throw new Error(
        "Enable the Entra sidecar or set GRAPH_ACCESS_TOKEN_PLACEHOLDER."
      );
    }

    return {
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }
}
