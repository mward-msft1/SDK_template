package main

import "fmt"

type NextFunc func(TurnContext) (ModelResult, error)

func runGovernedTurn(
	inputContext TurnContext,
	next NextFunc,
	purview PurviewAdapter,
	agent365 Agent365Adapter,
	config AppConfig,
) (ModelResult, error) {
	context := inputContext
	if context.UserID == "" {
		context.UserID = config.DefaultUserID
	}
	if context.UserID == "" {
		return ModelResult{}, fmt.Errorf("missing user_id in context and DEFAULT_USER_ID in environment")
	}

	agent365.reportTurnStart(context)
	if _, err := purview.computeProtectionScopes(context.UserID); err != nil {
		return ModelResult{}, err
	}

	inbound, err := purview.evaluateContent(context.UserID, "uploadText", context.InputText, context.TurnID)
	if err != nil {
		return ModelResult{}, err
	}
	inboundDecision := purview.getEnforcementDecision(inbound)
	agent365.reportPurviewDecision(context, "pre-model", inboundDecision)
	if inboundDecision.Block {
		blocked := ModelResult{
			Blocked: true,
			Reason:  "Purview policy blocked inbound content.",
		}
		agent365.reportTurnEnd(context, blocked)
		return blocked, nil
	}

	modelResult, err := next(context)
	if err != nil {
		return ModelResult{}, err
	}

	outbound, err := purview.evaluateContent(context.UserID, "downloadText", modelResult.OutputText, context.TurnID)
	if err != nil {
		return ModelResult{}, err
	}
	outboundDecision := purview.getEnforcementDecision(outbound)
	agent365.reportPurviewDecision(context, "post-model", outboundDecision)
	if outboundDecision.Block {
		blocked := ModelResult{
			Blocked: true,
			Reason:  "Purview policy blocked outbound content.",
		}
		agent365.reportTurnEnd(context, blocked)
		return blocked, nil
	}

	agent365.reportTurnEnd(context, modelResult)
	return modelResult, nil
}
