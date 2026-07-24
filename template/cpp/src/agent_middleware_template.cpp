#include "agent_middleware_template.h"

#include <stdexcept>

GovernedMiddleware createGovernedAgentMiddleware(
    const PurviewAdapter& purview,
    const Agent365Adapter& agent365,
    const AppConfig& config) {
  return [&purview, &agent365, &config](const Context& inputContext, const NextFunction& next) -> ModelResult {
    Context context = inputContext;
    if (context.userId.empty()) {
      context.userId = config.defaultUserId;
    }
    if (context.userId.empty()) {
      throw std::runtime_error("Missing userId in context and DEFAULT_USER_ID in environment.");
    }

    agent365.reportTurnStart(context);
    (void)purview.computeProtectionScopes(context.userId);

    const std::string inbound = purview.evaluateContent(
        context.userId, "uploadText", context.inputText, context.turnId);
    const Decision inboundDecision = purview.getEnforcementDecision(inbound);
    agent365.reportPurviewDecision(context, "pre-model", inboundDecision);
    if (inboundDecision.block) {
      ModelResult blocked;
      blocked.blocked = true;
      blocked.reason = "Purview policy blocked inbound content.";
      agent365.reportTurnEnd(context, blocked);
      return blocked;
    }

    const ModelResult modelResult = next(context);
    const std::string outbound = purview.evaluateContent(
        context.userId, "downloadText", modelResult.outputText, context.turnId);
    const Decision outboundDecision = purview.getEnforcementDecision(outbound);
    agent365.reportPurviewDecision(context, "post-model", outboundDecision);

    if (outboundDecision.block) {
      ModelResult blocked;
      blocked.blocked = true;
      blocked.reason = "Purview policy blocked outbound content.";
      agent365.reportTurnEnd(context, blocked);
      return blocked;
    }

    agent365.reportTurnEnd(context, modelResult);
    return modelResult;
  };
}
