import {
  ApplyGuardrailScope,
  GuardrailDecisionType,
  GuardrailTargetType,
  InvokeAgentScope,
  shutdownMicrosoftOpenTelemetry,
  useMicrosoftOpenTelemetry
} from "@microsoft/opentelemetry";
import type {
  A365Request,
  AgentDetails,
  InvokeAgentScope as InvokeAgentScopeType
} from "@microsoft/opentelemetry";
import { resourceFromAttributes } from "@opentelemetry/resources";
import type { EntraSidecarClient } from "./entra-sidecar.js";
import type {
  GovernanceConfig,
  GovernanceTelemetry,
  GuardrailObservation,
  PolicyDecision
} from "./types.js";

export function initializeAgent365(
  config: GovernanceConfig,
  sidecar: EntraSidecarClient
): void {
  useMicrosoftOpenTelemetry({
    resource: resourceFromAttributes({
      "service.name": "clawpilot-microsoft-governance",
      "service.version": "1.0.0"
    }),
    enableConsoleExporters: config.enableConsoleTelemetry,
    a365: {
      enabled: true,
      useS2SEndpoint: true,
      tokenResolver: async () =>
        sidecar.getAccessToken(config.agent365ServiceName)
    }
  });
}

export async function shutdownAgent365(): Promise<void> {
  await shutdownMicrosoftOpenTelemetry();
}

export class Agent365Telemetry implements GovernanceTelemetry {
  private readonly scopes = new Map<string, InvokeAgentScopeType>();
  private readonly agentDetails: AgentDetails;

  constructor(private readonly config: GovernanceConfig) {
    this.agentDetails = {
      agentId: config.agentClientId,
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      agentBlueprintId: config.blueprintAppId,
      tenantId: config.tenantId,
      providerName: "Clawpilot"
    };
  }

  startTurn(sessionId: string, userId: string): void {
    if (this.scopes.has(sessionId)) {
      throw new Error(`Agent 365 turn ${sessionId} is already active.`);
    }
    const request = this.request(sessionId);
    const scope = InvokeAgentScope.start(request, {}, this.agentDetails, {
      userDetails: { userId, tenantId: this.config.tenantId }
    });
    this.scopes.set(sessionId, scope);
  }

  async observeGuardrail(
    observation: GuardrailObservation
  ): Promise<PolicyDecision> {
    const request = this.request(observation.sessionId);
    const scope = ApplyGuardrailScope.start(
      {
        targetType:
          observation.target === "llm_input"
            ? GuardrailTargetType.LlmInput
            : GuardrailTargetType.LlmOutput,
        decisionType: GuardrailDecisionType.Allow,
        guardianName: "Microsoft Purview",
        guardianProviderName: "Microsoft",
        externalEventId: observation.sessionId
      },
      this.agentDetails,
      request,
      { userId: this.config.purviewUserId, tenantId: this.config.tenantId }
    );
    try {
      const decision = await observation.operation();
      scope.recordDecision(
        decision.block
          ? GuardrailDecisionType.Deny
          : GuardrailDecisionType.Allow
      );
      return decision;
    } catch (error) {
      scope.recordError(normalizeError(error));
      throw error;
    } finally {
      scope.dispose();
    }
  }

  recordOutput(sessionId: string, output: string): void {
    this.scopes.get(sessionId)?.recordOutputMessages(output);
  }

  recordError(sessionId: string, error: Error): void {
    this.scopes.get(sessionId)?.recordError(error);
  }

  finishTurn(sessionId: string): void {
    this.scopes.get(sessionId)?.dispose();
    this.scopes.delete(sessionId);
  }

  private request(sessionId: string): A365Request {
    return {
      sessionId,
      conversationId: sessionId,
      channel: { name: "Clawpilot" }
    };
  }
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
