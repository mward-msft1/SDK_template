function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function requiredWhen(name, condition) {
  return condition ? required(name) : process.env[name] || "";
}

function number(name, fallback) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a number.`);
  }
  return value;
}

export function loadConfig() {
  const hostSdk = process.env.HOST_SDK || "agent-framework";

  return {
    tenantId: required("TENANT_ID"),
    entraClientId: required("ENTRA_CLIENT_ID"),
    entraClientSecret: required("ENTRA_CLIENT_SECRET"),
    entraSidecarEnabled:
      (process.env.ENTRA_SIDECAR_ENABLED || "true").toLowerCase() === "true",
    entraSidecarUrl: process.env.ENTRA_SIDECAR_URL || "http://localhost:5000",
    entraSidecarServiceName: process.env.ENTRA_SIDECAR_SERVICE_NAME || "Graph",
    entraSidecarAuthMode:
      process.env.ENTRA_SIDECAR_AUTH_MODE || "autonomous",
    entraAgentClientId: requiredWhen(
      "AGENT_CLIENT_ID",
      (process.env.ENTRA_SIDECAR_ENABLED || "true").toLowerCase() === "true"
    ),
    defaultUserId: process.env.DEFAULT_USER_ID || "",
    agentName: process.env.AGENT_NAME || "ContosoAgnosticAgent",
    agentRuntime: process.env.AGENT_RUNTIME || "agent-framework",
    agentEnvironment: process.env.AGENT_ENVIRONMENT || "dev",
    hostSdk,
    awsRegion: process.env.AWS_REGION || "us-east-1",
    bedrockModelId: process.env.BEDROCK_MODEL_ID || "amazon.nova-micro-v1:0",
    bedrockMaxTokens: number("BEDROCK_MAX_TOKENS", 512),
    bedrockTemperature: number("BEDROCK_TEMPERATURE", 0.2),
    bedrockSystemPrompt:
      process.env.BEDROCK_SYSTEM_PROMPT || "You are a helpful enterprise assistant.",
    bedrockPrompt:
      process.env.BEDROCK_PROMPT || "Explain how this governed agent template works.",
    m365AgentsBotAppId: requiredWhen(
      "M365_AGENTS_BOT_APP_ID",
      hostSdk === "m365-agents-sdk"
    ),
    m365AgentsBotAppPassword: requiredWhen(
      "M365_AGENTS_BOT_APP_PASSWORD",
      hostSdk === "m365-agents-sdk"
    ),
    m365AgentsTenantId: requiredWhen(
      "M365_AGENTS_TENANT_ID",
      hostSdk === "m365-agents-sdk"
    ),
    agent365AppId: process.env.AGENT365_APP_ID || "",
    agent365AppSecret: process.env.AGENT365_APP_SECRET || "",
    agent365TenantId: process.env.AGENT365_TENANT_ID || "",
    agent365ReportingEndpoint: process.env.AGENT365_REPORTING_ENDPOINT || "",
    purviewGraphBaseUrl: process.env.PURVIEW_GRAPH_BASE_URL || "https://graph.microsoft.com/v1.0",
    purviewGraphScope: process.env.PURVIEW_GRAPH_SCOPE || "https://graph.microsoft.com/.default",
    purviewAppLocationId: required("PURVIEW_APP_LOCATION_ID"),
    purviewActivityTypes: process.env.PURVIEW_ACTIVITY_TYPES || "uploadText,downloadText",
    purviewEnableAuditWhenNoScope:
      (process.env.PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE || "true").toLowerCase() === "true",
    purviewBlockOnError: (process.env.PURVIEW_BLOCK_ON_ERROR || "true").toLowerCase() === "true",

    // Manual fallback when the Entra sidecar is disabled.
    graphAccessTokenPlaceholder: process.env.GRAPH_ACCESS_TOKEN_PLACEHOLDER || ""
  };
}
