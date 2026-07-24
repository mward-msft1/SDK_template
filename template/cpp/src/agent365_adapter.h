#pragma once

#include "config.h"
#include "types.h"

#include <string>

class Agent365Adapter {
 public:
  explicit Agent365Adapter(const AppConfig& config);

  void reportTurnStart(const Context& context) const;
  void reportPurviewDecision(const Context& context, const std::string& stage, const Decision& decision) const;
  void reportTurnEnd(const Context& context, const ModelResult& result) const;

 private:
  AppConfig config_;
};
