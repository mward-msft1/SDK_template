/**
 * Agent365 adapter placeholder.
 *
 * Replace TODOs with concrete imports and calls from the official Agent365 SDK
 * for your chosen language/runtime.
 */
export class Agent365Adapter {
  constructor(config) {
    this.config = config;

    // TODO: Initialize the Agent365 SDK client with tenant/app credentials.
    // Example placeholder:
    // this.client = new Agent365Client({
    //   tenantId: config.agent365TenantId,
    //   appId: config.agent365AppId,
    //   appSecret: config.agent365AppSecret,
    //   endpoint: config.agent365ReportingEndpoint
    // });
  }

  async reportTurnStart(context) {
    // TODO: Map to SDK event/logging API.
    return {
      turnId: context.turnId,
      status: "started"
    };
  }

  async reportPurviewDecision(context, stage, decision) {
    // TODO: Map to SDK event/logging API.
    return {
      turnId: context.turnId,
      stage,
      decision
    };
  }

  async reportTurnEnd(context, result) {
    // TODO: Map to SDK event/logging API.
    return {
      turnId: context.turnId,
      status: "completed",
      result
    };
  }
}
