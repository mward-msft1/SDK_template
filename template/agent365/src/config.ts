export interface Agent365Config {
  tenantId: string;
  blueprintId: string;
  agentId: string;
  agentName: string;
  agentDescription: string;
  providerName: string;
  model: string;
  exportEnabled: boolean;
  consoleExportEnabled: boolean;
  recordContent: boolean;
  sidecarUrl: string;
  agent365ServiceName: string;
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /^<.+>$/.test(value)) {
    throw new Error(`Set ${name} in .env before starting the agent.`);
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

export function loadAgent365Config(): Agent365Config {
  return {
    tenantId: required("TENANT_ID"),
    blueprintId: required("AGENT_BLUEPRINT_ID"),
    agentId: required("AGENT_CLIENT_ID"),
    agentName: required("AGENT_NAME"),
    agentDescription: required("AGENT_DESCRIPTION"),
    providerName: required("AGENT_PROVIDER_NAME"),
    model: required("AGENT_MODEL"),
    exportEnabled: booleanValue("A365_EXPORT_ENABLED", false),
    consoleExportEnabled: booleanValue("A365_CONSOLE_EXPORT_ENABLED", true),
    recordContent: booleanValue("A365_RECORD_CONTENT", false),
    sidecarUrl: process.env.ENTRA_SIDECAR_URL?.trim() || "http://localhost:5000",
    agent365ServiceName:
      process.env.ENTRA_AGENT365_SERVICE_NAME?.trim() || "Agent365"
  };
}
