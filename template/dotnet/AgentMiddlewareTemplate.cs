namespace AgnosticAgentTemplate;

public static class AgentMiddlewareTemplate
{
    public static Func<TurnContext, Func<TurnContext, Task<ModelResult>>, Task<ModelResult>> CreateGovernedMiddleware(
        PurviewAdapter purview,
        Agent365Adapter agent365,
        AppConfig config)
    {
        return async (inputContext, next) =>
        {
            var context = new TurnContext
            {
                TurnId = inputContext.TurnId,
                UserId = string.IsNullOrWhiteSpace(inputContext.UserId) ? config.DefaultUserId : inputContext.UserId,
                InputText = inputContext.InputText
            };

            if (string.IsNullOrWhiteSpace(context.UserId))
            {
                throw new InvalidOperationException("Missing userId in context and DEFAULT_USER_ID in environment.");
            }

            await agent365.ReportTurnStartAsync(context);
            _ = await purview.ComputeProtectionScopesAsync(context.UserId);

            var inbound = await purview.EvaluateContentAsync(
                context.UserId,
                "uploadText",
                context.InputText,
                context.TurnId);
            var inboundDecision = purview.GetEnforcementDecision(inbound);
            await agent365.ReportPurviewDecisionAsync(context, "pre-model", inboundDecision);

            if (inboundDecision.Block)
            {
                var blockedInbound = new ModelResult
                {
                    Blocked = true,
                    Reason = "Purview policy blocked inbound content."
                };
                await agent365.ReportTurnEndAsync(context, blockedInbound);
                return blockedInbound;
            }

            var modelResult = await next(context);

            var outbound = await purview.EvaluateContentAsync(
                context.UserId,
                "downloadText",
                modelResult.OutputText,
                context.TurnId);
            var outboundDecision = purview.GetEnforcementDecision(outbound);
            await agent365.ReportPurviewDecisionAsync(context, "post-model", outboundDecision);

            if (outboundDecision.Block)
            {
                var blockedOutbound = new ModelResult
                {
                    Blocked = true,
                    Reason = "Purview policy blocked outbound content."
                };
                await agent365.ReportTurnEndAsync(context, blockedOutbound);
                return blockedOutbound;
            }

            await agent365.ReportTurnEndAsync(context, modelResult);
            return modelResult;
        };
    }
}
