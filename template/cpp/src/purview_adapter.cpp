#include "purview_adapter.h"

#include <algorithm>
#include <cctype>
#include <stdexcept>

PurviewAdapter::PurviewAdapter(const AppConfig& config)
    : config_(config), entraSidecar_(config) {}

std::string PurviewAdapter::computeProtectionScopes(
    const std::string& userId,
    const std::string& incomingAuthorizationHeader) const {
  requireGraphToken(incomingAuthorizationHeader);
  // TODO: Replace with real Graph call:
  // POST /users/{id}/dataSecurityAndGovernance/protectionScopes/compute
  return "scopes: evaluate uploadText/downloadText for user " + userId;
}

std::string PurviewAdapter::evaluateContent(
    const std::string& userId,
    const std::string& activity,
    const std::string& content,
    const std::string& contextId,
    const std::string& incomingAuthorizationHeader) const {
  requireGraphToken(incomingAuthorizationHeader);
  // TODO: Replace with real Graph call:
  // POST /users/{id}/dataSecurityAndGovernance/activities/contentActivities
  // This placeholder echoes inputs so beginners can trace the flow.
  return "activity=" + activity + "; userId=" + userId + "; contextId=" + contextId + "; content=" + content;
}

Decision PurviewAdapter::getEnforcementDecision(const std::string& resultPayload) const {
  std::string lower = resultPayload;
  std::transform(lower.begin(), lower.end(), lower.begin(), [](unsigned char c) {
    return static_cast<char>(std::tolower(c));
  });
  Decision d;
  d.block = (lower.find("block") != std::string::npos);
  d.raw = resultPayload;
  return d;
}

void PurviewAdapter::requireGraphToken(
    const std::string& incomingAuthorizationHeader) const {
  if (config_.entraSidecarEnabled) {
    (void)entraSidecar_.getAuthorizationHeader(incomingAuthorizationHeader);
    return;
  }
  if (config_.graphAccessTokenPlaceholder.empty()) {
    throw std::runtime_error(
        "Enable the Entra sidecar or set GRAPH_ACCESS_TOKEN_PLACEHOLDER.");
  }
}
