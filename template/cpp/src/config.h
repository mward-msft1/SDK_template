#pragma once

#include <string>

struct AppConfig {
  std::string tenantId;
  std::string entraClientId;
  std::string entraClientSecret;
  std::string defaultUserId;
  std::string agentName;
  std::string hostSdk;

  std::string m365AgentsBotAppId;
  std::string m365AgentsBotAppPassword;
  std::string m365AgentsTenantId;

  std::string agent365AppId;
  std::string agent365AppSecret;
  std::string agent365TenantId;
  std::string agent365ReportingEndpoint;

  std::string purviewGraphBaseUrl;
  std::string purviewAppLocationId;
  std::string purviewActivityTypes;
  bool purviewEnableAuditWhenNoScope = true;
  bool purviewBlockOnError = true;

  std::string graphAccessTokenPlaceholder;
};

AppConfig loadConfig();
