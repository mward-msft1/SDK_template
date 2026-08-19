import path from "node:path";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("REPLACE_") || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value)) {
    throw new Error(`Set ${name} in template/cursor/.env.`);
  }
  return value;
}

function booleanValue(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

export interface AppConfig {
  cursorApiKey: string;
  cursorModel: string;
  cursorWorkspace: string;
  cursorPrompt: string;
  cursorIsolateWorkspace: boolean;
  tenantId: string;
  agentClientId: string;
  blueprintAppId: string;
  agentName: string;
  agentDescription: string;
  sidecarUrl: string;
  graphServiceName: string;
  a365ServiceName: string;
  purviewUserId: string;
  purviewAppLocationId: string;
  purviewGraphBaseUrl: string;
  purviewBlockOnError: boolean;
  enableConsoleTelemetry: boolean;
}

export function loadConfig(): AppConfig {
  return {
    cursorApiKey: required("CURSOR_API_KEY"),
    cursorModel: process.env.CURSOR_MODEL?.trim() || "composer-2.5",
    cursorWorkspace: path.resolve(process.env.CURSOR_WORKSPACE?.trim() || "../.."),
    cursorPrompt: required("CURSOR_PROMPT"),
    cursorIsolateWorkspace: booleanValue("CURSOR_ISOLATE_WORKSPACE", true),
    tenantId: required("ENTRA_TENANT_ID"),
    agentClientId: required("ENTRA_AGENT_CLIENT_ID"),
    blueprintAppId: required("ENTRA_BLUEPRINT_APP_ID"),
    agentName: process.env.AGENT_NAME?.trim() || "Governed Cursor Agent",
    agentDescription:
      process.env.AGENT_DESCRIPTION?.trim() ||
      "Local Cursor SDK agent protected by Microsoft Purview",
    sidecarUrl: process.env.ENTRA_SIDECAR_URL?.trim() || "http://localhost:5000",
    graphServiceName: process.env.ENTRA_SIDECAR_GRAPH_SERVICE?.trim() || "Graph",
    a365ServiceName: process.env.ENTRA_SIDECAR_A365_SERVICE?.trim() || "Agent365",
    purviewUserId: required("PURVIEW_USER_ID"),
    purviewAppLocationId: required("PURVIEW_APP_LOCATION_ID"),
    purviewGraphBaseUrl:
      process.env.PURVIEW_GRAPH_BASE_URL?.trim() || "https://graph.microsoft.com/v1.0",
    purviewBlockOnError: booleanValue("PURVIEW_BLOCK_ON_ERROR", true),
    enableConsoleTelemetry: booleanValue("ENABLE_CONSOLE_TELEMETRY", true)
  };
}
