export type PurviewActivity = "uploadText" | "downloadText";

export interface GovernanceConfig {
  tenantId: string;
  blueprintAppId: string;
  agentClientId: string;
  agentName: string;
  agentDescription: string;
  purviewUserId: string;
  purviewAppLocationId: string;
  purviewGraphBaseUrl: string;
  entraSidecarUrl: string;
  graphServiceName: string;
  agent365ServiceName: string;
  blockOnError: boolean;
  enableConsoleTelemetry: boolean;
}

export interface PolicyDecision {
  block: boolean;
  actions: string[];
  raw: unknown;
}

export interface PolicyGate {
  computeProtectionScopes(): Promise<unknown>;
  evaluate(
    activity: PurviewActivity,
    content: string,
    correlationId: string
  ): Promise<PolicyDecision>;
}

export interface GuardrailObservation {
  target: "llm_input" | "llm_output" | "tool_input";
  sessionId: string;
  operation: () => Promise<PolicyDecision>;
}

export interface GovernanceTelemetry {
  startTurn(sessionId: string, userId: string): void;
  observeGuardrail(observation: GuardrailObservation): Promise<PolicyDecision>;
  recordOutput(sessionId: string, output: string): void;
  recordError(sessionId: string, error: Error): void;
  finishTurn(sessionId: string): void;
}

export interface ClawPilotMessage {
  text: string;
}

export interface ClawPilotAgentConfig {
  id: string;
}

export interface ClawPilotPromptResult {
  text: string;
}

export interface ClawPilotMiddlewareContext {
  sessionId: string;
  message: ClawPilotMessage;
  agentConfig: ClawPilotAgentConfig;
  result?: ClawPilotPromptResult;
  metadata: Map<string, unknown>;
  abort(reason: string): void;
}

export interface ClawPilotMiddleware {
  readonly name: string;
  readonly order: number;
  pre?(ctx: ClawPilotMiddlewareContext): Promise<void>;
  post?(ctx: ClawPilotMiddlewareContext): Promise<void>;
}

export interface ClawPilotToolContext {
  sessionId: string;
  toolName: string;
  args: unknown;
}

export type ClawPilotToolDecision =
  | { action: "allow" }
  | { action: "deny"; reason: string };

export interface ClawPilotPluginHooks {
  "tool.beforeCall"?: (
    ctx: ClawPilotToolContext
  ) => Promise<ClawPilotToolDecision>;
}

export type ClawPilotPlugin = () => ClawPilotPluginHooks;
