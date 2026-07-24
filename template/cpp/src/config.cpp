#include "config.h"

#include <algorithm>
#include <cctype>
#include <cstdlib>
#include <stdexcept>

namespace {
std::string getOrThrow(const char* name) {
  const char* value = std::getenv(name);
  if (value == nullptr || *value == '\0') {
    throw std::runtime_error(std::string("Missing required environment variable: ") + name);
  }
  return value;
}

std::string getOrDefault(const char* name, const char* fallback) {
  const char* value = std::getenv(name);
  if (value == nullptr || *value == '\0') {
    return fallback;
  }
  return value;
}

bool asBool(const std::string& value) {
  std::string normalized = value;
  std::transform(normalized.begin(), normalized.end(), normalized.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  return normalized == "true";
}
}  // namespace

AppConfig loadConfig() {
  AppConfig cfg;
  cfg.tenantId = getOrThrow("TENANT_ID");
  cfg.entraClientId = getOrThrow("ENTRA_CLIENT_ID");
  cfg.entraClientSecret = getOrThrow("ENTRA_CLIENT_SECRET");
  cfg.defaultUserId = getOrDefault("DEFAULT_USER_ID", "");
  cfg.agentName = getOrDefault("AGENT_NAME", "ContosoAgnosticAgent");
  cfg.hostSdk = getOrDefault("HOST_SDK", "agent-framework");

  cfg.m365AgentsBotAppId = getOrThrow("M365_AGENTS_BOT_APP_ID");
  cfg.m365AgentsBotAppPassword = getOrThrow("M365_AGENTS_BOT_APP_PASSWORD");
  cfg.m365AgentsTenantId = getOrThrow("M365_AGENTS_TENANT_ID");

  cfg.agent365AppId = getOrThrow("AGENT365_APP_ID");
  cfg.agent365AppSecret = getOrThrow("AGENT365_APP_SECRET");
  cfg.agent365TenantId = getOrThrow("AGENT365_TENANT_ID");
  cfg.agent365ReportingEndpoint = getOrThrow("AGENT365_REPORTING_ENDPOINT");

  cfg.purviewGraphBaseUrl = getOrDefault("PURVIEW_GRAPH_BASE_URL", "https://graph.microsoft.com/v1.0");
  cfg.purviewAppLocationId = getOrThrow("PURVIEW_APP_LOCATION_ID");
  cfg.purviewActivityTypes = getOrDefault("PURVIEW_ACTIVITY_TYPES", "uploadText,downloadText");
  cfg.purviewEnableAuditWhenNoScope = asBool(getOrDefault("PURVIEW_ENABLE_AUDIT_WHEN_NO_SCOPE", "true"));
  cfg.purviewBlockOnError = asBool(getOrDefault("PURVIEW_BLOCK_ON_ERROR", "true"));

  cfg.graphAccessTokenPlaceholder = getOrDefault("GRAPH_ACCESS_TOKEN_PLACEHOLDER", "");
  return cfg;
}
