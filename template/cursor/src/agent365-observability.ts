import {
  ApplyGuardrailScope,
  GuardrailDecisionType,
  GuardrailTargetType,
  InferenceOperationType,
  InferenceScope,
  InvokeAgentScope,
  shutdownMicrosoftOpenTelemetry,
  useMicrosoftOpenTelemetry
} from "@microsoft/opentelemetry";
import { resourceFromAttributes } from "@opentelemetry/resources";
import type { AgentDetails, A365Request } from "@microsoft/opentelemetry";
import type { AppConfig } from "./config.js";
import type { ModelResult, Telemetry } from "./governed-run.js";
import { EntraSidecarClient } from "./entra-sidecar.js";

export function initializeObservability(
  config: AppConfig,
  sidecar: EntraSidecarClient
): void {
  useMicrosoftOpenTelemetry({
    resource: resourceFromAttributes({
      "service.name": "cursor-purview-agent",
      "service.version": "1.0.0"
    }),
    enableConsoleExporters: config.enableConsoleTelemetry,
    a365: {
      enabled: true,
      useS2SEndpoint: true,
      tokenResolver: async () => sidecar.getAccessToken(config.a365ServiceName)
    }
  });
}

export async function shutdownObservability(): Promise<void> {
  await shutdownMicrosoftOpenTelemetry();
}

export function createTelemetry(
  config: AppConfig,
  prompt: string,
  correlationId: string
): Telemetry {
  const request: A365Request = {
    sessionId: correlationId,
    conversationId: correlationId,
    channel: { name: "Cursor SDK local" }
  };
  const agentDetails: AgentDetails = {
    agentId: config.agentClientId,
    agentName: config.agentName,
    agentDescription: config.agentDescription,
    agentBlueprintId: config.blueprintAppId,
    tenantId: config.tenantId,
    providerName: "Cursor"
  };
  const invokeScope = InvokeAgentScope.start(request, {}, agentDetails, {
    userDetails: { userId: config.purviewUserId, tenantId: config.tenantId }
  });

  return {
    async runGuardrail<T>(
      target: "llm_input" | "llm_output",
      operation: () => Promise<T>
    ): Promise<T> {
      return invokeScope.withActiveSpanAsync(async () => {
        const scope = ApplyGuardrailScope.start(
          {
            targetType:
              target === "llm_input"
                ? GuardrailTargetType.LlmInput
                : GuardrailTargetType.LlmOutput,
            decisionType: GuardrailDecisionType.Allow,
            guardianName: "Microsoft Purview",
            guardianProviderName: "Microsoft",
            externalEventId: correlationId
          },
          agentDetails,
          { ...request, content: undefined },
          { userId: config.purviewUserId, tenantId: config.tenantId }
        );
        try {
          const result = await operation();
          const blocked =
            typeof result === "object" &&
            result !== null &&
            "block" in result &&
            result.block === true;
          scope.recordDecision(
            blocked ? GuardrailDecisionType.Deny : GuardrailDecisionType.Allow
          );
          return result;
        } catch (error) {
          scope.recordError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          scope.dispose();
        }
      });
    },

    async runInference(operation: () => Promise<ModelResult>): Promise<ModelResult> {
      return invokeScope.withActiveSpanAsync(async () => {
        const scope = InferenceScope.start(
          request,
          {
            operationName: InferenceOperationType.CHAT,
            model: config.cursorModel,
            providerName: "Cursor"
          },
          agentDetails,
          { userId: config.purviewUserId, tenantId: config.tenantId }
        );
        try {
          scope.recordInputMessages(prompt);
          const result = await operation();
          if (result.inputTokens !== undefined) scope.recordInputTokens(result.inputTokens);
          if (result.outputTokens !== undefined) scope.recordOutputTokens(result.outputTokens);
          scope.recordFinishReasons(["stop"]);
          return result;
        } catch (error) {
          scope.recordError(error instanceof Error ? error : new Error(String(error)));
          throw error;
        } finally {
          scope.dispose();
        }
      });
    },

    recordOutput(output: string): void {
      invokeScope.recordOutputMessages(output);
      invokeScope.dispose();
    },

    recordError(error: Error): void {
      invokeScope.recordError(error);
      invokeScope.dispose();
    },

    finish(): void {
      invokeScope.dispose();
    }
  };
}
