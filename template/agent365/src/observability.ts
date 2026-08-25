import {
  ExecuteToolScope,
  InferenceOperationType,
  InferenceScope,
  InvokeAgentScope,
  shutdownMicrosoftOpenTelemetry,
  useMicrosoftOpenTelemetry
} from "@microsoft/opentelemetry";
import type {
  A365Request,
  AgentDetails
} from "@microsoft/opentelemetry";
import { resourceFromAttributes } from "@opentelemetry/resources";
import type { Agent365Config } from "./config.js";
import type { EntraSidecarClient } from "./entra-sidecar.js";

export interface ModelResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

export function initializeAgent365(
  config: Agent365Config,
  sidecar?: EntraSidecarClient
): void {
  if (config.exportEnabled && !sidecar) {
    throw new Error(
      "A365 export requires an Entra sidecar token resolver in this template."
    );
  }

  useMicrosoftOpenTelemetry({
    resource: resourceFromAttributes({
      "service.name": config.agentName,
      "service.version": "1.0.0"
    }),
    enableConsoleExporters: config.consoleExportEnabled,
    a365: {
      enabled: config.exportEnabled,
      useS2SEndpoint: true,
      ...(sidecar
        ? {
            tokenResolver: async () =>
              sidecar.getAccessToken(config.agent365ServiceName)
          }
        : {})
    }
  });
}

export class Agent365Observer {
  private readonly details: AgentDetails;

  constructor(private readonly config: Agent365Config) {
    this.details = {
      agentId: config.agentId,
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      agentBlueprintId: config.blueprintId,
      tenantId: config.tenantId,
      providerName: config.providerName,
      agentVersion: "1.0.0"
    };
  }

  async runTurn(
    prompt: string,
    invokeModel: () => Promise<ModelResult>
  ): Promise<ModelResult> {
    const turnId = crypto.randomUUID();
    const request: A365Request = {
      sessionId: turnId,
      conversationId: turnId,
      channel: { name: this.config.providerName }
    };
    const invocation = InvokeAgentScope.start(request, {}, this.details);

    try {
      return await invocation.withActiveSpanAsync(async () => {
        if (this.config.recordContent) invocation.recordInputMessages([prompt]);
        const result = await this.runInference(request, prompt, invokeModel);
        if (this.config.recordContent) {
          invocation.recordOutputMessages([result.text]);
        }
        return result;
      });
    } catch (error) {
      invocation.recordError(normalizeError(error));
      throw error;
    } finally {
      invocation.dispose();
    }
  }

  async runTool<T extends Record<string, unknown> | string>(
    request: A365Request,
    name: string,
    args: Record<string, unknown>,
    operation: () => Promise<T>
  ): Promise<T> {
    const scope = ExecuteToolScope.start(
      request,
      {
        toolName: name,
        toolType: "function",
        ...(this.config.recordContent ? { arguments: args } : {})
      },
      this.details
    );
    try {
      const response = await operation();
      if (this.config.recordContent) scope.recordResponse(response);
      return response;
    } catch (error) {
      scope.recordError(normalizeError(error));
      throw error;
    } finally {
      scope.dispose();
    }
  }

  private async runInference(
    request: A365Request,
    prompt: string,
    operation: () => Promise<ModelResult>
  ): Promise<ModelResult> {
    const scope = InferenceScope.start(
      request,
      {
        operationName: InferenceOperationType.CHAT,
        model: this.config.model,
        providerName: this.config.providerName
      },
      this.details
    );
    try {
      if (this.config.recordContent) scope.recordInputMessages([prompt]);
      const result = await operation();
      if (this.config.recordContent) scope.recordOutputMessages([result.text]);
      if (result.inputTokens !== undefined) {
        scope.recordInputTokens(result.inputTokens);
      }
      if (result.outputTokens !== undefined) {
        scope.recordOutputTokens(result.outputTokens);
      }
      scope.recordFinishReasons(["stop"]);
      return result;
    } catch (error) {
      scope.recordError(normalizeError(error));
      throw error;
    } finally {
      scope.dispose();
    }
  }
}

export async function shutdownAgent365(): Promise<void> {
  await shutdownMicrosoftOpenTelemetry();
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
