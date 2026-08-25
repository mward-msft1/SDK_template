export class EntraSidecarClient {
  constructor(
    private readonly baseUrl: string,
    private readonly agentClientId: string,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async getAccessToken(serviceName: string): Promise<string> {
    const url = new URL(
      `/AuthorizationHeaderUnauthenticated/${encodeURIComponent(serviceName)}`,
      this.baseUrl
    );
    url.searchParams.set("AgentIdentity", this.agentClientId);
    url.searchParams.set("optionsOverride.RequestAppToken", "true");

    const response = await this.fetchFn(url, {
      signal: AbortSignal.timeout(30_000)
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Entra sidecar request failed: ${response.status}${
          detail ? ` - ${detail}` : ""
        }`
      );
    }

    const body = (await response.json()) as { authorizationHeader?: string };
    const header = body.authorizationHeader?.trim();
    if (!header) {
      throw new Error("The Entra sidecar returned an empty authorizationHeader.");
    }
    return header.replace(/^(Bearer|PoP)\s+/i, "");
  }
}
