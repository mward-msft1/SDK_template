package main

func runWithAgentFramework(
	purview PurviewAdapter,
	agent365 Agent365Adapter,
	config AppConfig,
) (ModelResult, error) {
	// TODO: Replace with your real Agent Framework turn/context objects.
	context := TurnContext{
		TurnID:    "replace-with-runtime-turn-id",
		UserID:    config.DefaultUserID,
		InputText: "Hello from Agent Framework host",
		AuthorizationHeader: "",
	}

	// TODO: Replace with your real model/agent invoke function.
	next := func(_ TurnContext) (ModelResult, error) {
		return ModelResult{
			OutputText: "Agent Framework model output placeholder",
		}, nil
	}

	return runGovernedTurn(context, next, purview, agent365, config)
}

func runWithM365AgentsSDK(
	purview PurviewAdapter,
	agent365 Agent365Adapter,
	config AppConfig,
) (ModelResult, error) {
	// TODO: Replace with your real Microsoft 365 Agents SDK activity handler.
	context := TurnContext{
		TurnID:    "replace-with-activity-id",
		UserID:    config.DefaultUserID,
		InputText: "Hello from Microsoft 365 Agents SDK host",
		AuthorizationHeader: "replace-with-current-request-authorization-header",
	}

	// TODO: Replace with your AI invocation (OpenAI/Azure OpenAI/other).
	next := func(_ TurnContext) (ModelResult, error) {
		return ModelResult{
			OutputText: "Microsoft 365 Agents SDK model output placeholder",
		}, nil
	}

	return runGovernedTurn(context, next, purview, agent365, config)
}
