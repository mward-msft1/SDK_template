import type {
  ClawPilotMiddleware,
  ClawPilotPlugin,
  GovernanceConfig,
  GovernanceTelemetry,
  PolicyGate
} from "./types.js";

const BLOCKED_INPUT = "Request blocked by Microsoft Purview policy.";
const BLOCKED_OUTPUT = "Response blocked by Microsoft Purview policy.";
const POLICY_UNAVAILABLE = "Request blocked because policy evaluation is unavailable.";

export function createPurviewMiddleware(options: {
  config: GovernanceConfig;
  policy: PolicyGate;
  telemetry: GovernanceTelemetry;
}): ClawPilotMiddleware {
  const { config, policy, telemetry } = options;

  return {
    name: "microsoft-purview",
    order: 5,

    async pre(ctx): Promise<void> {
      try {
        telemetry.startTurn(ctx.sessionId, config.purviewUserId);
        await policy.computeProtectionScopes();
        const decision = await telemetry.observeGuardrail({
          target: "llm_input",
          sessionId: ctx.sessionId,
          operation: () =>
            policy.evaluate("uploadText", ctx.message.text, ctx.sessionId)
        });
        if (decision.block) {
          telemetry.finishTurn(ctx.sessionId);
          ctx.abort(BLOCKED_INPUT);
        }
      } catch (error) {
        const normalized = normalizeError(error);
        telemetry.recordError(ctx.sessionId, normalized);
        if (config.blockOnError) {
          telemetry.finishTurn(ctx.sessionId);
          ctx.abort(POLICY_UNAVAILABLE);
        }
      }
    },

    async post(ctx): Promise<void> {
      if (!ctx.result) {
        telemetry.finishTurn(ctx.sessionId);
        return;
      }
      try {
        const decision = await telemetry.observeGuardrail({
          target: "llm_output",
          sessionId: ctx.sessionId,
          operation: () =>
            policy.evaluate("downloadText", ctx.result!.text, ctx.sessionId)
        });
        if (decision.block) {
          ctx.result.text = BLOCKED_OUTPUT;
        } else {
          telemetry.recordOutput(ctx.sessionId, ctx.result.text);
        }
      } catch (error) {
        const normalized = normalizeError(error);
        telemetry.recordError(ctx.sessionId, normalized);
        if (config.blockOnError) ctx.result.text = POLICY_UNAVAILABLE;
      } finally {
        telemetry.finishTurn(ctx.sessionId);
      }
    }
  };
}

export function createPurviewToolPlugin(options: {
  config: GovernanceConfig;
  policy: PolicyGate;
  telemetry: GovernanceTelemetry;
}): ClawPilotPlugin {
  const { config, policy, telemetry } = options;

  return () => ({
    "tool.beforeCall": async (ctx) => {
      try {
        await policy.computeProtectionScopes();
        const content = JSON.stringify({
          tool: ctx.toolName,
          arguments: ctx.args
        });
        const decision = await telemetry.observeGuardrail({
          target: "tool_input",
          sessionId: ctx.sessionId,
          operation: () =>
            policy.evaluate("downloadText", content, ctx.sessionId)
        });
        return decision.block
          ? { action: "deny", reason: "Blocked by Microsoft Purview policy." }
          : { action: "allow" };
      } catch (error) {
        if (!config.blockOnError) return { action: "allow" };
        return {
          action: "deny",
          reason: "Policy evaluation unavailable."
        };
      }
    }
  });
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
