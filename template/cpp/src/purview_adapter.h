#pragma once

#include "config.h"
#include "types.h"

#include <string>

class PurviewAdapter {
 public:
  explicit PurviewAdapter(const AppConfig& config);

  std::string computeProtectionScopes(const std::string& userId) const;
  std::string evaluateContent(
      const std::string& userId,
      const std::string& activity,
      const std::string& content,
      const std::string& contextId) const;
  Decision getEnforcementDecision(const std::string& resultPayload) const;

 private:
  void requireGraphToken() const;
  AppConfig config_;
};
