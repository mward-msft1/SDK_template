export interface PolicyDecision {
  block: boolean;
}

export interface PolicyGate {
  computeProtectionScopes(): Promise<unknown>;
  evaluate(
    activity: "uploadText" | "downloadText",
    content: string,
    correlationId: string
  ): Promise<PolicyDecision>;
}

export interface Telemetry {
  runGuardrail<T>(
    target: "llm_input" | "llm_output",
    operation: () => Promise<T>
  ): Promise<T>;
  runInference(operation: () => Promise<ModelResult>): Promise<ModelResult>;
  recordOutput(output: string): void;
  recordError(error: Error): void;
  finish(): void;
}

export interface ModelResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

export type GovernedResult =
  | { status: "allowed"; text: string }
  | { status: "blocked-input" }
  | { status: "blocked-output" };

export async function runGovernedTurn(options: {
  prompt: string;
  correlationId: string;
  blockOnError: boolean;
  policy: PolicyGate;
  telemetry: Telemetry;
  invokeModel: () => Promise<ModelResult>;
}): Promise<GovernedResult> {
  const { policy, telemetry } = options;

  try {
    await policy.computeProtectionScopes();
    const inputDecision = await telemetry.runGuardrail("llm_input", () =>
      policy.evaluate("uploadText", options.prompt, options.correlationId)
    );
    if (inputDecision.block) {
      telemetry.finish();
      return { status: "blocked-input" };
    }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    if (options.blockOnError) {
      telemetry.recordError(normalized);
      throw normalized;
    }
  }

  let modelResult: ModelResult;
  try {
    modelResult = await telemetry.runInference(options.invokeModel);
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    telemetry.recordError(normalized);
    throw normalized;
  }

  try {
    const outputDecision = await telemetry.runGuardrail("llm_output", () =>
      policy.evaluate("downloadText", modelResult.text, options.correlationId)
    );
    if (outputDecision.block) {
      telemetry.finish();
      return { status: "blocked-output" };
    }
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    if (options.blockOnError) {
      telemetry.recordError(normalized);
      throw normalized;
    }
  }

  telemetry.recordOutput(modelResult.text);
  return { status: "allowed", text: modelResult.text };
}
