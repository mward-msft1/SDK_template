#pragma once

#include <string>

struct Context {
  std::string turnId;
  std::string userId;
  std::string inputText;
  std::string authorizationHeader;
};

struct ModelResult {
  bool blocked = false;
  std::string reason;
  std::string outputText;
};

struct Decision {
  bool block = false;
  std::string raw;
};
