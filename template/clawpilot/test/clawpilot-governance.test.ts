import assert from "node:assert/strict";
import test from "node:test";
import {
  createPurviewMiddleware,
  createPurviewToolPlugin
} from "../src/clawpilot-governance.js";
import type {
  ClawPilotMiddlewareContext,
  GovernanceConfig,
  GovernanceTelemetry,
  PolicyDecision,
  PolicyGate
} from "../src/types.js";

const config: GovernanceConfig = {
  tenantId: "tenant",
  blueprintAppId: "blueprint",
  agentClientId: "agent",
  agentName: "agent",
  agentDescription: "test",
  purviewUserId: "user@example.com",
  purviewAppLocationId: "app",
  purviewGraphBaseUrl: "https://graph.microsoft.com/beta",
  entraSidecarUrl: "http://localhost:5000",
  graphServiceName: "Graph",
  agent365ServiceName: "Agent365",
  blockOnError: true,
  enableConsoleTelemetry: false
};

function decision(block: boolean): PolicyDecision {
  return { block, actions: block ? ["block"] : [], raw: null };
}

function policy(
  evaluate: PolicyGate["evaluate"],
  compute: PolicyGate["computeProtectionScopes"] = async () => ({})
): PolicyGate {
  return { computeProtectionScopes: compute, evaluate };
}

const telemetry: GovernanceTelemetry = {
  startTurn() {},
  async observeGuardrail(observation) {
    return observation.operation();
  },
  recordOutput() {},
  recordError() {},
  finishTurn() {}
};

function context(text = "hello"): ClawPilotMiddlewareContext & {
  abortReason?: string;
} {
  const ctx: ClawPilotMiddlewareContext & { abortReason?: string } = {
    sessionId: "session",
    message: { text },
    agentConfig: { id: "agent" },
    result: { text: "model output" },
    metadata: new Map(),
    abort(reason) {
      ctx.abortReason = reason;
    }
  };
  return ctx;
}

test("allows an input approved by Purview", async () => {
  const middleware = createPurviewMiddleware({
    config,
    policy: policy(async () => decision(false)),
    telemetry
  });
  const ctx = context();
  await middleware.pre!(ctx);
  assert.equal(ctx.abortReason, undefined);
});

test("blocks an input denied by Purview", async () => {
  const middleware = createPurviewMiddleware({
    config,
    policy: policy(async () => decision(true)),
    telemetry
  });
  const ctx = context();
  await middleware.pre!(ctx);
  assert.match(ctx.abortReason ?? "", /blocked/i);
});

test("fails closed when input policy evaluation errors", async () => {
  const middleware = createPurviewMiddleware({
    config,
    policy: policy(async () => {
      throw new Error("offline");
    }),
    telemetry
  });
  const ctx = context();
  await middleware.pre!(ctx);
  assert.match(ctx.abortReason ?? "", /unavailable/i);
});

test("replaces a denied output before it is returned", async () => {
  const middleware = createPurviewMiddleware({
    config,
    policy: policy(async (activity) => decision(activity === "downloadText")),
    telemetry
  });
  const ctx = context();
  await middleware.post!(ctx);
  assert.match(ctx.result?.text ?? "", /blocked/i);
});

test("fails closed when output policy evaluation errors", async () => {
  const middleware = createPurviewMiddleware({
    config,
    policy: policy(async () => {
      throw new Error("offline");
    }),
    telemetry
  });
  const ctx = context();
  await middleware.post!(ctx);
  assert.match(ctx.result?.text ?? "", /unavailable/i);
});

test("denies a sensitive tool call", async () => {
  const plugin = createPurviewToolPlugin({
    config,
    policy: policy(async () => decision(true)),
    telemetry
  });
  const result = await plugin()["tool.beforeCall"]!({
    sessionId: "session",
    toolName: "agent_send",
    args: { target: "finance" }
  });
  assert.equal(result.action, "deny");
});

test("allows a tool call approved by Purview", async () => {
  const plugin = createPurviewToolPlugin({
    config,
    policy: policy(async () => decision(false)),
    telemetry
  });
  const result = await plugin()["tool.beforeCall"]!({
    sessionId: "session",
    toolName: "read_file",
    args: { path: "README.md" }
  });
  assert.equal(result.action, "allow");
});

test("fails closed when tool policy evaluation errors", async () => {
  const plugin = createPurviewToolPlugin({
    config,
    policy: policy(async () => {
      throw new Error("offline");
    }),
    telemetry
  });
  const result = await plugin()["tool.beforeCall"]!({
    sessionId: "session",
    toolName: "send_message",
    args: { text: "secret" }
  });
  assert.equal(result.action, "deny");
});
