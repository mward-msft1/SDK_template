function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig() {
  return {
    tenantId: required("TENANT_ID"),
    entraClientId: required("ENTRA_CLIENT_ID"),
    entraClientSecret: required("ENTRA_CLIENT_SECRET"),
    defaultUserId: process.env.DEFAULT_USER_ID || "",
    agentName: process.env.AGENT_NAME || "ContosoAgnosticAgent",
    agentRuntime: process.env.AGENT_RUNTIME || "agent-framework",
    agentEnvironment: process.env.AGENT_ENVIRONMENT || "dev",
    hostSdk: process.env.HOST_SDK || "agent-framework",
    m365AgentsBotAppId: required("M365_AGENTS_BOT_APP_ID"),
    m365AgentsBotAppPassword: required("M365_AGENTS_BOT_APP_PASSWORD"),
    m365AgentsTenantId: required("M365_AGENTS_TENANT_ID"),
    agent365AppId: required("AGENT365_APP_ID"),
    agent365AppSecret: required("AGENT365_APP_SECRET"),
    agent365TenantId: required("AGENT365_TENANT_ID"),
    agent365ReportingEndpoint: required("AGENT365_REPORTING_ENDPOINT"),
    purviewGraphBaseUrl: process.env.PURVIEW_GRAPH_BASE_URL || "https://graph.microsoft.com/v1.0",
    purviewGraphScope: process.env.PURVIEW_GRAPH_SCOPE || "https://graph.microsoft.com/.default",
    purviewAppLocationId: required("PURVIEW_APP_LOCATION_ID"),
    purviewActivityTypes: process.env.PURVIEW_ACTIVITY_TYPES || "uploadText,downloadText",
    purviewEnableAuditWhenNoScope:
      (process.env.PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE || "true").toLowerCase() === "true",
    purviewBlockOnError: (process.env.PURVIEW_BLOCK_ON_ERROR || "true").toLowerCase() === "true",

    // Placeholder until replaced with real MSAL/managed identity token acquisition.
    graphAccessTokenPlaceholder: process.env.GRAPH_ACCESS_TOKEN_PLACEHOLDER || ""
  };
}
