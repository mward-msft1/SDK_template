#pragma once

#include "config.h"

#include <string>

class EntraSidecarClient {
 public:
  explicit EntraSidecarClient(const AppConfig& config);
  std::string getAuthorizationHeader(
      const std::string& incomingAuthorizationHeader = "") const;

 private:
  AppConfig config_;
};

std::string normalizeAuthorizationHeader(const std::string& value);
