#include "host_adapters.h"

ModelResult runWithAgentFramework(const GovernedMiddleware& middleware, const std::string& defaultUserId) {
  // TODO: Replace with your real Agent Framework turn/context objects.
  Context context{
      "replace-with-runtime-turn-id",
      defaultUserId,
      "Hello from Agent Framework host",
      ""};

  // TODO: Replace with your real model/agent invoke function.
  NextFunction next = [](const Context&) {
    ModelResult result;
    result.outputText = "Agent Framework model output placeholder";
    return result;
  };

  return middleware(context, next);
}

ModelResult runWithM365AgentsSdk(const GovernedMiddleware& middleware, const std::string& defaultUserId) {
  // TODO: Replace with your real Microsoft 365 Agents SDK activity handler.
  Context context{
      "replace-with-activity-id",
      defaultUserId,
      "Hello from Microsoft 365 Agents SDK host",
      "replace-with-current-request-authorization-header"};

  // TODO: Replace with your AI invocation (OpenAI/Azure OpenAI/other).
  NextFunction next = [](const Context&) {
    ModelResult result;
    result.outputText = "Microsoft 365 Agents SDK model output placeholder";
    return result;
  };

  return middleware(context, next);
}
