/**
 * Beginner note:
 * This file shows WHERE to plug the governed middleware into your chosen host SDK.
 * Replace TODOs with real imports and SDK-specific wiring from:
 * - https://github.com/microsoft/agent-framework
 * - https://github.com/microsoft/agents
 */

export async function runWithAgentFramework({ middleware }) {
  // TODO: Replace with your real Agent Framework turn/context objects.
  const context = {
    turnId: "replace-with-runtime-turn-id",
    userId: "replace-with-user-object-id",
    inputText: "Hello from Agent Framework host"
  };

  // TODO: Replace with your real model/agent invoke function.
  const next = async () => ({
    outputText: "Agent Framework model output placeholder"
  });

  return middleware(context, next);
}

export async function runWithM365AgentsSdk({ middleware }) {
  // TODO: Replace with your real Microsoft 365 Agents SDK activity handler.
  // Typical flow:
  // 1) Read user + message from incoming activity
  // 2) Build context with turnId/userId/inputText
  // 3) Execute middleware(context, next)
  // 4) Send result back to Teams/Copilot/Webchat channel
  const context = {
    turnId: "replace-with-activity-id",
    userId: "replace-with-entra-object-id",
    inputText: "Hello from Microsoft 365 Agents SDK host"
  };

  // TODO: Replace with your AI invocation (OpenAI/Azure OpenAI/other).
  const next = async () => ({
    outputText: "Microsoft 365 Agents SDK model output placeholder"
  });

  return middleware(context, next);
}
