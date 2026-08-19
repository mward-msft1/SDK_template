import type { AppConfig } from "./config.js";
interface AuthorizationProvider {
  getAuthorizationHeader(serviceName: string): Promise<string>;
}

export interface PurviewDecision {
  block: boolean;
  actions: string[];
  raw: unknown;
}

interface PolicyUserScope {
  activities?: string;
  executionMode?: string;
  policyActions?: unknown[];
}

interface ProtectionScopesResponse {
  value?: PolicyUserScope[];
}

interface ProcessContentResponse {
  protectionScopeState?: string;
  policyActions?: unknown[];
  processingErrors?: unknown[];
}

const BLOCK_ACTIONS = new Set([
  "block",
  "blocked",
  "blockaccess",
  "deny",
  "denied",
  "restrictaccess"
]);

function hasBooleanBlock(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasBooleanBlock);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]/g, "");
    if (
      child === true &&
      ["block", "blocked", "isblocked", "deny", "denied", "isdenied"].includes(
        normalizedKey
      )
    ) {
      return true;
    }
    return hasBooleanBlock(child);
  });
}

function collectStrings(value: unknown, result: string[] = []): string[] {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, result));
  else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectStrings(item, result));
  }
  return result;
}

export function parsePurviewDecision(raw: unknown): PurviewDecision {
  const actions = collectStrings(raw);
  const block =
    hasBooleanBlock(raw) ||
    actions.some((action) =>
      BLOCK_ACTIONS.has(action.toLowerCase().replace(/[\s_-]/g, ""))
    );
  return { block, actions, raw };
}

export class PurviewClient {
  private scopes: PolicyUserScope[] = [];
  private etag = "";

  constructor(
    private readonly config: AppConfig,
    private readonly sidecar: AuthorizationProvider,
    private readonly fetchFn: typeof fetch = fetch
  ) {}

  async computeProtectionScopes(): Promise<unknown> {
    const response = await this.post(
      `/users/${encodeURIComponent(
        this.config.purviewUserId
      )}/dataSecurityAndGovernance/protectionScopes/compute`,
      {
        activities: "uploadText,downloadText",
        locations: [
          {
            "@odata.type": "microsoft.graph.policyLocationApplication",
            value: this.config.purviewAppLocationId
          }
        ]
      },
      { "Client-Request-Id": crypto.randomUUID() }
    );
    const body = (await response.json()) as ProtectionScopesResponse;
    this.scopes = body.value ?? [];
    this.etag = response.headers.get("etag") ?? "";
    return body;
  }

  async evaluate(
    activity: "uploadText" | "downloadText",
    content: string,
    correlationId: string
  ): Promise<PurviewDecision> {
    const scopeDecision = this.getScopeDecision(activity);
    if (scopeDecision.block || !this.hasApplicableScope(activity)) return scopeDecision;

    return this.processContent(activity, content, correlationId, true);
  }

  private getApplicableScopes(
    activity: "uploadText" | "downloadText"
  ): PolicyUserScope[] {
    return this.scopes.filter((scope) =>
      (scope.activities ?? "")
        .split(",")
        .map((value) => value.trim())
        .includes(activity)
    );
  }

  private hasApplicableScope(activity: "uploadText" | "downloadText"): boolean {
    return this.getApplicableScopes(activity).length > 0;
  }

  private getScopeDecision(
    activity: "uploadText" | "downloadText"
  ): PurviewDecision {
    return parsePurviewDecision(
      this.getApplicableScopes(activity).flatMap(
        (scope) => scope.policyActions ?? []
      )
    );
  }

  private async processContent(
    activity: "uploadText" | "downloadText",
    content: string,
    correlationId: string,
    canRefresh: boolean
  ): Promise<PurviewDecision> {
    const timestamp = new Date().toISOString();
    const response = await this.post(
      `/users/${encodeURIComponent(
        this.config.purviewUserId
      )}/dataSecurityAndGovernance/processContent`,
      {
        contentToProcess: {
          contentEntries: [
            {
              "@odata.type": "microsoft.graph.processConversationMetadata",
              identifier: crypto.randomUUID(),
              content: {
                "@odata.type": "microsoft.graph.textContent",
                data: content
              },
              agents: [
                {
                  "@odata.type": "microsoft.graph.aiAgentInfo",
                  blueprintId: this.config.blueprintAppId,
                  identifier: this.config.agentClientId,
                  name: this.config.agentName,
                  version: "1.0"
                }
              ],
              name: `${this.config.agentName} message`,
              correlationId,
              sequenceNumber: 0,
              isTruncated: false,
              createdDateTime: timestamp,
              modifiedDateTime: timestamp
            }
          ],
          activityMetadata: { activity },
          deviceMetadata: {
            deviceType: "Unmanaged",
            operatingSystemSpecifications: {
              operatingSystemPlatform: process.platform,
              operatingSystemVersion: process.version
            },
            ipAddress: "127.0.0.1"
          },
          protectedAppMetadata: {
            name: this.config.agentName,
            version: "1.0",
            applicationLocation: {
              "@odata.type": "microsoft.graph.policyLocationApplication",
              value: this.config.purviewAppLocationId
            }
          },
          integratedAppMetadata: {
            name: this.config.agentName,
            version: "1.0"
          }
        }
      },
      {
        "Client-Request-Id": correlationId,
        ...(this.etag ? { "If-None-Match": this.etag } : {})
      }
    );

    const nextEtag = response.headers.get("etag");
    if (nextEtag) this.etag = nextEtag;
    if (response.status === 202 || response.status === 204) {
      return { block: false, actions: [], raw: null };
    }

    const raw = (await response.json()) as ProcessContentResponse;
    if (raw.processingErrors?.length) {
      throw new Error(`Purview processContent returned processingErrors.`);
    }
    const decision = parsePurviewDecision(raw.policyActions ?? []);
    if (raw.protectionScopeState?.toLowerCase() === "modified") {
      await this.computeProtectionScopes();
      if (decision.block) return decision;
      const refreshedScopeDecision = this.getScopeDecision(activity);
      if (refreshedScopeDecision.block || !this.hasApplicableScope(activity)) {
        return refreshedScopeDecision;
      }
      if (!canRefresh) {
        throw new Error("Purview protection scopes changed repeatedly during evaluation.");
      }
      return this.processContent(activity, content, correlationId, false);
    }
    return decision;
  }

  private async post(
    pathname: string,
    body: unknown,
    additionalHeaders: Record<string, string>
  ): Promise<Response> {
    const response = await this.fetchFn(`${this.config.purviewGraphBaseUrl}${pathname}`, {
      method: "POST",
      headers: {
        Authorization: await this.sidecar.getAuthorizationHeader(
          this.config.graphServiceName
        ),
        "Content-Type": "application/json",
        ...additionalHeaders
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000)
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(
        `Purview request failed: ${response.status}${detail ? ` - ${detail}` : ""}`
      );
    }
    return response;
  }
}
