import type { GovernanceConfig } from "./types.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /^<.+>$/.test(value)) {
    throw new Error(`Set ${name} in .env before starting Clawpilot.`);
  }
  return value;
}

function booleanValue(name: string, fallback: boolean): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

export function loadGovernanceConfig(): GovernanceConfig {
  return {
    tenantId: required("TENANT_ID"),
    blueprintAppId: required("BLUEPRINT_APP_ID"),
    agentClientId: required("AGENT_CLIENT_ID"),
    agentName: required("AGENT_NAME"),
    agentDescription: required("AGENT_DESCRIPTION"),
    purviewUserId: required("PURVIEW_USER_ID"),
    purviewAppLocationId: required("PURVIEW_APP_LOCATION_ID"),
    purviewGraphBaseUrl:
      process.env.PURVIEW_GRAPH_BASE_URL?.trim() ||
      "https://graph.microsoft.com/beta",
    entraSidecarUrl:
      process.env.ENTRA_SIDECAR_URL?.trim() || "http://localhost:5000",
    graphServiceName:
      process.env.ENTRA_GRAPH_SERVICE_NAME?.trim() || "Graph",
    agent365ServiceName:
      process.env.ENTRA_AGENT365_SERVICE_NAME?.trim() || "Agent365",
    blockOnError: booleanValue("PURVIEW_BLOCK_ON_ERROR", true),
    enableConsoleTelemetry: booleanValue("ENABLE_CONSOLE_TELEMETRY", false)
  };
}
