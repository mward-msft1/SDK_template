function normalizeAuthorizationHeader(value) {
  const header = value?.trim();
  if (!header) {
    throw new Error("The Entra sidecar returned an empty authorizationHeader.");
  }
  return header.startsWith("Bearer ") || header.startsWith("PoP ")
    ? header
    : `Bearer ${header}`;
}

export class EntraSidecarClient {
  constructor(config) {
    this.config = config;
  }

  async getAuthorizationHeader(incomingAuthorizationHeader = "") {
    const mode = this.config.entraSidecarAuthMode.toLowerCase();
    if (!["autonomous", "obo"].includes(mode)) {
      throw new Error("ENTRA_SIDECAR_AUTH_MODE must be autonomous or obo.");
    }

    const path =
      mode === "autonomous"
        ? "AuthorizationHeaderUnauthenticated"
        : "AuthorizationHeader";
    const url = new URL(
      `/${path}/${encodeURIComponent(this.config.entraSidecarServiceName)}`,
      this.config.entraSidecarUrl
    );
    url.searchParams.set("AgentIdentity", this.config.entraAgentClientId);
    url.searchParams.set(
      "optionsOverride.RequestAppToken",
      mode === "autonomous" ? "true" : "false"
    );

    const headers = {};
    if (mode === "obo") {
      if (!incomingAuthorizationHeader) {
        throw new Error(
          "The current request authorization header is required in obo mode."
        );
      }
      headers.Authorization = normalizeAuthorizationHeader(
        incomingAuthorizationHeader
      );
    }

    const response = await fetch(url, {
      headers,
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Entra sidecar token request failed: ${response.status}${
          detail ? ` - ${detail}` : ""
        }`
      );
    }

    const body = await response.json();
    return normalizeAuthorizationHeader(body.authorizationHeader);
  }
}
