/**
 * Generic middleware shape that can be plugged into your Agent Framework host.
 *
 * next(context) should execute the model/agent turn and return:
 * { outputText: string, ... }
 */
export function createGovernedAgentMiddleware({ purview, agent365, config }) {
  return async function governedTurn(context, next) {
    const userId = context.userId || config.defaultUserId;
    if (!userId) {
      throw new Error("Missing userId in context and defaultUserId in config.");
    }

    await agent365.reportTurnStart(context);

    const scopes = await purview.computeProtectionScopes(userId);
    context.purviewScopes = scopes;

    const inboundResult = await purview.evaluateContent({
      userId,
      activity: "uploadText",
      content: context.inputText,
      contextId: context.turnId
    });

    const inboundDecision = purview.getEnforcementDecision(inboundResult);
    await agent365.reportPurviewDecision(context, "pre-model", inboundDecision);

    if (inboundDecision.block) {
      const blocked = {
        blocked: true,
        reason: "Purview policy blocked inbound content."
      };
      await agent365.reportTurnEnd(context, blocked);
      return blocked;
    }

    const modelResult = await next(context);

    const outboundResult = await purview.evaluateContent({
      userId,
      activity: "downloadText",
      content: modelResult.outputText,
      contextId: context.turnId
    });

    const outboundDecision = purview.getEnforcementDecision(outboundResult);
    await agent365.reportPurviewDecision(context, "post-model", outboundDecision);

    if (outboundDecision.block) {
      const blocked = {
        blocked: true,
        reason: "Purview policy blocked outbound content."
      };
      await agent365.reportTurnEnd(context, blocked);
      return blocked;
    }

    await agent365.reportTurnEnd(context, modelResult);
    return modelResult;
  };
}
