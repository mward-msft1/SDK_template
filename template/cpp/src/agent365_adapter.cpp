#include "agent365_adapter.h"

#include <iostream>

Agent365Adapter::Agent365Adapter(const AppConfig& config) : config_(config) {
  // TODO: Initialize the real Agent365 SDK client with tenant/app credentials.
}

void Agent365Adapter::reportTurnStart(const Context& context) const {
  // TODO: Map this to Agent365 telemetry/reporting API.
  std::cout << "[Agent365] Turn started: " << context.turnId << "\n";
}

void Agent365Adapter::reportPurviewDecision(
    const Context& context,
    const std::string& stage,
    const Decision& decision) const {
  // TODO: Map this to Agent365 telemetry/reporting API.
  std::cout << "[Agent365] Stage=" << stage << ", Turn=" << context.turnId
            << ", Block=" << (decision.block ? "true" : "false") << "\n";
}

void Agent365Adapter::reportTurnEnd(const Context& context, const ModelResult& result) const {
  // TODO: Map this to Agent365 telemetry/reporting API.
  std::cout << "[Agent365] Turn ended: " << context.turnId
            << ", Blocked=" << (result.blocked ? "true" : "false") << "\n";
}
