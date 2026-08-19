import { randomUUID } from "node:crypto";
import { Agent } from "@cursor/sdk";
import {
  createTelemetry,
  initializeObservability,
  shutdownObservability
} from "./agent365-observability.js";
import { loadConfig } from "./config.js";
import { EntraSidecarClient } from "./entra-sidecar.js";
import { runGovernedTurn } from "./governed-run.js";
import { PurviewClient } from "./purview-client.js";
import { createWorkspaceLease } from "./workspace-lease.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const cursorApiKey = config.cursorApiKey;
  delete process.env.CURSOR_API_KEY;

  const sidecar = new EntraSidecarClient(config.sidecarUrl, config.agentClientId);
  initializeObservability(config, sidecar);

  const correlationId = randomUUID();
  const policy = new PurviewClient(config, sidecar);
  const telemetry = createTelemetry(config, config.cursorPrompt, correlationId);

  const workspace = await createWorkspaceLease(
    config.cursorWorkspace,
    config.cursorIsolateWorkspace
  );
  const signalExitCode = { SIGINT: 130, SIGTERM: 143 } as const;
  const signalHandlers = Object.entries(signalExitCode).map(([signal, exitCode]) => {
    const handler = (): void => {
      void workspace
        .dispose()
        .then(shutdownObservability)
        .finally(() => process.exit(exitCode));
    };
    process.once(signal as NodeJS.Signals, handler);
    return [signal as NodeJS.Signals, handler] as const;
  });
  try {
    await using agent = await Agent.create({
      apiKey: cursorApiKey,
      model: { id: config.cursorModel },
      local: {
        cwd: workspace.path,
        sandboxOptions: { enabled: true }
      }
    });

    const result = await runGovernedTurn({
      prompt: config.cursorPrompt,
      correlationId,
      blockOnError: config.purviewBlockOnError,
      policy,
      telemetry,
      invokeModel: async () => {
        const run = await agent.send(config.cursorPrompt);
        const cursorResult = await run.wait();
        if (cursorResult.status !== "finished" || !cursorResult.result) {
          throw new Error(
            cursorResult.error?.message || `Cursor run ended with ${cursorResult.status}.`
          );
        }
        return {
          text: cursorResult.result,
          inputTokens: cursorResult.usage?.inputTokens,
          outputTokens: cursorResult.usage?.outputTokens
        };
      }
    });

    if (result.status === "blocked-input") {
      console.error("Blocked: Microsoft Purview did not allow the prompt.");
      process.exitCode = 2;
    } else if (result.status === "blocked-output") {
      console.error("Blocked: Microsoft Purview did not allow the generated response.");
      process.exitCode = 3;
    } else {
      console.log(result.text);
    }
  } finally {
    for (const [signal, handler] of signalHandlers) {
      process.removeListener(signal, handler);
    }
    await workspace.dispose();
  }
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await shutdownObservability();
}
