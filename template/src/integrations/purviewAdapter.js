function parseActivities(raw) {
  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export class PurviewAdapter {
  constructor(config) {
    this.config = config;
  }

  async computeProtectionScopes(userId) {
    const activities = parseActivities(this.config.purviewActivityTypes).join(",");

    const response = await fetch(
      `${this.config.purviewGraphBaseUrl}/users/${userId}/dataSecurityAndGovernance/protectionScopes/compute`,
      {
        method: "POST",
        headers: await this.#authHeaders(),
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

  async evaluateContent({ userId, activity, content, contextId }) {
    const response = await fetch(
      `${this.config.purviewGraphBaseUrl}/users/${userId}/dataSecurityAndGovernance/activities/contentActivities`,
      {
        method: "POST",
        headers: await this.#authHeaders(),
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
    // Placeholder parser: adapt this for the exact Graph response shape your tenant returns.
    const isBlocked = JSON.stringify(result).toLowerCase().includes("block");
    return {
      block: isBlocked,
      raw: result
    };
  }

  async #authHeaders() {
    // TODO: Replace with your tenant's token acquisition flow (MSAL, managed identity, etc.).
    // Must return a Graph token with Purview permissions (for example: Content.Process.User, ProtectionScopes.Compute.User).
    const token = this.config.graphAccessTokenPlaceholder;
    if (!token) {
      throw new Error("Missing graphAccessTokenPlaceholder. Replace token acquisition TODO.");
    }

    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  }
}
