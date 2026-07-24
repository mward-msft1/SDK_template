package main

import "fmt"

type Agent365Adapter struct {
	config AppConfig
}

func newAgent365Adapter(config AppConfig) Agent365Adapter {
	// TODO: Initialize the real Agent365 SDK client with tenant/app credentials.
	return Agent365Adapter{config: config}
}

func (a Agent365Adapter) reportTurnStart(context TurnContext) {
	// TODO: Map this to Agent365 telemetry/reporting API.
	fmt.Printf("[Agent365] Turn started: %s\n", context.TurnID)
}

func (a Agent365Adapter) reportPurviewDecision(context TurnContext, stage string, decision Decision) {
	// TODO: Map this to Agent365 telemetry/reporting API.
	fmt.Printf("[Agent365] Stage=%s, Turn=%s, Block=%t\n", stage, context.TurnID, decision.Block)
}

func (a Agent365Adapter) reportTurnEnd(context TurnContext, result ModelResult) {
	// TODO: Map this to Agent365 telemetry/reporting API.
	fmt.Printf("[Agent365] Turn ended: %s, Blocked=%t\n", context.TurnID, result.Blocked)
}
