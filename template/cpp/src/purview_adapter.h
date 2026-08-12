#pragma once

#include "config.h"
#include "entra_sidecar_client.h"
#include "types.h"

#include <string>

class PurviewAdapter {
 public:
  explicit PurviewAdapter(const AppConfig& config);

  std::string computeProtectionScopes(
      const std::string& userId,
      const std::string& incomingAuthorizationHeader = "") const;
  std::string evaluateContent(
      const std::string& userId,
      const std::string& activity,
      const std::string& content,
      const std::string& contextId,
      const std::string& incomingAuthorizationHeader = "") const;
  Decision getEnforcementDecision(const std::string& resultPayload) const;

 private:
  void requireGraphToken(const std::string& incomingAuthorizationHeader) const;
  AppConfig config_;
  EntraSidecarClient entraSidecar_;
};
